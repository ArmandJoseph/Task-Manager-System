namespace TaskManager.Api;

public sealed record TaskItem(
    int Id,
    string Name,
    string Description,
    string Priority,
    DateOnly? Deadline,
    bool Completed);

public sealed record TaskWriteRequest(
    string? Name,
    string? Description,
    string? Priority,
    DateOnly? Deadline);

public sealed record CompletionRequest(bool Completed);
