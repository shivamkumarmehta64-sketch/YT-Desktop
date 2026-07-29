param([switch]$YoutubeMusic)

$repo = "shivamkumarmehta64-sketch/YT-Desktop"
$dest = "$env:APPDATA\YT Desktop"
$zip = "$env:TEMP\YT_Desktop_Package.zip"

Write-Host "Downloading YT Desktop..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "https://github.com/$repo/releases/latest/download/YT_Desktop_Package.zip" -OutFile $zip

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Expand-Archive -Path $zip -DestinationPath $dest -Force

$exe = if ($YoutubeMusic) { "YouTubeMusic.exe" } else { "YouTube.exe" }
$lnk = "$env:USERPROFILE\Desktop\" + ($exe -replace '\.exe$', '.lnk')

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($lnk)
$shortcut.TargetPath = "$dest\$exe"
$shortcut.WorkingDirectory = $dest
$shortcut.Save()

Write-Host "Installed! Shortcut added to desktop." -ForegroundColor Green
Write-Host "Launch: $dest\$exe" -ForegroundColor Gray
