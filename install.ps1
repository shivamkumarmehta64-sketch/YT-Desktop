param([switch]$YoutubeMusic)

$repo = "shivamkumarmehta64-sketch/YT-Desktop"
$dest = "$env:APPDATA\YT Desktop"
$zip = "$env:TEMP\YT_Desktop_Package.zip"
$url = "https://github.com/$repo/releases/latest/download/YT_Desktop_Package.zip"

Write-Host "YouTube Desktop Installer" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Downloading (3.8 MB)..." -ForegroundColor Gray

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force
Remove-Item $zip -Force

$exe = if ($YoutubeMusic) { "YouTubeMusic.exe" } else { "YouTube.exe" }
$lnk = "$env:USERPROFILE\Desktop\" + ($exe -replace '\.exe$', '.lnk')

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = "$dest\$exe"
$shortcut.WorkingDirectory = $dest
$shortcut.Save()

Write-Host "`nDone!" -ForegroundColor Green
Write-Host "YouTube installed to: $dest" -ForegroundColor Gray
Write-Host "Shortcut added to desktop" -ForegroundColor Gray
Write-Host "`nTips:" -ForegroundColor Cyan
Write-Host "  Ctrl+Q          = Quit app"
Write-Host "  Ctrl+Shift+P    = Picture-in-Picture"
Write-Host "  Ctrl+Shift+S    = Sleep timer"
Write-Host "  Right-click tray = Show/Hide/Quit"
