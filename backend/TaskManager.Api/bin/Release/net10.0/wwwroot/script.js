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

const importantPriorities = new Set(["Important", "High"]);
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
    const task = editingTaskId === null
      ? await apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify(taskData)
        })
      : await apiRequest(`/api/tasks/${editingTaskId}`, {
          method: "PUT",
          body: JSON.stringify(taskData)
        });

    if (editingTaskId === null) {
      tasks.push(task);
    } else {
      tasks = tasks.map((item) => item.id === task.id ? task : item);
    }

    renderTasks();
    setTaskStatus("");
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
          await apiRequest(`/api/tasks/${task.id}`, { method: "DELETE" });
          tasks = tasks.filter((item) => item.id !== task.id);
          renderTasks();
          setTaskStatus("");
        } catch (error) {
          setTaskStatus(error.message, true);
        }
      }
    } else if (button.dataset.action === "toggle-complete") {
      try {
        const updatedTask = await apiRequest(`/api/tasks/${task.id}/completion`, {
          method: "PATCH",
          body: JSON.stringify({ completed: !task.completed })
        });
        tasks = tasks.map((item) => item.id === updatedTask.id ? updatedTask : item);
        renderTasks();
        setTaskStatus("");
      } catch (error) {
        setTaskStatus(error.message, true);
      }
    }
  });
}

async function loadTasks() {
  try {
    tasks = await apiRequest("/api/tasks");
    renderTasks();
    setTaskStatus("");
  } catch (error) {
    setTaskStatus(error.message, true);
  }
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body.error ?? body.detail ?? body.title ?? message;
      if (body.errors) {
        message = Object.values(body.errors).flat().join(" ");
      }
    } catch {
      // Keep the HTTP status message when the server response is not JSON.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
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
  const isImportant = importantPriorities.has(task.priority);
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
