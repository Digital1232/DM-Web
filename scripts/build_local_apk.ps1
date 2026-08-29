$ErrorActionPreference = "Stop"

Write-Host "=== Setting up Environment for Android Build ==="
$env:JAVA_HOME = "$env:LOCALAPPDATA\Java\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;" + $env:PATH

Write-Host "Java Version:"
& "$env:JAVA_HOME\bin\java.exe" -version

# Step 1: Prepare www directory
Write-Host "`n=== Preparing www directory ==="
if (-not (Test-Path "www")) { New-Item -ItemType Directory -Path "www" -Force | Out-Null }
$excludeItems = @("node_modules", ".git", "android", ".github", "www", "scratch", ".vscode", ".claude", ".agents", "uploads", "_archive")
Get-ChildItem -Path . -Exclude $excludeItems | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination "www" -Recurse -Force
}
Write-Host "Web assets copied to www folder."

# Step 2: Initialize / Add Android platform if missing
if (-not (Test-Path "android")) {
    Write-Host "`n=== Adding Android Platform via Capacitor ==="
    npx cap add android
}

# Step 3: Configure android/local.properties
Write-Host "`n=== Configuring android/local.properties ==="
$escapedSdk = $env:ANDROID_HOME.Replace("\", "\\")
Set-Content -Path "android\local.properties" -Value "sdk.dir=$escapedSdk" -Force

# Step 4: Sync Capacitor Assets
Write-Host "`n=== Syncing Capacitor Android Assets ==="
npx cap sync android

# Step 5: Build Debug APK with Gradle
Write-Host "`n=== Building Android APK with Gradle ==="
Set-Location -Path "android"
& ".\gradlew.bat" assembleDebug --no-daemon

# Step 6: Locate and output APK
Set-Location -Path ".."
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Copy-Item -Path $apkPath -Destination "OneDesk-debug.apk" -Force
    $size = (Get-Item "OneDesk-debug.apk").Length / 1MB
    Write-Host "`n======================================================="
    Write-Host " BUILD SUCCESSFUL!"
    Write-Host " APK Location: $(Resolve-Path 'OneDesk-debug.apk')"
    Write-Host " Size: $([math]::Round($size, 2)) MB"
    Write-Host "======================================================="
} else {
    Write-Error "APK file was not found at $apkPath"
}
