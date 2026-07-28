# YT Desktop

Lightweight Windows desktop apps for **YouTube** and **YouTube Music** with premium features — no browser needed, no extensions, 27 MB RAM each.

## Features

| Feature | YouTube | YouTube Music |
|---|---|---|
| Ad blocking | ✅ fetch/XHR/DOM | ✅ fetch/XHR/DOM |
| Background playback | ✅ | ✅ |
| Audio-only mode | ✅ | ✅ |
| Sponsor skip | ✅ | ✅ |
| Media keys | ✅ Play/Pause/Next/Prev | ✅ Play/Pause/Next/Prev |
| System tray | ✅ Minimize to tray | ✅ Minimize to tray |
| Download audio | ✅ via yt-dlp | ✅ via yt-dlp |
| RAM usage | ~27 MB | ~27 MB |

## Download

[**Download latest release**](https://github.com/shivamkumarmehta64-sketch/YT-Desktop/releases)

1. Download `YT_Desktop_Package.zip`
2. Extract anywhere
3. Run `YouTube.exe` or `YouTubeMusic.exe`

**Requirements:** Windows 10 or 11 (WebView2 Runtime included).

## Project Structure

```
yt-desktop/       — YouTube app source (Tauri v2 + Rust)
ytm-desktop/      — YouTube Music app source (Tauri v2 + Rust)
```

### Build from source

```bash
cd yt-desktop
npm install
npx tauri build
```

## License

MIT
