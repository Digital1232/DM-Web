# One Desk App Usage Tracker - background agent
#
# Samples the foreground window every few seconds and adds the time to the app
# (or website, for browsers) in use. Time is counted ONLY while the employee is
# checked in on One Desk and not on a break (worksync/active_sessions/<user>
# state = "running"). Totals are written to Firebase once a minute:
#
#   worksync/app_usage/<yyyy-MM-dd>/<userKey>/<machine>/<appKey> = { n, c, s }
#   worksync/app_usage_agents/<userKey> = heartbeat (lastSeen, currentApp, state)
#
# Only app/site names are stored - never window titles, keystrokes or screenshots.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less files as ANSI.

$ErrorActionPreference = 'Stop'
$AgentVersion = '1.0.0'

$ApiKey = 'AIzaSyAL7Z1D_Lhbu-eW9qgiP4hs25ccv_hRu3w'
$DbUrl = 'https://worksync-vilpower-default-rtdb.firebaseio.com'

$SampleSeconds = 5          # how often the foreground window is checked
$FlushSeconds = 60          # how often totals are written to Firebase
$SessionCheckSeconds = 30   # how often the check-in state is re-read
$IdleThresholdSeconds = 120 # no mouse/keyboard input for this long = Idle

$Dir = Join-Path $env:LOCALAPPDATA 'OneDeskTracker'
$ConfigPath = Join-Path $Dir 'config.json'
$StatePath = Join-Path $Dir 'state.json'
$LogPath = Join-Path $Dir 'agent.log'
$PidPath = Join-Path $Dir 'agent.pid'

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Write-Log([string]$msg) {
    try {
        if ((Test-Path $LogPath) -and ((Get-Item $LogPath).Length -gt 1MB)) {
            Move-Item $LogPath "$LogPath.old" -Force
        }
        Add-Content -Path $LogPath -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg)
    } catch { }
}

# ---------------------------------------------------------------- single instance
$mutex = New-Object System.Threading.Mutex($false, 'Local\OneDeskAppUsageTracker')
if (-not $mutex.WaitOne(0)) { exit 0 }
Set-Content -Path $PidPath -Value $PID

# ---------------------------------------------------------------- Win32
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class OneDeskWin32 {
    [StructLayout(LayoutKind.Sequential)]
    struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int n);
    public static uint IdleSeconds() {
        LASTINPUTINFO i = new LASTINPUTINFO();
        i.cbSize = (uint)Marshal.SizeOf(i);
        if (!GetLastInputInfo(ref i)) return 0;
        return ((uint)Environment.TickCount - i.dwTime) / 1000;
    }
    public static string Title(IntPtr h) {
        StringBuilder sb = new StringBuilder(512);
        GetWindowText(h, sb, 512);
        return sb.ToString();
    }
}
'@

# ---------------------------------------------------------------- classification
# Desktop apps: process name (lower case, no .exe) -> name | category
$AppMap = @{
    'afterfx' = 'After Effects|Video'; 'adobe premiere pro' = 'Premiere Pro|Video'; 'premiere pro' = 'Premiere Pro|Video'
    'adobe media encoder' = 'Media Encoder|Video'; 'resolve' = 'DaVinci Resolve|Video'; 'capcut' = 'CapCut|Video'
    'filmora' = 'Filmora|Video'; 'vegas' = 'Vegas Pro|Video'; 'audition' = 'Audition|Video'; 'blender' = 'Blender|Video'
    'photoshop' = 'Photoshop|Design'; 'illustrator' = 'Illustrator|Design'; 'indesign' = 'InDesign|Design'
    'lightroom' = 'Lightroom|Design'; 'lightroomclassic' = 'Lightroom|Design'; 'adobe xd' = 'Adobe XD|Design'
    'figma' = 'Figma|Design'; 'canva' = 'Canva|Design'; 'coreldrw' = 'CorelDRAW|Design'
    'winword' = 'Word|Office'; 'excel' = 'Excel|Office'; 'powerpnt' = 'PowerPoint|Office'; 'onenote' = 'OneNote|Office'
    'acrobat' = 'Acrobat|Office'; 'acrord32' = 'Acrobat Reader|Office'; 'notepad' = 'Notepad|Office'
    'outlook' = 'Outlook|Communication'; 'olk' = 'Outlook|Communication'; 'ms-teams' = 'Teams|Communication'; 'teams' = 'Teams|Communication'
    'whatsapp' = 'WhatsApp|Communication'; 'telegram' = 'Telegram|Communication'; 'zoom' = 'Zoom|Communication'; 'slack' = 'Slack|Communication'
    'code' = 'VS Code|Development'; 'cursor' = 'Cursor|Development'; 'windowsterminal' = 'Terminal|Development'
    'spotify' = 'Spotify|Entertainment'; 'vlc' = 'VLC Player|Entertainment'; 'netflix' = 'Netflix|Entertainment'
    'explorer' = 'File Explorer|System'; 'systemsettings' = 'Settings|System'; 'taskmgr' = 'Task Manager|System'
    'lockapp' = 'Locked|Idle'; 'logonui' = 'Locked|Idle'; 'screenclippinghost' = 'Snipping Tool|System'
}
$Browsers = @('chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi', 'iexplore', 'arc', 'comet')

