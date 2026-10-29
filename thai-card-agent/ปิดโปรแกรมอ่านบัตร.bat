@echo off
chcp 65001 >nul
echo กำลังค้นหาและปิดโปรแกรมอ่านบัตร Anping Card Agent...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :8181') DO (
    taskkill /F /PID %%T >nul 2>&1
)
taskkill /F /FI "WINDOWTITLE eq Anping*" >nul 2>&1
echo ปิดโปรแกรมอ่านบัตรเรียบร้อยแล้ว
timeout /t 2 >nul
