use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use tokio::time::{sleep, Duration};
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

fn app_dir() -> PathBuf {
    std::env::current_exe().ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn ensure_webview2_loader() {
    let dll = app_dir().join("WebView2Loader.dll");
    if !dll.exists() {
        let _ = std::fs::write(&dll, WEBVIEW2_LOADER);
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct Settings {
    ad_block_enabled: bool,
    audio_only: bool,
    background_playback: bool,
    mini_player: bool,
    sleep_timer_minutes: u32,
    first_run: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            ad_block_enabled: true,
            audio_only: false,
            background_playback: true,
            mini_player: false,
            sleep_timer_minutes: 0,
            first_run: true,
        }
    }
}

fn settings_path() -> PathBuf { app_dir().join("config.json") }

fn load_settings() -> Settings {
    std::fs::read_to_string(settings_path()).ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_settings(s: &Settings) {
    if let Ok(json) = serde_json::to_string_pretty(s) {
        let _ = std::fs::write(settings_path(), &json);
    }
}

struct AppState {
    settings: Mutex<Settings>,
    pip_open: Mutex<bool>,
}

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    state.settings.lock().map(|s| s.clone()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_setting(app: AppHandle, key: String, value: bool, state: State<'_, AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    match key.as_str() {
        "ad_block_enabled" => settings.ad_block_enabled = value,
        "audio_only" => settings.audio_only = value,
        "background_playback" => settings.background_playback = value,
        "mini_player" => settings.mini_player = value,
        _ => return Err(format!("unknown setting: {}", key)),
    }
    save_settings(&settings);
    let s = settings.clone();
    app.emit("settings-changed", s).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn set_sleep_timer(state: State<'_, AppState>, minutes: u32) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    settings.sleep_timer_minutes = minutes;
    save_settings(&settings);
    Ok(())
}

#[tauri::command]
async fn start_sleep_timer(app: AppHandle, minutes: u32) -> Result<(), String> {
    tokio::spawn(async move {
        sleep(Duration::from_secs(minutes as u64 * 60)).await;
        let _ = app.emit("sleep-timer-fired", ());
        if let Some(main) = app.get_webview_window("main") {
            let _ = main.eval("document.querySelector('video')?.pause()");
        }
    });
    Ok(())
}

#[tauri::command]
async fn toggle_pip(app: AppHandle, url: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut pip_open = state.pip_open.lock().map_err(|e| e.to_string())?;
    if *pip_open {
        if let Some(pip) = app.get_webview_window("pip") { pip.close().map_err(|e| e.to_string())?; }
        *pip_open = false;
        if let Some(main) = app.get_webview_window("main") { main.show().map_err(|e| e.to_string())?; main.set_focus().map_err(|e| e.to_string())?; }
        return Ok(());
    }
    if let Some(main) = app.get_webview_window("main") { main.hide().map_err(|e| e.to_string())?; }
    let pip_url = if url.is_empty() { "https://www.youtube.com" } else { &url };
    let script = INJECT_SCRIPT.to_string();
    let _pip = WebviewWindowBuilder::new(&app, "pip",
        WebviewUrl::External(url::Url::parse(pip_url).map_err(|e| e.to_string())?))
        .title("YouTube PiP").inner_size(420.0, 260.0).min_inner_size(320.0, 200.0)
        .resizable(true).decorations(true).always_on_top(true).skip_taskbar(true)
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
        .on_page_load(move |wv, payload| { if payload.event() == PageLoadEvent::Finished { let _ = wv.eval(&script); } })
        .build().map_err(|e| e.to_string())?;
    *pip_open = true;
    Ok(())
}

#[tauri::command]
async fn quit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
async fn download_track(url: String, output_dir: String) -> Result<String, String> {
    let output = Command::new("yt-dlp")
        .args(["-x", "--audio-format", "mp3", "--audio-quality", "0",
            "--embed-thumbnail", "--embed-metadata",
            "-o", &format!("{}/%(title)s.%(ext)s", output_dir), &url])
        .output().await.map_err(|e| format!("yt-dlp: {}", e))?;
    if output.status.success() { Ok(String::from_utf8_lossy(&output.stdout).to_string()) }
    else { Err(String::from_utf8_lossy(&output.stderr).to_string()) }
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
    let pip = MenuItem::with_id(app, "pip", "Picture-in-Picture", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit App", true, Some("Ctrl+Q"))?;
    let menu = Menu::with_items(app, &[&show, &hide, &pip, &separator, &quit])?;
    let img = tauri::image::Image::new(include_bytes!("../icons/icon.rgba"), 32, 32);
    let _tray = TrayIconBuilder::new().icon(img).menu(&menu).tooltip("YouTube Desktop")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => { if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.set_focus(); } }
            "hide" => { if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); } }
            "pip" => { if let Some(w) = app.get_webview_window("main") { let _ = w.eval("document.querySelector('video') && document.dispatchEvent(new CustomEvent('toggle-pip', {detail: {url: window.location.href}}))"); } }
            "quit" => { app.exit(0); }
            _ => {}
        }).build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_webview2_loader();
    let settings = load_settings();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState { settings: Mutex::new(settings), pip_open: Mutex::new(false) })
        .invoke_handler(tauri::generate_handler![
            get_settings, set_setting, set_sleep_timer,
            start_sleep_timer, toggle_pip, quit_app, download_track,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            let script = INJECT_SCRIPT.to_string();
            let window = WebviewWindowBuilder::new(app, "main",
                WebviewUrl::External("https://www.youtube.com".parse().unwrap()))
                .title("YouTube").inner_size(1280.0, 800.0).min_inner_size(900.0, 600.0)
                .center()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                .on_navigation(|url| !AD_DOMAINS.iter().any(|d| url.as_str().contains(d)))
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
