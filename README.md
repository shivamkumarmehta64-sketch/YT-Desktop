# YT Desktop

**YouTube + YouTube Music in one app.** All premium features free.

## Features

| Feature | Shortcut | Description |
|---------|----------|-------------|
| ✅ **Ad blocking** | — | Blocks video/banner/search ads at network + DOM level |
| ✅ **Background playback** | — | Audio keeps playing when minimized or hidden |
| ✅ **Picture-in-Picture** | Ctrl+Shift+P | Floating video window over other apps |
| ✅ **Sleep timer** | Ctrl+Shift+S | Auto-pause after N minutes |
| ✅ **Sponsor skip** | — | Auto-skips sponsored segments |
| ✅ **Close to tray** | — | App stays in system tray when closed |
| ✅ **Media keys** | Keyboard | Play/pause/next/prev via keyboard media buttons |
| ✅ **YouTube + Music tabs** | Ctrl+1 / Ctrl+2 | Switch between YouTube and YouTube Music |
| ✅ **Tray controls** | — | Right-click tray for play/pause/next/prev/quit |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+1 | YouTube |
| Ctrl+2 | YouTube Music |
| Ctrl+Shift+P | Picture-in-Picture |
| Ctrl+Shift+S | Sleep timer |
| Ctrl+Q | Quit |
| Media keys | Play/Pause / Next / Previous |

## Download

- **Windows**: [Latest Release](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases)
- **Linux**: Build from source with `npm run dist-linux`

## One-command install (Windows)

```powershell
iex "& { $(irm https://raw.githubusercontent.com/shivamkumarmehta64-sketch/YT-Desktop/main/install.ps1) }"
```

## Build from source

```bash
npm install
npm run dist         # Windows NSIS installer
npm run dist-portable  # Windows portable .exe
npm run dist-linux    # Linux AppImage
```

## RAM Usage

Single Electron process (~80-120 MB) instead of two separate apps (~160-240 MB).
