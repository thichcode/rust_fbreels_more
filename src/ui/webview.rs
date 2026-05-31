use anyhow::Result;
use tao::window::Window;
use wry::{WebView, WebViewBuilder, WebViewBuilderExtWindows};

use crate::app::AppConfig;

const AUTO_SCROLL_JS: &str = include_str!("../../js/auto_scroll.js");
const CONTROLS_JS: &str = include_str!("../../js/controls.js");

pub fn create_webview(window: &Window, config: &AppConfig) -> Result<WebView> {
    let auto_scroll_delay = config.auto_scroll.delay_ms;
    let auto_scroll_script = format!(
        "window.__FB_REELS_CONFIG__ = {{ autoScrollEnabled: {}, autoScrollDelay: {} }};",
        config.auto_scroll.enabled, auto_scroll_delay
    );

    let webview = WebViewBuilder::new()
        .with_url("https://www.facebook.com/reels/")
        .with_initialization_script(&auto_scroll_script)
        .with_initialization_script(AUTO_SCROLL_JS)
        .with_initialization_script(CONTROLS_JS)
        .with_ipc_handler(move |message: wry::http::Request<String>| {
            let body = message.body();
            handle_ipc_message(body);
        })
        .with_new_window_req_handler(|url: String, _features| {
            if url.starts_with("https://www.facebook.com") {
                wry::NewWindowResponse::Allow
            } else {
                wry::NewWindowResponse::Deny
            }
        })
        .with_default_context_menus(false)
        .with_devtools(true)
        .build(window)?;

    Ok(webview)
}

fn handle_ipc_message(message: &str) {
    log::info!("IPC message: {}", message);

    if let Ok(data) = serde_json::from_str::<serde_json::Value>(message) {
        if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
            match msg_type {
                "video_ended" => {
                    log::debug!("Video ended, auto-scroll triggered");
                }
                "video_found" => {
                    log::debug!("Video found in page");
                }
                "play_pause" => {
                    log::debug!("Play/pause toggled");
                }
                "next_reel" => {
                    log::debug!("Next reel requested");
                }
                "prev_reel" => {
                    log::debug!("Previous reel requested");
                }
                _ => {
                    log::warn!("Unknown IPC message type: {}", msg_type);
                }
            }
        }
    }
}
