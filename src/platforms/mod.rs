#[allow(dead_code)]
pub trait Platform {
    fn name(&self) -> &str;
    fn urls(&self) -> Vec<&str>;
    fn auto_scroll_js(&self) -> String;
    fn video_selector(&self) -> &str;
    fn on_video_ended(&self) -> String;
}

#[allow(dead_code)]
pub struct FacebookPlatform;

impl Platform for FacebookPlatform {
    fn name(&self) -> &str {
        "facebook"
    }

    fn urls(&self) -> Vec<&str> {
        vec!["https://www.facebook.com/reels/"]
    }

    fn auto_scroll_js(&self) -> String {
        include_str!("../../js/auto_scroll.js").to_string()
    }

    fn video_selector(&self) -> &str {
        "video"
    }

    fn on_video_ended(&self) -> String {
        "window.scrollBy(0, window.innerHeight);".to_string()
    }
}
