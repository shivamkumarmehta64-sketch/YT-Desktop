# mtube — YouTube Music Desktop for Windows

A lightweight, ad-free, high-performance desktop client for YouTube Music built with C# (.NET Framework 4.8) and Microsoft WebView2. Designed to give a native desktop feel with minimum system resource consumption.

![YouTube Music Icon](icon.png)

---

## ✨ Features

- 🛑 **3-Layer Ad Blocking**:
  - **Network Domain Blocking**: Filters out known ad and tracking domains (`doubleclick.net`, `googlesyndication.com`, `googleadservices.com`, etc.).
  - **API Payload Stripping**: Intercepts and strips ad placements (`adPlacements`, `playerAds`, `prerolls`, `masthead`) directly from JSON payloads.
  - **DOM Hiding & Muting**: Silently mutes video playback and fast-forwards through any residual ad video segments (16x speed) while skipping automatically.

- ⏩ **SponsorBlock Integration**:
  - Automatically queries the SponsorBlock API (`sponsor.ajay.app`) and seamlessly skips sponsored segments, intros, outros, and non-music content in real time.

- ⚡ **Resource & Memory Optimization**:
  - **Chromium Launch Flags**: Capped disk cache (32MB), media cache (32MB), single renderer process, and restricted JS heap (128MB).
  - **Tray Suspension**: Automatically suspends the WebView2 process when minimized to system tray, releasing unused RAM.
  - **Automatic GC Trimming**: Runs periodic LOH compaction and garbage collection every 60 seconds. Average RAM: ~120–160 MB active, ~60–80 MB minimized.

- 🎵 **Native Desktop Controls**:
  - **Global Media Keys**: Hardware Play/Pause, Next Track, and Previous Track hotkeys work anywhere in Windows.
  - **System Tray Integration**: Quietly minimizes to system tray on close; left double-click restores silently without annoying notifications or popups.
  - **Audio-Only Mode**: Toggle off video rendering from the tray menu for maximum CPU/GPU savings while listening.
  - **Sleep Timer**: Schedule playback to stop after 15, 30, 60, or 90 minutes.

---

## 🛠️ Requirements & Building

- **OS**: Windows 10 / Windows 11 (64-bit)
- **Runtime**: [.NET Framework 4.8](https://dotnet.microsoft.com/download/dotnet-framework/net48) (pre-installed on Windows 10/11) + [Microsoft WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- **Compiler**: Standard `csc.exe` shipped with Windows (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`)

### Compilation

```cmd
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /reference:Microsoft.Web.WebView2.Core.dll /reference:Microsoft.Web.WebView2.WinForms.dll /out:mtube.exe mtube.cs
```

---

## 📁 Repository Structure

| File | Description |
|---|---|
| `mtube.cs` | Main C# WinForms application logic, WebView2 integration, ad blocking, SponsorBlock, hotkeys, and tray management |
| `mtube.exe` | Compiled executable binary |
| `icon.ico` | High-resolution multi-size Windows icon file (16x16 to 256x256) |
| `icon.png` | 256x256 high-res PNG icon artwork |
| `setup.bat` | Automated setup script for shortcut creation |
| `Microsoft.Web.WebView2.*.dll` | Microsoft WebView2 interop assemblies |
| `WebView2Loader.dll` | WebView2 native loader DLL |

---

## 📜 License

Created for personal desktop media playback. Distributed under the MIT License.
