import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://qayijwzjgngqwoixlknf.supabase.co";
const supabaseKey = "sb_publishable_CAlH7DjI96vjtpnEOQc3LQ_nswsYlHP";
const supabaseConfigured = !supabaseUrl.includes("YOUR_") &&
  !supabaseKey.includes("YOUR_");
const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const addTaskButton = document.getElementById("addTaskButton");
const addTaskDialog = document.getElementById("addTaskDialog");
const addTaskForm = document.getElementById("addTaskForm");
const cancelTaskButton = document.getElementById("cancelTaskButton");
const taskNameInput = document.getElementById("taskName");
const taskDescriptionInput = document.getElementById("taskDescription");
const taskPriorityInput = document.getElementById("taskPriority");
const taskDeadlineInput = document.getElementById("taskDeadline");
const dialogTitle = document.getElementById("dialogTitle");
const submitTaskButton = document.getElementById("submitTaskButton");
const taskStatus = document.getElementById("taskStatus");
const taskContainers = {
  q1: document.getElementById("taskContainerQ1"),
  q2: document.getElementById("taskContainerQ2"),
  q3: document.getElementById("taskContainerQ3"),
  q4: document.getElementById("taskContainerQ4")
};

const priorityLevels = new Set(["Important", "High"]);
let tasks = [];
let editingTaskId = null;

loadTasks().catch((error) => {
  setTaskStatus(`Could not load tasks: ${error.message}`, true);
});

addTaskButton.addEventListener("click", () => {
  dialogTitle.textContent = "Add a task";
  submitTaskButton.textContent = "Add task";
  addTaskForm.reset();
  addTaskDialog.showModal();
  taskNameInput.focus();
});

cancelTaskButton.addEventListener("click", () => {
  addTaskDialog.close();
});

addTaskDialog.addEventListener("close", () => {
  addTaskForm.reset();
  editingTaskId = null;
});

addTaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(addTaskForm);
  const taskData = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priority: String(formData.get("priority") ?? ""),
    deadline: String(formData.get("deadline") ?? "")
  };

  if (!taskData.name || !taskData.description) {
    taskNameInput.focus();
    return;
  }

  try {
    if (editingTaskId === null) {
      await insertTask(taskData);
    } else {
      await updateTask(editingTaskId, taskData);
    }

    addTaskDialog.close();
    setTaskStatus("");
  } catch (error) {
    setTaskStatus(error.message, true);
  }
});

for (const container of Object.values(taskContainers)) {
  container.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest("button[data-action]");
    const card = button?.closest(".taskCard");
    if (!button || !card) {
      return;
    }

    const task = tasks.find((item) => item.id === Number(card.dataset.taskId));
    if (!task) {
      return;
    }

    if (button.dataset.action === "edit") {
      openEditDialog(task);
    } else if (button.dataset.action === "delete") {
      if (window.confirm(`Delete "${task.name}"?`)) {
        try {
          await deleteTask(task.id);
          setTaskStatus("");
        } catch (error) {
          setTaskStatus(error.message, true);
        }
      }
    } else if (button.dataset.action === "toggle-complete") {
      try {
        await updateTask(task.id, { completed: !task.completed });
        setTaskStatus("");
      } catch (error) {
        setTaskStatus(error.message, true);
      }
    }
  });
}

async function loadTasks() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("tasks")
    .select("id, name, description, priority, deadline, completed")
    .order("id");
  if (error) {
    throw new Error(`Could not load tasks from Supabase: ${error.message}`);
  }

  tasks = data.map((task) => ({
    ...task,
    deadline: task.deadline ?? ""
  }));
  renderTasks();
  setTaskStatus("");
}

async function insertTask(taskData) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("tasks")
    .insert({ ...taskData, deadline: taskData.deadline || null })
    .select("id, name, description, priority, deadline, completed")
    .single();
  if (error) {
    throw new Error(`Could not create task in Supabase: ${error.message}`);
  }

  tasks.push({ ...data, deadline: data.deadline ?? "" });
  renderTasks();
}