# Browser tab title patterns (checked in order) -> name | category
$SiteRules = @(
    @('One Desk', 'One Desk|Work'), @('\bJira\b', 'Jira|Work'),
    @('YouTube Studio', 'YouTube Studio|Social Media'), @('YouTube', 'YouTube|Entertainment'),
    @('Meta Business|Business Suite|Ads Manager', 'Meta Business Suite|Social Media'),
    @('Instagram', 'Instagram|Social Media'), @('Facebook', 'Facebook|Social Media'),
    @('LinkedIn', 'LinkedIn|Social Media'), @('Pinterest', 'Pinterest|Social Media'),
    @('WhatsApp', 'WhatsApp|Communication'), @('Gmail|Inbox \(', 'Gmail|Communication'),
    @('Google Meet|Meet -', 'Google Meet|Communication'),
    @('(?-i)(^|\s)X(\s|$)|Twitter', 'X (Twitter)|Social Media'),
    @('ChatGPT', 'ChatGPT|AI Tools'), @('Claude', 'Claude|AI Tools'), @('Gemini', 'Gemini|AI Tools'),
    @('Perplexity', 'Perplexity|AI Tools'), @('Midjourney', 'Midjourney|AI Tools'),
    @('Canva', 'Canva|Design'), @('Figma', 'Figma|Design'), @('Behance', 'Behance|Design'),
    @('Freepik', 'Freepik|Design'), @('Envato', 'Envato|Design'), @('Pexels|Unsplash', 'Stock Photos|Design'),
    @('Google Docs', 'Google Docs|Office'), @('Google Sheets', 'Google Sheets|Office'),
    @('Google Slides', 'Google Slides|Office'), @('Google Drive|My Drive', 'Google Drive|Office'),
    @('Google Analytics|Search Console|Google Ads', 'Google Marketing Tools|Work'),
    @('Netflix', 'Netflix|Entertainment'), @('Prime Video', 'Prime Video|Entertainment'),
    @('Hotstar', 'Hotstar|Entertainment'), @('Spotify', 'Spotify|Entertainment'),
    @('Amazon\.|Flipkart|Myntra', 'Shopping|Entertainment')
)

$DescCache = @{}
function Get-AppDescription([System.Diagnostics.Process]$p) {
    $k = $p.ProcessName.ToLower()
    if ($DescCache.ContainsKey($k)) { return $DescCache[$k] }
    $d = $p.ProcessName
    try {
        $fd = $p.MainModule.FileVersionInfo.FileDescription
        if ($fd -and $fd.Trim().Length -gt 1 -and $fd.Length -lt 60) { $d = $fd.Trim() }
    } catch { }
    $DescCache[$k] = $d
    return $d
}

function Get-ForegroundApp {
    $h = [OneDeskWin32]::GetForegroundWindow()
    if ($h -eq [IntPtr]::Zero) { return @{ n = 'Desktop'; c = 'System' } }
    $procId = [uint32]0
    [void][OneDeskWin32]::GetWindowThreadProcessId($h, [ref]$procId)
    try { $p = Get-Process -Id $procId } catch { return @{ n = 'Unknown'; c = 'Other' } }
    $pn = $p.ProcessName.ToLower()

    if ($Browsers -contains $pn) {
        $title = [OneDeskWin32]::Title($h)
        foreach ($r in $SiteRules) {
            if ($title -match $r[0]) { $parts = $r[1].Split('|'); return @{ n = $parts[0]; c = $parts[1] } }
        }
        return @{ n = 'Other websites'; c = 'Browser' }
    }
    if ($AppMap.ContainsKey($pn)) { $parts = $AppMap[$pn].Split('|'); return @{ n = $parts[0]; c = $parts[1] } }
    return @{ n = (Get-AppDescription $p); c = 'Other' }
}

