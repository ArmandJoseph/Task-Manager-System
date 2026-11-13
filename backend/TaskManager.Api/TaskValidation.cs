namespace TaskManager.Api;

public static class TaskValidation
{
    private static readonly string[] Priorities = ["Important", "High", "Medium", "Low"];

    public static Dictionary<string, string[]> Validate(TaskWriteRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            errors["name"] = ["Name is required."];
        }
        else if (request.Name.Trim().Length > 120)
        {
            errors["name"] = ["Name cannot exceed 120 characters."];
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            errors["description"] = ["Description is required."];
        }

        if (request.Priority is null ||
            !Priorities.Contains(request.Priority, StringComparer.OrdinalIgnoreCase))
        {
            errors["priority"] = ["Priority must be Important, High, Medium, or Low."];
        }

        return errors;
    }

    public static TaskWriteRequest Normalize(TaskWriteRequest request) =>
        request with
        {
            Name = request.Name!.Trim(),
            Description = request.Description!.Trim(),
            Priority = Priorities.First(
                priority => string.Equals(priority, request.Priority, StringComparison.OrdinalIgnoreCase))
        };
}
