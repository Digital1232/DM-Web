$ErrorActionPreference = "Stop"
$zipUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$destZip = "$env:TEMP\cmdline-tools.zip"
$sdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$cmdLineLatest = "$sdkDir\cmdline-tools\latest"

Write-Host "Downloading Android Command Line Tools from Google..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $zipUrl -OutFile $destZip -UseBasicParsing

Write-Host "Extracting Command Line Tools..."
$extractTemp = "$env:TEMP\cmdline-temp"
if (Test-Path $extractTemp) { Remove-Item -Recurse -Force $extractTemp }
Expand-Archive -Path $destZip -DestinationPath $extractTemp -Force

if (-not (Test-Path "$sdkDir\cmdline-tools")) { 
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null
}
if (Test-Path $cmdLineLatest) { 
    Remove-Item -Recurse -Force $cmdLineLatest 
}

Move-Item -Path "$extractTemp\cmdline-tools" -Destination $cmdLineLatest -Force
Remove-Item -Force $destZip
if (Test-Path $extractTemp) { Remove-Item -Recurse -Force $extractTemp }

Write-Host "Android Command Line Tools successfully installed to: $cmdLineLatest"
