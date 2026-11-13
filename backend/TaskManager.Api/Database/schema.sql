IF DB_ID(N'TaskManagerDb') IS NULL
BEGIN
    CREATE DATABASE TaskManagerDb;
END
GO

USE TaskManagerDb;
GO

IF OBJECT_ID(N'dbo.Tasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tasks
    (
        Id          int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Tasks PRIMARY KEY,
        Name        nvarchar(120) NOT NULL,
        Description nvarchar(max) NOT NULL,
        Priority    nvarchar(20) NOT NULL,
        Deadline    date NULL,
        Completed   bit NOT NULL CONSTRAINT DF_Tasks_Completed DEFAULT (0)
    );
END
GO
