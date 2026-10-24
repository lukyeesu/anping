Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' 1. ค้นหาและปิดโปรแกรมเก่าที่ค้างอยู่ใน Port 8181 (ถ้ามี) ให้เรียบร้อยก่อน
killCmd = "cmd /c FOR /F ""tokens=5"" %a IN ('netstat -a -n -o ^| findstr :8181') DO taskkill /F /PID %a"
WshShell.Run killCmd, 0, True

' 2. หน่วงเวลาเล็กน้อย (0.5 วินาที) เพื่อให้ Windows คืนค่า Port ให้เสร็จสมบูรณ์
WScript.Sleep 500

' 3. สั่งรันโปรแกรมอ่านบัตรตัวใหม่ขึ้นมาทำงานเบื้องหลัง
WshShell.Run "cmd /c node server.js", 0, False

' 4. แจ้งเตือนผู้ใช้ด้วยป๊อปอัพว่าเปิดทำงานสำเร็จแล้ว
MsgBox "Anping Smart Card Agent started successfully on port 8181!" & vbCrLf & "Ready to read card on the clinic web app.", 64, "Anping Clinic Smart Card"
