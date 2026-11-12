' Starts the One Desk App Usage Tracker with no console window.
Set sh = CreateObject("WScript.Shell")
agent = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\OneDeskTracker\agent.ps1"
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & agent & """", 0, False
