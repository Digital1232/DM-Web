# Removes the One Desk App Usage Tracker for this Windows user.
# Usage already sent to One Desk is kept; nothing more is recorded.
$Dir = Join-Path $env:LOCALAPPDATA 'OneDeskTracker'
$pidFile = Join-Path $Dir 'agent.pid'
if (Test-Path $pidFile) {
    try { Stop-Process -Id ([int](Get-Content $pidFile)) -Force -ErrorAction Stop } catch { }
}
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) 'One Desk App Usage Tracker.lnk') -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Remove-Item $Dir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'One Desk App Usage Tracker removed.'
