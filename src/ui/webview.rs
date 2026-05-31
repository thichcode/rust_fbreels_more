use anyhow::Result;
use std::sync::{Arc, Mutex};
use tao::window::Window;
use wry::{WebView, WebViewBuilder, WebViewBuilderExtWindows};

use crate::app::AppConfig;

const AUTO_SCROLL_JS: &str = include_str!("../../js/auto_scroll.js");
const CONTROLS_JS: &str = include_str!("../../js/controls.js");

pub fn create_webview(window: &Window, config: &AppConfig, scroll_flag: Arc<Mutex<bool>>) -> Result<WebView> {
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
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(body) {
                if let Some(t) = data.get("type").and_then(|v| v.as_str()) {
                    if t == "scroll_next" {
                        log::info!("IPC scroll_next → setting flag");
                        if let Ok(mut flag) = scroll_flag.lock() {
                            *flag = true;
                        }
                    }
                }
            }
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

pub fn scroll_next(webview: &WebView) {
    let js = r#"
        (function() {
            var containers = document.querySelectorAll('div');
            for (var i = 0; i < containers.length; i++) {
                var d = containers[i];
                var cs = getComputedStyle(d);
                if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
                    d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 200) {
                    d.scrollBy({ top: d.clientHeight, behavior: 'smooth' });
                    return 'container';
                }
            }
            window.scrollBy(0, window.innerHeight);
            return 'window';
        })();
    "#;
    let _ = webview.evaluate_script(js);
    log::info!("Scroll triggered");
}
