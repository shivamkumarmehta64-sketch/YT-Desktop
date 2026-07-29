# YT Desktop

## Structure

Monorepo with two standalone Tauri v2 apps:

- `/` → **YouTube** app (`yt-desktop` Cargo package)
- `ytm-desktop/` → **YouTube Music** app (`ytm-desktop` Cargo package)

Both share identical architecture — same `lib.rs` pattern, same `inject.js` pattern, same `Cargo.toml` deps. Only the target URL and product name differ.

Entrypoints:
- `src-tauri/src/main.rs` → calls `yt_desktop_lib::run()`
- `src-tauri/src/lib.rs` → all Rust logic (window creation, tray, Tauri commands, settings)
- `inject.js` → compiled into binary via `include_str!("../../inject.js")`, injected on every page load

## Build

**Required toolchain:** LLVM MinGW (UCRT) for `x86_64-pc-windows-gnu` target.

```powershell
$pkg = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64"
$env:Path = "$env:USERPROFILE\.cargo\bin;$pkg\bin;$pkg\x86_64-w64-mingw32\bin;$env:Path"
$env:CC_x86_64_pc_windows_gnu = "$pkg\bin\x86_64-w64-mingw32-gcc.exe"
$env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = "$pkg\bin\x86_64-w64-mingw32-gcc.exe"
$env:AR_x86_64_pc_windows_gnu = "$pkg\bin\llvm-ar.exe"
$env:CARGO_TARGET_DIR = "C:\tmp\build-yt"   # REQUIRED — short path to avoid MAX_PATH error
cd src-tauri
cargo build --release
```

Set `CARGO_TARGET_DIR = "C:\tmp\build-ytm"` for the YTM app (`cd ../ytm-desktop/src-tauri`).

**Debug builds fail** (65,535 DLL export limit). Always use `--release`.

**npm** (`@tauri-apps/cli`) is also available at root for `npm run build`.

## Tauri v2 quirks (common trip-ups)

- `WebviewWindowBuilder::new()` does NOT have `.on_window_event()` — call it on the built window:
  ```rust
  let window = WebviewWindowBuilder::new(...)....build()?;
  let w = window.clone();
  window.on_window_event(move |event| { ... });
  ```
- The closure for `on_window_event` takes **1 argument** (`WindowEvent`), not `(&Window, WindowEvent)`.
- Use `url::Url::parse(&s)` instead of `s.parse()` — the latter can't infer the error type.
- `WebviewUrl::External()` requires a `url::Url`, not a `&str`.
- Window names are hardcoded strings: `"main"` and `"pip"` — used everywhere via `get_webview_window()`.

## Architecture

- **No frontend dev server.** Both apps load live YouTube URLs directly into WebView2.
- **Windows created programmatically** in Rust (not in `tauri.conf.json`'s `windows[]` array).
- **Close-to-tray:** `CloseRequested` → `api.prevent_close()` + `window.hide()`
- **Settings persisted** as `config.json` next to the exe. Rust struct `Settings` with `save_settings`/`load_settings`.
- **Ad blocking** is two-layer: Rust-side `on_navigation` (blocks known ad domains), JS-side `inject.js` (fetch/XHR interception + DOM removal).
- **User agent spoofed** to `Chrome/126.0.0.0` — without this, YouTube shows "unsupported browser" banner.
- **WebView2Loader.dll** embedded via `include_bytes!` and extracted at runtime.

## Key Tauri commands (all in `lib.rs`)

| Command | Purpose |
|---------|---------|
| `get_settings` | Load persisted settings |
| `set_setting` | Toggle a single bool setting |
| `update_settings` | Replace entire settings object |
| `toggle_audio_only` | `video{display:none}` via CSS |
| `toggle_ad_block` | Enable/disable fetch/DOM ad removal |
| `toggle_background_playback` | Allow audio when minimized |
| `toggle_pip` | Open/close always-on-top PiP window |
| `start_sleep_timer` | Spawn tokio timer, pause video after N min |
| `set_sleep_timer` | Persist timer setting |
| `download_track` | yt-dlp wrapper: extract audio to MP3 |
| `set_media_info` | Emit track metadata to UI |

All commands must be listed in `generate_handler![]` and registered via `.invoke_handler()`.

## Hotkeys (inject.js)

| Keys | Action |
|------|--------|
| Ctrl+Shift+P | Toggle Picture-in-Picture |
| Ctrl+Shift+M | Toggle Mini Player |
| Ctrl+Shift+S | Set sleep timer (prompt) |

## GitHub

- Repo: `shivamkumarmehta64-sketch/YT-Desktop` (public)
- Release asset: `YT_Desktop_Package.zip` — contains `YouTube.exe`, `YouTubeMusic.exe`, `WebView2Loader.dll`
- Install: `iex "& { $(irm https://raw.githubusercontent.com/...main/install.ps1) }"`
- Binaries deployed to `%APPDATA%\YT Desktop\` on the dev machine

## CSS selectors (maintenance)

YouTube ad selectors in `inject.js` may need updating if YouTube changes their DOM. Check:
- `inject.js` lines 48-54 (YT)
- `ytm-desktop/inject.js` lines 48-55 (YTM)

These are the only parts that need periodic updates. Everything else is stable.
