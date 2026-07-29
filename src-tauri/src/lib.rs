use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    webview::PageLoadEvent,
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder,
};
use tokio::process::Command;

const INJECT_SCRIPT: &str = include_str!("../../inject.js");
const WEBVIEW2_LOADER: &[u8] = include_bytes!("../WebView2Loader.dll");

const AD_DOMAINS: &[&str] = &[
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    "pagead2.googlesyndication.com", "tpc.googlesyndication.com",
    "adservice.google.com", "2mdn.net", "google-analytics.com",
    "googletagmanager.com", "googletagservices.com",
];

fn ensure_webview2_loader() {
    let exe = std::env::current_exe().ok();
    let dir = exe.and_then(|p| p.parent().map(|d| d.to_path_buf())).unwrap_or_else(|| PathBuf::from("."));
    let dll = dir.join("WebView2Loader.dll");
    if !dll.exists() {
        let _ = std::fs::write(&dll, WEBVIEW2_LOADER);
    }
}

struct AppState {
    audio_only: Mutex<bool>,
    ad_block_enabled: Mutex<bool>,
    background_playback: Mutex<bool>,
    pip_open: Mutex<bool>,
}

#[derive(Serialize, Deserialize, Clone)]
struct TrackInfo {
    title: String,
    artist: String,
    album: String,
    cover_url: String,
    duration: String,
}

#[tauri::command]
async fn toggle_audio_only(state: State<'_, AppState>) -> Result<bool, String> {
    let mut audio_only = state.audio_only.lock().map_err(|e| e.to_string())?;
    *audio_only = !*audio_only;
    Ok(*audio_only)
}

#[tauri::command]
async fn get_audio_only(state: State<'_, AppState>) -> Result<bool, String> {
    let audio_only = state.audio_only.lock().map_err(|e| e.to_string())?;
    Ok(*audio_only)
}

#[tauri::command]
async fn toggle_ad_block(state: State<'_, AppState>) -> Result<bool, String> {
    let mut ad_block = state.ad_block_enabled.lock().map_err(|e| e.to_string())?;
    *ad_block = !*ad_block;
    Ok(*ad_block)
}

#[tauri::command]
async fn get_ad_block(state: State<'_, AppState>) -> Result<bool, String> {
    let ad_block = state.ad_block_enabled.lock().map_err(|e| e.to_string())?;
    Ok(*ad_block)
}

#[tauri::command]
async fn toggle_background_playback(state: State<'_, AppState>) -> Result<bool, String> {
    let mut bp = state.background_playback.lock().map_err(|e| e.to_string())?;
    *bp = !*bp;
    Ok(*bp)
}

#[tauri::command]
async fn get_background_playback(state: State<'_, AppState>) -> Result<bool, String> {
    let bp = state.background_playback.lock().map_err(|e| e.to_string())?;
    Ok(*bp)
}

#[tauri::command]
async fn toggle_pip(app: AppHandle, url: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut pip_open = state.pip_open.lock().map_err(|e| e.to_string())?;

    if *pip_open {
        if let Some(pip) = app.get_webview_window("pip") {
            pip.close().map_err(|e| e.to_string())?;
        }
        *pip_open = false;
        if let Some(main) = app.get_webview_window("main") {
            main.show().map_err(|e| e.to_string())?;
            main.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    if let Some(main) = app.get_webview_window("main") {
        main.hide().map_err(|e| e.to_string())?;
    }

    let pip_url = if url.is_empty() {
        "https://www.youtube.com"
    } else {
        &url
    };

    let script = INJECT_SCRIPT.to_string();
    let pip_script = script.clone();

    let _pip = WebviewWindowBuilder::new(
        &app,
        "pip",
        WebviewUrl::External(url::Url::parse(&pip_url).map_err(|e| e.to_string())?),
    )
        .title("YouTube PiP")
        .inner_size(420.0, 260.0)
        .min_inner_size(320.0, 200.0)
        .resizable(true)
        .decorations(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        .on_page_load(move |wv, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let _ = wv.eval(&pip_script);
            }
        })
        .build()
        .map_err(|e| e.to_string())?;

    *pip_open = true;
    Ok(())
}

#[tauri::command]
async fn download_track(url: String, output_dir: String) -> Result<String, String> {
    let output = Command::new("yt-dlp")
        .args(["-x", "--audio-format", "mp3", "--audio-quality", "0",
            "--embed-thumbnail", "--embed-metadata",
            "-o", &format!("{}/%(title)s.%(ext)s", output_dir), &url])
        .output().await
        .map_err(|e| format!("yt-dlp: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn set_media_info(app: AppHandle, track: TrackInfo) -> Result<(), String> {
    app.emit("media-info-changed", track).map_err(|e| e.to_string())?;
    Ok(())
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let pip = MenuItem::with_id(app, "pip", "Picture-in-Picture", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

    let menu = Menu::with_items(app, &[&show, &hide, &pip, &separator, &quit])?;
    let img = tauri::image::Image::new(include_bytes!("../icons/icon.rgba"), 32, 32);

    let _tray = TrayIconBuilder::new()
        .icon(img).menu(&menu).tooltip("YouTube")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); }
            }
            "hide" => {
                if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); }
            }
            "pip" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.eval("document.querySelector('video') && document.dispatchEvent(new CustomEvent('toggle-pip', {detail: {url: window.location.href}}))");
                }
            }
            "quit" => { app.exit(0); }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_webview2_loader();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState {
            audio_only: Mutex::new(false),
            ad_block_enabled: Mutex::new(true),
            background_playback: Mutex::new(true),
            pip_open: Mutex::new(false),
        })
        .invoke_handler(tauri::generate_handler![
            toggle_audio_only, get_audio_only,
            toggle_ad_block, get_ad_block,
            toggle_background_playback, get_background_playback,
            download_track, set_media_info,
            toggle_pip,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            let script = INJECT_SCRIPT.to_string();

            let window = WebviewWindowBuilder::new(
                app, "main",
                WebviewUrl::External("https://www.youtube.com".parse().unwrap()),
            )
                .title("YouTube")
                .inner_size(1280.0, 800.0)
                .min_inner_size(900.0, 600.0)
                .center()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .on_navigation(|url| {
                    !AD_DOMAINS.iter().any(|d| url.as_str().contains(d))
                })
                .on_page_load(move |wv, payload| {
                    if payload.event() == PageLoadEvent::Finished {
                        let _ = wv.eval(&script);
                    }
                })
                .build()?;
            let w = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = w.hide();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
