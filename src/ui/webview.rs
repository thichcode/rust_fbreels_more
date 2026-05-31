use anyhow::Result;
use tao::window::Window;
use wry::{WebView, WebViewBuilder, WebViewBuilderExtWindows};

use crate::app::AppConfig;
use crate::ui::keyboard_sim;

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
    if let Ok(data) = serde_json::from_str::<serde_json::Value>(message) {
        if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
            match msg_type {
                "scroll_next" => {
                    log::info!("IPC: scroll_next received, sending ArrowDown via winapi");
                    std::thread::spawn(|| {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        keyboard_sim::send_arrow_down();
                    });
                }
                "video_ended" => {
                    log::info!("IPC: video_ended, sending ArrowDown");
                    std::thread::spawn(|| {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        keyboard_sim::send_arrow_down();
                    });
                }
                _ => {
                    log::debug!("IPC: {}", msg_type);
                }
            }
        }
    }
}
