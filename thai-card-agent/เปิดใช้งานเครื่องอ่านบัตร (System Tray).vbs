Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
apiDir = scriptDir & "\smartcard-api"
WshShell.CurrentDirectory = apiDir

cmd = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & apiDir & "\tray_agent.ps1"""
WshShell.Run cmd, 0, False
