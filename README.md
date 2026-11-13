# Task Manager

A browser-based task manager that organizes tasks in an Eisenhower matrix by
priority and deadline. Tasks are saved in the current browser using local
storage; they are not sent to a server and are not shared across browsers.

## Run locally

From the repository root, start a static web server:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000/front-end/](http://localhost:8000/front-end/).

Future Features:
- Kanban Board for viewing the status of the task
- Pomodoro Timer for taking and doing the task