async function updateTask(taskId, changes) {
  const client = getSupabaseClient();
  const updateData = { ...changes };
  if ("deadline" in updateData && !updateData.deadline) {
    updateData.deadline = null;
  }

  const { data, error } = await client
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .select("id, name, description, priority, deadline, completed")
    .single();
  if (error) {
    throw new Error(`Could not update task in Supabase: ${error.message}`);
  }

  tasks = tasks.map((task) => task.id === taskId
    ? { ...data, deadline: data.deadline ?? "" }
    : task);
  renderTasks();
}

async function deleteTask(taskId) {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from("tasks")
    .delete({ count: "exact" })
    .eq("id", taskId);
  if (error) {
    throw new Error(`Could not delete task from Supabase: ${error.message}`);
  }
  if (count !== 1) {
    throw new Error(
      "Could not delete task from Supabase: no task was deleted. Check the table's DELETE policy."
    );
  }

  tasks = tasks.filter((task) => task.id !== taskId);
  renderTasks();
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      "Set your Supabase URL and publishable key in front-end/script.js."
    );
  }

  return supabase;
}

function setTaskStatus(message, isError = false) {
  taskStatus.textContent = message;
  taskStatus.classList.toggle("isError", isError);
}

function openEditDialog(task) {
  editingTaskId = task.id;
  dialogTitle.textContent = "Edit task";
  submitTaskButton.textContent = "Save changes";
  taskNameInput.value = task.name;
  taskDescriptionInput.value = task.description;
  taskPriorityInput.value = task.priority;
  taskDeadlineInput.value = task.deadline;
  addTaskDialog.showModal();
  taskNameInput.focus();
}

function renderTasks() {
  for (const container of Object.values(taskContainers)) {
    container.replaceChildren();
  }

  for (const task of tasks) {
    const quadrant = getTaskQuadrant(task);
    taskContainers[quadrant].appendChild(createTaskElement(task));
  }
}

function getTaskQuadrant(task) {
  const isImportant = priorityLevels.has(task.priority);
  const daysUntilDeadline = task.deadline ? getDaysUntil(task.deadline) : null;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 5;

  if (isImportant) {
    return isUrgent ? "q1" : "q2";
  }

  if (task.priority === "Low") {
    return isUrgent ? "q3" : "q4";
  }

  if (isUrgent) {
    return "q1";
  }

  return task.deadline ? "q2" : "q4";
}

function getDaysUntil(deadline) {
  const [year, month, day] = deadline.split("-").map(Number);
  const deadlineDate = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayDate = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.round((deadlineDate - todayDate) / 86400000);
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = "taskCard";
  item.dataset.taskId = String(task.id);
  item.classList.toggle("isComplete", task.completed);

  const title = document.createElement("h4");
  title.textContent = task.name;
  item.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.textContent = task.description;
    item.appendChild(description);
  }

  const metadata = document.createElement("p");
  metadata.className = "taskMetadata";
  metadata.textContent = task.deadline
    ? `${task.priority} · Due ${formatDeadline(task.deadline)}`
    : `${task.priority} · No deadline`;
  item.appendChild(metadata);

  const actions = document.createElement("div");
  actions.className = "taskActions";
  actions.append(
    createTaskAction(
      task.completed ? "Mark incomplete" : "Mark complete",
      "toggle-complete",
      task.completed
    ),
    createTaskAction("Edit", "edit"),
    createTaskAction("Delete", "delete", false, "danger")
  );
  item.appendChild(actions);

  return item;
}

function createTaskAction(label, action, pressed = false, style = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `taskAction ${style}`.trim();
  button.dataset.action = action;
  button.textContent = label;

  if (action === "toggle-complete") {
    button.setAttribute("aria-pressed", String(pressed));
  }

  return button;
}

function formatDeadline(deadline) {
  const [year, month, day] = deadline.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}
