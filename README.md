# YT Desktop

**4.6 MB** lightweight Windows apps for YouTube and YouTube Music, with all premium features — ad blocking, background playback, picture-in-picture, sleep timer, sponsor skip, close-to-tray.

## Features

- ✅ **Ad blocking** — no video/banner/search ads
- ✅ **Background playback** — audio keeps playing when minimized
- ✅ **Picture-in-Picture** — `Ctrl+Shift+P` for floating video
- ✅ **Sleep timer** — `Ctrl+Shift+S` to auto-pause after N minutes
- ✅ **Sponsor skip** — auto-skips sponsored segments
- ✅ **Close to tray** — app stays in system tray when closed
- ✅ **Media keys** — play/pause/skip via keyboard
- ✅ **Account sync** — sign in once, works in both apps

## Download

**File size:** 3.8 MB ZIP

| Download | Link |
|----------|------|
| Direct ZIP | [YT_Desktop_Package.zip](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases/latest/download/YT_Desktop_Package.zip) |
| All releases | [GitHub Releases](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases) |

## Install

### Option 1: One-command install (recommended)

Open **PowerShell** and run:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/shivamkumarmehta64-sketch/YT-Desktop/main/install.ps1) }"
```

This downloads, extracts, and adds a desktop shortcut.

### Option 2: Manual install

1. Download `YT_Desktop_Package.zip` above
2. Extract to any folder (e.g. `C:\YT Desktop`)
3. Run `YouTube.exe` or `YouTubeMusic.exe`

### Prerequisites

**None.** WebView2 Runtime comes with Windows 11 and most Windows 10 systems. If missing, it installs automatically.

## Usage

| Action | How |
|--------|-----|
| **Close to tray** | Click X — app hides to system tray |
| **Quit** | `Ctrl+Q` or right-click tray icon → Quit App |
| **PiP** | `Ctrl+Shift+P` |
| **Sleep timer** | `Ctrl+Shift+S` (enter minutes) |
| **Show window** | Right-click tray → Show Window |

## Build from source

```bash
rustup target add x86_64-pc-windows-gnu
npm install
npm run build
```

## Tech

- **Tauri v2** (Rust + WebView2) — 4.6 MB per binary
- **Ad blocking** — network + DOM level (fetch/XHR interception + CSS removal)
- **Settings** persist as `config.json` next to the exe
