const list = document.getElementById("taskContainer");



const addTaskButton = document.getElementById("addTaskButton");
addTaskButton.addEventListener('click', () => {

const addTask = document.createElement('li');

addTask.textContent = document.getElementById('taskInput').value;

 list.appendChild(addTask);

});

