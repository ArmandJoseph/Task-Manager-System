const addTaskButton = document.getElementById("addTaskButton");

let priority = "High";
let isFinished = false;

let task = {
id: 1,
name: "Finish thesis draft",
description: "Complete chapters 1-3.",
importance: true,
urgency: true,
priority: "High",
status: "To-Do"
};

let tasks = [
{
id: 1,
name: "Finish thesis draft",
priority: "High",
status: "To-Do"
}
];

addTaskButton.addEventListener("click", greetUser);

function greetUser() {
  alert("Hallo!");
}