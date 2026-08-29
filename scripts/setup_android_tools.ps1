$ErrorActionPreference = "Stop"

$javaDir = "$env:LOCALAPPDATA\Java"
$sdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$tempDir = "$env:TEMP\android_setup"

New-Item -ItemType Directory -Path $javaDir -Force | Out-Null
New-Item -ItemType Directory -Path $sdkDir -Force | Out-Null
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# 1. Download & Extract JDK 21
$jdkZip = "$tempDir\jdk21.zip"
$jdkExtract = "$tempDir\jdk_extract"
if (-not (Test-Path "$javaDir\jdk-21\bin\java.exe")) {
    Write-Host "=== Downloading Microsoft OpenJDK 21 via curl ==="
    curl.exe -L "https://aka.ms/download-jdk/microsoft-jdk-21.0.6-windows-x64.zip" -o $jdkZip
    
    Write-Host "=== Extracting OpenJDK 21 ==="
    if (Test-Path $jdkExtract) { Remove-Item -Recurse -Force $jdkExtract }
    Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force
    
    $innerDir = Get-ChildItem -Path $jdkExtract -Directory | Select-Object -First 1
    if (Test-Path "$javaDir\jdk-21") { Remove-Item -Recurse -Force "$javaDir\jdk-21" }
    Move-Item -Path $innerDir.FullName -Destination "$javaDir\jdk-21" -Force
    Remove-Item -Force $jdkZip
    Remove-Item -Recurse -Force $jdkExtract
}

$javaHome = "$javaDir\jdk-21"
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;" + $env:PATH
Write-Host "Java 21 ready at: $javaHome"
& "$javaHome\bin\java.exe" -version

# 2. Download & Extract Android Command Line Tools
$cmdLineLatest = "$sdkDir\cmdline-tools\latest"
$cmdlineZip = "$tempDir\cmdline-tools.zip"
$cmdlineExtract = "$tempDir\cmdline_extract"
if (-not (Test-Path "$cmdLineLatest\bin\sdkmanager.bat")) {
    Write-Host "=== Downloading Android Command Line Tools ==="
    curl.exe -L "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -o $cmdlineZip
    
    Write-Host "=== Extracting Android Command Line Tools ==="
    if (Test-Path $cmdlineExtract) { Remove-Item -Recurse -Force $cmdlineExtract }
    Expand-Archive -Path $cmdlineZip -DestinationPath $cmdlineExtract -Force
    
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null
    if (Test-Path $cmdLineLatest) { Remove-Item -Recurse -Force $cmdLineLatest }
    Move-Item -Path "$cmdlineExtract\cmdline-tools" -Destination $cmdLineLatest -Force
    Remove-Item -Force $cmdlineZip
    Remove-Item -Recurse -Force $cmdlineExtract
}

$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$cmdLineLatest\bin;$sdkDir\platform-tools;" + $env:PATH
Write-Host "Android Command Line Tools ready at: $cmdLineLatest"

# 3. Accept Licenses & Install Required SDK packages (Platform 34, Build Tools 34.0.0, Platform Tools)
Write-Host "=== Accepting Android SDK Licenses ==="
$licensesDir = "$sdkDir\licenses"
New-Item -ItemType Directory -Path $licensesDir -Force | Out-Null
# Write standard license hashes
Set-Content -Path "$licensesDir\android-sdk-license" -Value "24333f8a63b6825ea9c5514f83c2829b004d1fee`nd56f5187479451eabf01fb78af6dfcb131a6481e`n84831b9409646a918e30573bab4c9c91346d8abd" -NoNewline
Set-Content -Path "$licensesDir\android-sdk-preview-license" -Value "84831b9409646a918e30573bab4c9c91346d8abd" -NoNewline

Write-Host "=== Installing Android Platforms 34 and Build Tools ==="
$sdkManager = "$cmdLineLatest\bin\sdkmanager.bat"
& $sdkManager --sdk_root=$sdkDir "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 4. Save User Environment Variables
[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkDir, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkDir, "User")

Write-Host "=== Android SDK & JDK 21 Installation Complete ==="
