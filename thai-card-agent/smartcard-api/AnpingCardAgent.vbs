Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' รัน PowerShell ในโหมดซ่อนหน้าต่าง 100% ไม่กวนใจผู้ใช้
cmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & scriptDir & "\tray_agent.ps1"""
WshShell.Run cmd, 0, False
