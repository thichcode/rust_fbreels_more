use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub window: WindowSettings,
    pub auto_scroll: AutoScrollConfig,
    pub keyboard: KeyboardConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoScrollConfig {
    pub enabled: bool,
    pub delay_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardConfig {
    pub enabled: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            window: WindowSettings {
                width: 400.0,
                height: 700.0,
                maximized: false,
            },
            auto_scroll: AutoScrollConfig {
                enabled: true,
                delay_ms: 1500,
            },
            keyboard: KeyboardConfig { enabled: true },
        }
    }
}