# Firebase keys cannot contain . # $ [ ] /
function Get-SafeKey([string]$s) { return ($s -replace '[\.#\$\[\]/\s]+', '_').Trim('_') }

# ---------------------------------------------------------------- auth
function Read-Config {
    if (-not (Test-Path $ConfigPath)) { throw "Not installed: $ConfigPath is missing. Run install.cmd." }
    return Get-Content $ConfigPath -Raw | ConvertFrom-Json
}

$cfg = Read-Config
$UserKey = $cfg.email -replace '[@\.]', '_'
$Machine = Get-SafeKey $env:COMPUTERNAME
$secure = ConvertTo-SecureString $cfg.refreshToken
$RefreshToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$IdToken = $null
$IdTokenExpires = [DateTime]::MinValue

function Get-IdToken {
    if ($script:IdToken -and (Get-Date) -lt $script:IdTokenExpires) { return $script:IdToken }
    $body = "grant_type=refresh_token&refresh_token=$([Uri]::EscapeDataString($script:RefreshToken))"
    $r = Invoke-RestMethod -Method Post -Uri "https://securetoken.googleapis.com/v1/token?key=$ApiKey" `
        -ContentType 'application/x-www-form-urlencoded' -Body $body -TimeoutSec 20
    $script:IdToken = $r.id_token
    $script:IdTokenExpires = (Get-Date).AddSeconds([int]$r.expires_in - 300)
    if ($r.refresh_token -and $r.refresh_token -ne $script:RefreshToken) { $script:RefreshToken = $r.refresh_token }
    return $script:IdToken
}

function Invoke-Db([string]$method, [string]$path, $data) {
    $uri = "$DbUrl/$path.json?auth=$(Get-IdToken)"
    if ($null -eq $data) { return Invoke-RestMethod -Method $method -Uri $uri -TimeoutSec 20 }
    $json = $data | ConvertTo-Json -Depth 6 -Compress
    return Invoke-RestMethod -Method $method -Uri $uri -TimeoutSec 20 -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes($json))
}

# ---------------------------------------------------------------- totals
# $Totals[date][appKey] = @{ n; c; s }. Written as absolute values, so they are
# kept on disk and re-seeded from Firebase on start to survive restarts.
$Totals = @{}
$Seeded = @{}

# Merge what is already in Firebase for this PC/day, keeping the larger value per app.
function Sync-Remote([string]$date) {
    try {
        $remote = Invoke-Db 'GET' "worksync/app_usage/$date/$UserKey/$Machine" $null
        $day = $Totals[$date]
        if ($remote) {
            foreach ($prop in $remote.PSObject.Properties) {
                $s = [int]$prop.Value.s
                if (-not $day.ContainsKey($prop.Name) -or $day[$prop.Name].s -lt $s) {
                    $day[$prop.Name] = @{ n = [string]$prop.Value.n; c = [string]$prop.Value.c; s = $s }
                }
            }
        }
        $Seeded[$date] = $true
    } catch { Write-Log "Could not read existing totals for ${date}: $($_.Exception.Message)" }
}

function Get-DayTotals([string]$date) {
    if (-not $Totals.ContainsKey($date)) {
        $Totals[$date] = @{}
        Sync-Remote $date
    }
    return $Totals[$date]
}

function Load-LocalState {
    if (-not (Test-Path $StatePath)) { return }
    try {
        $st = Get-Content $StatePath -Raw | ConvertFrom-Json
        $date = [string]$st.date
        if ($date -ne (Get-Date -Format 'yyyy-MM-dd')) { return }
        $day = Get-DayTotals $date
        foreach ($prop in $st.apps.PSObject.Properties) {
            $s = [int]$prop.Value.s
            if (-not $day.ContainsKey($prop.Name) -or $day[$prop.Name].s -lt $s) {
                $day[$prop.Name] = @{ n = [string]$prop.Value.n; c = [string]$prop.Value.c; s = $s }
            }
        }
    } catch { Write-Log "Ignoring unreadable state file: $($_.Exception.Message)" }
}

function Save-LocalState([string]$date) {
    try { @{ date = $date; apps = $Totals[$date] } | ConvertTo-Json -Depth 5 | Set-Content -Path $StatePath -Encoding UTF8 } catch { }
}

# ---------------------------------------------------------------- session state
$SessionRunning = $false
$SessionState = 'unknown'
$SessionCheckedAt = [DateTime]::MinValue
$SessionOkAt = [DateTime]::MinValue

function Update-Session {
    $script:SessionCheckedAt = Get-Date
    try {
        $s = Invoke-Db 'GET' "worksync/active_sessions/$UserKey" $null
        $today = Get-Date -Format 'yyyy-MM-dd'
        $state = if ($s -and $s.state) { [string]$s.state } else { 'idle' }
        if ($s -and $s.date -and [string]$s.date -ne $today) { $state = 'idle' }
        $script:SessionState = $state
        $script:SessionRunning = ($state -eq 'running')
        $script:SessionOkAt = Get-Date
    } catch {
        Write-Log "Session check failed: $($_.Exception.Message)"
        # Offline for more than 5 minutes: stop counting rather than guess.
        if (((Get-Date) - $script:SessionOkAt).TotalMinutes -gt 5) { $script:SessionRunning = $false; $script:SessionState = 'offline' }
    }
}

# ---------------------------------------------------------------- main loop
Write-Log "Agent $AgentVersion started for $($cfg.email) on $Machine (pid $PID)"
Load-LocalState
$CurrentApp = ''
$LastFlush = Get-Date
$clock = [Diagnostics.Stopwatch]::StartNew()
$lastTick = $clock.Elapsed.TotalSeconds

while ($true) {
    Start-Sleep -Seconds $SampleSeconds
    try {
        $nowSec = $clock.Elapsed.TotalSeconds
        $delta = $nowSec - $lastTick
        $lastTick = $nowSec
        # A long gap means the PC was asleep: don't count it.
        if ($delta -gt ($SampleSeconds * 3)) { $delta = 0 }

        if (((Get-Date) - $SessionCheckedAt).TotalSeconds -ge $SessionCheckSeconds) { Update-Session }

        if ($SessionRunning -and $delta -gt 0) {
            $app = if ([OneDeskWin32]::IdleSeconds() -ge $IdleThresholdSeconds) { @{ n = 'Idle'; c = 'Idle' } } else { Get-ForegroundApp }
            if ($app.c -eq 'Idle') { $app = @{ n = 'Idle'; c = 'Idle' } }
            $CurrentApp = $app.n
            $day = Get-DayTotals (Get-Date -Format 'yyyy-MM-dd')
            $key = Get-SafeKey $app.n
            if (-not $key) { $key = 'Unknown' }
            if (-not $day.ContainsKey($key)) { $day[$key] = @{ n = $app.n; c = $app.c; s = 0 } }
            $day[$key].s = [int]($day[$key].s + $delta)
        } elseif (-not $SessionRunning) {
            $CurrentApp = ''
        }

        if (((Get-Date) - $LastFlush).TotalSeconds -ge $FlushSeconds) {
            $LastFlush = Get-Date
            $today = Get-Date -Format 'yyyy-MM-dd'
            foreach ($date in @($Totals.Keys)) {
                # Never write before the existing totals were read, or a restart while
                # offline would overwrite the day with smaller numbers.
                if (-not $Seeded[$date]) { Sync-Remote $date }
                if ($Seeded[$date] -and $Totals[$date].Count -gt 0) {
                    Invoke-Db 'PATCH' "worksync/app_usage/$date/$UserKey/$Machine" $Totals[$date] | Out-Null
                }
                if ($date -ne $today -and $Seeded[$date]) { [void]$Totals.Remove($date); [void]$Seeded.Remove($date) }
            }
            if ($Totals.ContainsKey($today)) { Save-LocalState $today }
            Invoke-Db 'PUT' "worksync/app_usage_agents/$UserKey" ([ordered]@{
                    email = $cfg.email; machine = $Machine; version = $AgentVersion
                    lastSeen = [long]([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())
                    state = $SessionState; currentApp = $CurrentApp
                }) | Out-Null
        }
    } catch {
        Write-Log "Loop error: $($_.Exception.Message)"
        if ($_.Exception.Message -match '401|INVALID_REFRESH_TOKEN|TOKEN_EXPIRED|USER_DISABLED') {
            $IdToken = $null
            Write-Log 'Sign-in expired or revoked. Re-run install.cmd to sign in again.'
            Start-Sleep -Seconds 600
        }
    }
}
