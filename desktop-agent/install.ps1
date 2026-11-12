# One Desk App Usage Tracker - installer (per Windows user, no admin rights needed)
#
# 1. Signs in with the employee's One Desk email + password (once).
# 2. Stores only the sign-in refresh token, encrypted with Windows DPAPI so it
#    can be read only by this Windows user on this PC. The password is not saved.
# 3. Copies the agent to %LOCALAPPDATA%\OneDeskTracker and starts it at logon.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ApiKey = 'AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w'
$Src = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dir = Join-Path $env:LOCALAPPDATA 'OneDeskTracker'
$Startup = [Environment]::GetFolderPath('Startup')
$Shortcut = Join-Path $Startup 'One Desk App Usage Tracker.lnk'

Write-Host ''
Write-Host '  One Desk - App Usage Tracker' -ForegroundColor Cyan
Write-Host '  ----------------------------'
Write-Host '  While you are CHECKED IN on One Desk (not on a break), this PC records'
Write-Host '  which app or website is in front and for how long. For example:'
Write-Host '  Photoshop 3h, After Effects 1h, YouTube 30m.'
Write-Host ''
Write-Host '  Recorded:      app / website NAME and minutes, and Idle time.'
Write-Host '  NOT recorded:  window titles, keystrokes, screenshots, files, messages.'
Write-Host '  Visible to:    you, and your managers in One Desk > App Usage.'
Write-Host ''
$ok = Read-Host '  Type Y to agree and continue'
if ($ok -notmatch '^[Yy]') { Write-Host '  Cancelled.'; exit 1 }

# Stop a running copy before replacing files.
$pidFile = Join-Path $Dir 'agent.pid'
if (Test-Path $pidFile) {
    try { Stop-Process -Id ([int](Get-Content $pidFile)) -Force -ErrorAction Stop } catch { }
}

$email = (Read-Host '  One Desk email').Trim()
$sec = Read-Host '  One Desk password' -AsSecureString
$pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))

try {
    $body = @{ email = $email; password = $pass; returnSecureToken = $true } | ConvertTo-Json
    $r = Invoke-RestMethod -Method Post -ContentType 'application/json' -Body $body `
        -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ApiKey"
} catch {
    Write-Host ''
    Write-Host '  Sign-in failed. Check the email and password (same as One Desk) and try again.' -ForegroundColor Red
    exit 1
} finally { $pass = $null }

New-Item -ItemType Directory -Force -Path $Dir | Out-Null
foreach ($f in 'agent.ps1', 'launcher.vbs', 'uninstall.ps1', 'uninstall.cmd') {
    Copy-Item (Join-Path $Src $f) (Join-Path $Dir $f) -Force
    Unblock-File (Join-Path $Dir $f) -ErrorAction SilentlyContinue
}

$enc = ConvertTo-SecureString $r.refreshToken -AsPlainText -Force | ConvertFrom-SecureString
@{ email = [string]$r.email; uid = [string]$r.localId; refreshToken = $enc; installedAt = (Get-Date).ToString('s') } |
    ConvertTo-Json | Set-Content -Path (Join-Path $Dir 'config.json') -Encoding UTF8

$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($Shortcut)
$lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$lnk.Arguments = '"' + (Join-Path $Dir 'launcher.vbs') + '"'
$lnk.WorkingDirectory = $Dir
$lnk.Description = 'One Desk App Usage Tracker'
$lnk.Save()

Start-Process -FilePath (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $Dir 'launcher.vbs') + '"')

Write-Host ''
Write-Host "  Installed for $($r.email). The tracker runs in the background and starts" -ForegroundColor Green
Write-Host '  with Windows. Usage appears in One Desk > App Usage within a minute or two.' -ForegroundColor Green
Write-Host "  To remove it later run: $Dir\uninstall.cmd"
Write-Host ''
