# YT Desktop

Monorepo with two standalone Tauri v2 apps:
- `/` → YouTube (`yt-desktop`)
- `ytm-desktop/` → YouTube Music (`ytm-desktop`)

Entrypoints: `src-tauri/src/main.rs` → `lib.rs` (all Rust logic). `inject.js` compiled into binary via `include_str!`.

## Build

**Toolchain:** LLVM MinGW (UCRT) + `x86_64-pc-windows-gnu` target.

```powershell
$env:CARGO_TARGET_DIR = "C:\tmp\build-yt"    # SHORT PATH — required
$env:CC_x86_64_pc_windows_gnu = "...\x86_64-w64-mingw32-gcc.exe"
$env:CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = "...\x86_64-w64-mingw32-gcc.exe"
cd src-tauri; cargo build --release
```

Always `--release`. Debug hits DLL export limit (65535). Use `CARGO_TARGET_DIR="C:\tmp\build-ytm"` for YTM.

## Optimizations (Cargo.toml)

```toml
[profile.release]
opt-level = "z"     # size-optimized
lto = true          # link-time optimization
codegen-units = 1   # max optimization
strip = "symbols"   # remove debug symbols (-80% binary size)
panic = "abort"     # no unwind tables
```

Binary: **4.6 MB** per app (from 25 MB).

## Tauri v2 quirks

- `on_window_event()` on `WebviewWindow` **after** `.build()?`, not on builder
- Closure takes 1 arg (`WindowEvent`), clone window handle before moving
- `url::Url::parse(&s)` not `s.parse()`
- Window names: `"main"` and `"pip"` (hardcoded strings)
- IPC from inject.js: `window.__TAURI_INTERNALS__.invoke(cmd, args)`

## Architecture

- No frontend server — loads youtube.com/music.youtube.com directly
- Windows created in Rust (not `tauri.conf.json`)
- Close-to-tray: `prevent_close()` + `window.hide()`
- Settings persisted as `config.json` next to exe
- User agent spoofed to Chrome 126
- WebView2Loader.dll embedded via `include_bytes!`

## Commands (registered in `generate_handler!`)

`get_settings`, `set_setting`, `set_sleep_timer`, `start_sleep_timer`, `toggle_pip`, `quit_app`, `download_track`

## Hotkeys

| Action | Key |
|--------|-----|
| Quit | `Ctrl+Q` |
| PiP | `Ctrl+Shift+P` |
| Sleep timer | `Ctrl+Shift+S` |

## GitHub

- Repo: `shivamkumarmehta64-sketch/YT-Desktop` (public)
- Release: `YT_Desktop_Package.zip` (3.8 MB — YouTube.exe + YouTubeMusic.exe + WebView2Loader.dll)
- Install: `iex "& { $(irm ...install.ps1) }"`
- Binaries at: `%APPDATA%\YT Desktop\`

## Ad blocking maintenance

CSS selectors in `inject.js` lines 48-54 (YT) and `ytm-desktop/inject.js` lines 50-57 (YTM) need occasional updates if YouTube renames elements.
