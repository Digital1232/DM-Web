@echo off
title Push to Live - One Desk
cd /d "%~dp0"

echo ========================================================
echo             ONE DESK - PUSH TO LIVE (GITHUB)
echo ========================================================
echo.

:: Ensure Git is in PATH for this session
set "PATH=C:\Users\ADMIN\AppData\Local\Programs\Git\cmd;C:\Users\ADMIN\AppData\Local\Programs\Git\ucrt64\bin;%PATH%"

where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git was not found at C:\Users\ADMIN\AppData\Local\Programs\Git\cmd
    pause
    exit /b 1
)

echo [1/2] Checking Git status...
git status
echo.

echo [2/2] Pushing commits to origin main...
echo (If prompted, please authorize in the GitHub browser window)
echo.
git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo         SUCCESS: PUSHED TO LIVE SUCCESSFULLY!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo         [FAILED] Push could not be completed.
    echo ========================================================
)

echo.
pause
