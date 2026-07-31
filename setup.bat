@echo off
title mtube Setup
echo ========================================================
echo                 mtube - Setup & Build
echo ========================================================
echo.

set "CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if not exist "%CSC%" (
    echo [ERROR] .NET Framework 4.8 compiler (csc.exe) not found.
    pause
    exit /b 1
)

echo [1/2] Compiling mtube.cs...
"%CSC%" /nologo /target:winexe /reference:Microsoft.Web.WebView2.Core.dll /reference:Microsoft.Web.WebView2.WinForms.dll /out:mtube.exe mtube.cs

if errorlevel 1 (
    echo [ERROR] Compilation failed. Check error messages above.
    pause
    exit /b 1
)
echo [OK] mtube.exe compiled successfully!
echo.

echo [2/2] Creating Desktop shortcut...
powershell -NoProfile -Command "^
    $desktop = [Environment]::GetFolderPath('Desktop'); ^
    $ws = New-Object -ComObject WScript.Shell; ^
    $sc = $ws.CreateShortcut(\"$desktop\YouTube Music.lnk\"); ^
    $sc.TargetPath = '%~dp0mtube.exe'; ^
    $sc.WorkingDirectory = '%~dp0'; ^
    $sc.IconLocation = '%~dp0icon.ico,0'; ^
    $sc.Description = 'YouTube Music - Ad-free Desktop Client'; ^
    $sc.Save();"

echo [OK] Desktop shortcut updated!
echo.
echo ========================================================
echo Setup complete! Launch YouTube Music from your Desktop.
echo ========================================================
echo.
pause
