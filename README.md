# Task-Manager-System
Simple task manager

- allows user to create task and assign its name, description, priority and deadline
- the task manager has a Eisenhower matrix, it serves a logical tool to order and prioritise task based on its priority and deadline
- task are ordered in a matrix based on its priority and deadline

## Backend

The website uses a .NET 10 JSON API and Microsoft SQL Server. The API also serves the
frontend at its root URL.

1. Run `backend/TaskManager.Api/Database/schema.sql` against your SQL Server instance.
2. Set `ConnectionStrings__Default` to a SQL Server connection string. For example:
   `Server=localhost;Database=TaskManagerDb;User Id=sa;Password=<your-password>;TrustServerCertificate=True`
3. From the repository root, run:
   `dotnet run --project backend/TaskManager.Api`
4. Open the URL printed by ASP.NET Core.

The API endpoints are:

- `GET /api/tasks` — list tasks
- `POST /api/tasks` — create a task
- `PUT /api/tasks/{id}` — update a task's name, description, priority, and deadline
- `PATCH /api/tasks/{id}/completion` — set completion, with JSON body `{"completed":true}`
- `DELETE /api/tasks/{id}` — delete a task

Task requests and responses use JSON with `name`, `description`, `priority`,
`deadline` (`YYYY-MM-DD` or `null`), and `completed` fields. The completion field
is returned by the API and is changed through the completion endpoint.

## Deployment

The frontend is deployed to Vercel. The existing C# API and SQL Server database
run on Azure App Service and Azure SQL; Vercel proxies `/api/*` requests to the
API so the browser uses one origin.

### Deploy the API and database to Azure

1. Create an Azure SQL logical server and database, then run
   `backend/TaskManager.Api/Database/schema.sql` against that database.
2. Create a Linux App Service with the .NET 10 runtime. Allow the App Service's
   outbound IP addresses through the Azure SQL firewall.
3. Configure the App Service setting `ConnectionStrings__Default` with the Azure
   SQL connection string. Keep the password in Azure settings, not in source.
4. Publish and deploy the API from the repository root:

   ```sh
   dotnet publish backend/TaskManager.Api/TaskManager.Api.csproj -c Release -o backend/TaskManager.Api/publish
   cd backend/TaskManager.Api/publish
   zip -r ../TaskManager.Api.zip .
   cd ../../..
   az webapp deploy --resource-group <resource-group> --name <app-name> \
     --src-path backend/TaskManager.Api/TaskManager.Api.zip --type zip
   ```

### Deploy the frontend to Vercel

1. Import the repository into Vercel with the repository root as the project
   root and the **Other** framework preset. The root `vercel.json` builds the
   static site and routes API calls to Azure.
2. In `vercel.json`, replace `replace-with-your-app.azurewebsites.net` with the
   hostname of the deployed App Service, then push the change. Vercel will
   publish the frontend and proxy `/api/*` requests to that API.

Future Features:
- Kanban Board for viewing the status of the task
- Pomodoro Timer for taking and doing the task