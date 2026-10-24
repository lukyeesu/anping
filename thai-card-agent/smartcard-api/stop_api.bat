@echo off
echo Looking for Thai Smart Card API on port 8181...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :8181') DO (
    SET /A ProcessId=%%T
    GOTO KillProcess
)

:KillProcess
IF DEFINED ProcessId (
    taskkill /F /PID %ProcessId%
    echo API has been closed successfully.
) ELSE (
    echo API is not running.
)
pause