# YT Desktop

**YouTube + YouTube Music in one lightweight desktop app.** All premium features free. Ad blocking, background playback, PiP, sleep timer, SponsorBlock.

## Features

| Feature | Shortcut | Description |
|---------|----------|-------------|
| ✅ **Ad blocking** (3-layer) | — | Network (240+ domains) → API (key stripping) → DOM (CSS + observer) |
| ✅ **Background playback** | — | Audio keeps playing when minimized or hidden |
| ✅ **Picture-in-Picture** | Ctrl+Shift+P | Floating video window over other apps |
| ✅ **Sleep timer** | Ctrl+Shift+S | Auto-pause after N minutes |
| ✅ **Sponsor skip** | — | Auto-skips sponsored/intro/outro segments via SponsorBlock API |
| ✅ **Close to tray** | — | Minimizes to system tray instead of quitting |
| ✅ **Media keys** | Keyboard | Play/pause/next/prev via keyboard media buttons |
| ✅ **Tab switching** | Ctrl+1 / Ctrl+2 | Switch between YouTube and YouTube Music |
| ✅ **Single instance** | — | Only one app instance runs; second launch brings it to front |
| ✅ **Custom icons** | — | Dark circular icon with rainbow neon ring + play triangle |
| ✅ **Tray controls** | Right-click | Play/pause/next/prev/quit from system tray |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+1 | YouTube |
| Ctrl+2 | YouTube Music |
| Ctrl+M | Minimize window |
| Ctrl+Q | Quit app |
| Ctrl+Shift+P | Picture-in-Picture |
| Ctrl+Shift+S | Sleep timer |
| MediaPlayPause | Play / Pause |
| MediaNextTrack | Next track |
| MediaPreviousTrack | Previous track |

## Download

- **Windows (portable)**: [YT-Desktop-2.1.0-portable.exe](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases/latest)
- **Windows (installer)**: Build from source with `npm run dist`
- **Linux**: Build from source with `npm run dist-linux`

## One-command install (Windows)

```powershell
iex "& { $(irm https://raw.githubusercontent.com/shivamkumarmehta64-sketch/YT-Desktop/main/install.ps1) }"
```

## Build from source

```bash
npm install
npm run dist           # Windows NSIS installer
npm run dist-portable  # Windows portable .exe
npm run dist-linux     # Linux AppImage
```

## Ad blocking architecture

```
Layer 1 — Network (fastest)
  └─ session.defaultSession + session.fromPartition('persist:ytdesktop-adblock')
  └─ 240+ ad domains blocked (root + wildcard)
  └─ 20+ YouTube/Music ad URL patterns

Layer 2 — API response (medium)
  └─ JSON.parse proxy → strips 130+ ad keys from all youtubei/v1/ responses
  └─ fetch wrapper → intercepts all /youtubei/v1/ fetch calls
  └─ XHR hook → intercepts all /youtubei/v1/ XHR calls

Layer 3 — DOM (slowest, most thorough)
  └─ 80+ CSS selectors injected (instant hide)
  └─ MutationObserver debounced at 200ms
  └─ Periodic poll every 2 seconds (backup)
  
Each layer is independently try-catch wrapped — one failure never blocks the others.
```

## RAM Usage

Single Electron process (~80-120 MB) instead of two separate browser tabs (~160-240 MB). Background playback with audio-only further reduces memory.

## Project structure

```
YT-Desktop/
├── main.js          # Electron main process
├── preload.js       # Renderer preload (ad-block, SponsorBlock, IPC)
├── browser.html     # UI shell (titlebar, tabs, features)
├── icons/           # App and tray icons (renamed from build/)
├── install.ps1      # One-command install script
├── package.json     # Electron + electron-builder config
├── ytdesktop.cpp    # C++ WebView2 version (WIP, experimental)
└── README.md
```

## License

MIT
