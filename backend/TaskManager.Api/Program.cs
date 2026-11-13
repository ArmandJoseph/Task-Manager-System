using Microsoft.Data.SqlClient;
using TaskManager.Api;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot")
});
var connectionString = builder.Configuration.GetConnectionString("Default");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Set the ConnectionStrings__Default environment variable to connect to SQL Server.");
}

builder.Services.AddSingleton(new TaskRepository(connectionString));

var app = builder.Build();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (SqlException exception)
    {
        app.Logger.LogError(exception, "A SQL Server request failed.");
        if (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "The task database is unavailable. Check the server configuration and try again."
            });
        }
    }
});

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/tasks", async (TaskRepository repository, CancellationToken cancellationToken) =>
    Results.Ok(await repository.GetAllAsync(cancellationToken)));

app.MapPost("/api/tasks", async (
    TaskWriteRequest request,
    TaskRepository repository,
    CancellationToken cancellationToken) =>
{
    var errors = TaskValidation.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var task = await repository.CreateAsync(TaskValidation.Normalize(request), cancellationToken);
    return Results.Created($"/api/tasks/{task.Id}", task);
});

app.MapPut("/api/tasks/{id:int}", async (
    int id,
    TaskWriteRequest request,
    TaskRepository repository,
    CancellationToken cancellationToken) =>
{
    var errors = TaskValidation.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var task = await repository.UpdateAsync(id, TaskValidation.Normalize(request), cancellationToken);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapPatch("/api/tasks/{id:int}/completion", async (
    int id,
    CompletionRequest request,
    TaskRepository repository,
    CancellationToken cancellationToken) =>
{
    var task = await repository.SetCompletionAsync(id, request.Completed, cancellationToken);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapDelete("/api/tasks/{id:int}", async (
    int id,
    TaskRepository repository,
    CancellationToken cancellationToken) =>
    await repository.DeleteAsync(id, cancellationToken)
        ? Results.NoContent()
        : Results.NotFound());

app.Run();
