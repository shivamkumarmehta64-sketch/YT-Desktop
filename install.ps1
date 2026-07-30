$repo = "shivamkumarmehta64-sketch/YT-Desktop"
$dest = "$env:APPDATA\YT Desktop"
$exe = "$dest\YT-Desktop.exe"
$url = "https://github.com/$repo/releases/latest/download/YT-Desktop-2.1.0-portable.exe"

Write-Host "YT Desktop Installer" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Downloading (70 MB)..." -ForegroundColor Gray

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Invoke-WebRequest -Uri $url -OutFile $exe -UseBasicParsing

$lnk = "$env:USERPROFILE\OneDrive\Desktop\YT Desktop.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $dest
$shortcut.Save()

Write-Host "`nDone!" -ForegroundColor Green
Write-Host "Installed to: $dest" -ForegroundColor Gray
Write-Host "Shortcut added to desktop" -ForegroundColor Gray
Write-Host "`nTips:" -ForegroundColor Cyan
Write-Host "  Ctrl+1 / Ctrl+2  = YouTube / YouTube Music"
Write-Host "  Ctrl+Q          = Quit"
Write-Host "  Ctrl+M          = Minimize"
Write-Host "  Ctrl+Shift+P    = Picture-in-Picture"
Write-Host "  Ctrl+Shift+S    = Sleep timer"
Write-Host "  Media keys      = Play/Pause/Next/Prev"
Write-Host "  Right-click tray = Show/Hide/Play/Pause/Quit"
