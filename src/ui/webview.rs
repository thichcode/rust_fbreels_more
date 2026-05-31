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
            console.log('[FB] SCROLL NEXT triggered');
            // Strategy 1: click next reel button (down chevron)
            var btns = document.querySelectorAll(
                '[aria-label="Next"], ' +
                '[aria-label="Next reel"], ' +
                '[aria-label="Next video"], ' +
                'div[role="button"] svg[aria-label]'
            );
            for (var i = 0; i < btns.length; i++) {
                var label = btns[i].getAttribute('aria-label') || '';
                if (/next/i.test(label)) {
                    btns[i].click();
                    console.log('[FB] SCROLL NEXT bằng nút: ' + label);
                    return;
                }
            }
            // Strategy 2: find down-chevron SVG buttons on the right side
            var svgs = document.querySelectorAll('div[role="button"] svg');
            for (var i = 0; i < svgs.length; i++) {
                var svg = svgs[i];
                var rect = svg.getBoundingClientRect();
                // Button on the right side of viewport = next reel button
                if (rect.left > window.innerWidth * 0.6 && rect.top < window.innerHeight * 0.5) {
                    var parent = svg.closest('div[role="button"]') || svg.parentElement;
                    parent.click();
                    console.log('[FB] SCROLL NEXT bằng SVG button');
                    return;
                }
            }
            // Strategy 3: dispatch ArrowDown key event
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40,
                bubbles: true, cancelable: true
            }));
            console.log('[FB] SCROLL NEXT bằng keydown');
            // Strategy 4: fallback scroll
            window.scrollBy(0, window.innerHeight);
            console.log('[FB] SCROLL NEXT bằng window.scrollBy');
        })();
    "#;
    let _ = webview.evaluate_script(js);
    log::info!("Scroll triggered");
}
