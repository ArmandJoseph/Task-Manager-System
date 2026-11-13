using System.Data;
using Microsoft.Data.SqlClient;

namespace TaskManager.Api;

public sealed class TaskRepository(string connectionString)
{
    private const string SelectColumns =
        "Id, Name, Description, Priority, Deadline, Completed";

    public async Task<IReadOnlyList<TaskItem>> GetAllAsync(CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(
            $"SELECT {SelectColumns} FROM dbo.Tasks ORDER BY Id DESC",
            connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var tasks = new List<TaskItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            tasks.Add(ReadTask(reader));
        }

        return tasks;
    }

    public async Task<TaskItem> CreateAsync(
        TaskWriteRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(
            $"""
            INSERT INTO dbo.Tasks (Name, Description, Priority, Deadline)
            OUTPUT INSERTED.{SelectColumns.Replace(", ", ", INSERTED.", StringComparison.Ordinal)}
            VALUES (@Name, @Description, @Priority, @Deadline)
            """,
            connection);
        AddTaskParameters(command, request);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        await reader.ReadAsync(cancellationToken);
        return ReadTask(reader);
    }

    public async Task<TaskItem?> UpdateAsync(
        int id,
        TaskWriteRequest request,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(
            $"""
            UPDATE dbo.Tasks
            SET Name = @Name, Description = @Description, Priority = @Priority, Deadline = @Deadline
            OUTPUT INSERTED.{SelectColumns.Replace(", ", ", INSERTED.", StringComparison.Ordinal)}
            WHERE Id = @Id
            """,
            connection);
        AddTaskParameters(command, request);
        command.Parameters.Add("@Id", SqlDbType.Int).Value = id;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadTask(reader) : null;
    }

    public async Task<TaskItem?> SetCompletionAsync(
        int id,
        bool completed,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(
            $"""
            UPDATE dbo.Tasks
            SET Completed = @Completed
            OUTPUT INSERTED.{SelectColumns.Replace(", ", ", INSERTED.", StringComparison.Ordinal)}
            WHERE Id = @Id
            """,
            connection);
        command.Parameters.Add("@Completed", SqlDbType.Bit).Value = completed;
        command.Parameters.Add("@Id", SqlDbType.Int).Value = id;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadTask(reader) : null;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(
            "DELETE FROM dbo.Tasks WHERE Id = @Id",
            connection);
        command.Parameters.Add("@Id", SqlDbType.Int).Value = id;
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    private static void AddTaskParameters(SqlCommand command, TaskWriteRequest request)
    {
        command.Parameters.Add("@Name", SqlDbType.NVarChar, 120).Value = request.Name;
        command.Parameters.Add("@Description", SqlDbType.NVarChar, -1).Value = request.Description;
        command.Parameters.Add("@Priority", SqlDbType.NVarChar, 20).Value = request.Priority;
        command.Parameters.Add("@Deadline", SqlDbType.Date).Value =
            request.Deadline is null
                ? DBNull.Value
                : request.Deadline.Value.ToDateTime(TimeOnly.MinValue);
    }

    private static TaskItem ReadTask(SqlDataReader reader) =>
        new(
            reader.GetInt32(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.IsDBNull(4) ? null : DateOnly.FromDateTime(reader.GetDateTime(4)),
            reader.GetBoolean(5));
}
