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
const taskStorageKey = "task-manager.tasks";
let tasks = [];
let editingTaskId = null;

loadTasks();

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
      saveTasks([...tasks, {
        id: nextTaskId(),
        ...taskData,
        completed: false
      }]);
    } else {
      saveTasks(tasks.map((item) => item.id === editingTaskId
        ? { ...item, ...taskData }
        : item));
    }

    addTaskDialog.close();
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
          saveTasks(tasks.filter((item) => item.id !== task.id));
        } catch (error) {
          setTaskStatus(error.message, true);
        }
      }
    } else if (button.dataset.action === "toggle-complete") {
      try {
        saveTasks(tasks.map((item) => item.id === task.id
          ? { ...item, completed: !item.completed }
          : item));
      } catch (error) {
        setTaskStatus(error.message, true);
      }
    }
  });
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(taskStorageKey);
    tasks = savedTasks === null ? [] : JSON.parse(savedTasks);
    if (!Array.isArray(tasks) || tasks.some((task) =>
      task === null ||
      typeof task !== "object" ||
      !Number.isSafeInteger(task.id) ||
      typeof task.name !== "string" ||
      typeof task.description !== "string" ||
      typeof task.priority !== "string" ||
      typeof task.completed !== "boolean"
    )) {
      throw new Error("Saved task data is invalid.");
    }

    renderTasks();
    setTaskStatus("");
  } catch (error) {
    setTaskStatus(`Could not load saved tasks: ${error.message}`, true);
  }
}

function saveTasks(updatedTasks) {
  try {
    localStorage.setItem(taskStorageKey, JSON.stringify(updatedTasks));
  } catch (error) {
    throw new Error(`Could not save tasks in this browser: ${error.message}`);
  }

  tasks = updatedTasks;
  renderTasks();
  setTaskStatus("");
}

function nextTaskId() {
  return tasks.reduce((largestId, task) => Math.max(largestId, task.id), 0) + 1;
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
