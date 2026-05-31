use anyhow::Result;
use tao::event_loop::EventLoopProxy;
use tao::window::Window;
use wry::{WebView, WebViewBuilder, WebViewBuilderExtWindows};

use crate::app::AppConfig;
use crate::UserEvent;

const AUTO_SCROLL_JS: &str = include_str!("../../js/auto_scroll.js");
const CONTROLS_JS: &str = include_str!("../../js/controls.js");

pub fn create_webview(window: &Window, config: &AppConfig, proxy: EventLoopProxy<UserEvent>) -> Result<WebView> {
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
                        log::info!("IPC scroll_next → user event");
                        proxy.send_event(UserEvent::ScrollNext).ok();
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
            // Strategy 1: common Facebook scroll containers
            var selectors = [
                'div[role="feed"]',
                'div.x1hc1fzr',
                'div.x6s0dn4',
                'div.x78zum5',
                'div.x1n2onr6',
                'div.xh8yej3'
            ];
            for (var s = 0; s < selectors.length; s++) {
                var el = document.querySelector(selectors[s]);
                if (el && el.scrollHeight > el.clientHeight + 50) {
                    el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
                    return selectors[s];
                }
            }
            // Strategy 2: find any scrollable div
            var divs = document.querySelectorAll('div');
            for (var i = 0; i < divs.length; i++) {
                var d = divs[i];
                var cs = getComputedStyle(d);
                if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') &&
                    d.scrollHeight > d.clientHeight + 50 && d.clientHeight > 300) {
                    d.scrollBy({ top: d.clientHeight, behavior: 'smooth' });
                    return 'div-scroll';
                }
            }
            // Strategy 3: try document.documentElement
            if (document.documentElement.scrollHeight > window.innerHeight) {
                window.scrollBy(0, window.innerHeight);
                return 'html';
            }
            // Strategy 4: try body
            if (document.body && document.body.scrollHeight > window.innerHeight) {
                document.body.scrollBy(0, window.innerHeight);
                return 'body';
            }
            return 'none';
        })();
    "#;
    let _ = webview.evaluate_script(js);
    log::info!("Scroll triggered");
}
