# YT Desktop

Lightweight Windows desktop apps for YouTube and YouTube Music with premium features.

## Features

- **Ad blocking** — network-level + DOM removal, no ads
- **Background playback** — audio continues when window is minimized
- **Picture-in-Picture** — Ctrl+Shift+P or tray menu
- **Sponsor skip** — auto-skips sponsored segments
- **Audio-only mode** — hide video to save bandwidth
- **Close to tray** — app stays running in system tray
- **Media keys** — play/pause/skip via keyboard
- **Download music** — built-in yt-dlp integration

## Install

Open PowerShell and run:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/shivamkumarmehta64-sketch/YT-Desktop/main/install.ps1) }"
```

Or download the latest `YT_Desktop_Package.zip` from [Releases](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases) and extract to any folder.

**Prerequisites:** [WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703) (included in Win 11, most Win 10)

## Usage

| Action | Shortcut |
|--------|----------|
| Picture-in-Picture | `Ctrl+Shift+P` |
| Show window | Tray menu → Show |
| Quit | Tray menu → Quit |

## Build from source

```bash
rustup target add x86_64-pc-windows-gnu
cargo install tauri-cli --version "^2"
cargo tauri build --bundles none
```
