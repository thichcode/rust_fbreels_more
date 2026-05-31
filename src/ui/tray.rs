use anyhow::Result;
use muda::{Menu, MenuItem};
use tray_icon::{Icon, TrayIconBuilder};

pub struct TrayIcon {
    _tray: Option<tray_icon::TrayIcon>,
}

impl TrayIcon {
    pub fn new() -> Self {
        Self { _tray: None }
    }

    pub fn initialize(&mut self) -> Result<()> {
        let menu = Menu::new();
        menu.append(&MenuItem::new("Show FbReelsLite", true, None))?;
        menu.append(&muda::PredefinedMenuItem::separator())?;
        menu.append(&MenuItem::new("Auto-scroll: ON", true, None))?;
        menu.append(&muda::PredefinedMenuItem::separator())?;
        menu.append(&MenuItem::new("Quit", true, None))?;

        let icon = create_tray_icon();

        let tray_icon = TrayIconBuilder::new()
            .with_menu(Box::new(menu))
            .with_tooltip("FbReelsLite")
            .with_icon(icon)
            .build()?;

        self._tray = Some(tray_icon);
        log::info!("System tray initialized");

        Ok(())
    }
}

fn create_tray_icon() -> Icon {
    let icon_rgba = generate_icon_rgba();
    Icon::from_rgba(icon_rgba, 16, 16).unwrap_or_else(|_| create_fallback_icon())
}

fn generate_icon_rgba() -> Vec<u8> {
    let mut rgba = vec![0u8; 16 * 16 * 4];

    for y in 0..16 {
        for x in 0..16 {
            let idx = (y * 16 + x) * 4;
            rgba[idx] = 24;     // R
            rgba[idx + 1] = 119; // G
            rgba[idx + 2] = 242; // B
            rgba[idx + 3] = 255; // A
        }
    }

    draw_letter_f(&mut rgba, 3, 3);
    rgba
}

fn draw_letter_f(rgba: &mut [u8], start_x: usize, start_y: usize) {
    let f_pixels = [
        [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
        [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
        [0, 6], [1, 6], [2, 6], [3, 6],
        [1, 3], [2, 3], [3, 3],
    ];

    for [dx, dy] in f_pixels {
        let x = start_x + dx;
        let y = start_y + dy;
        if x < 16 && y < 16 {
            let idx = (y * 16 + x) * 4;
            rgba[idx] = 255;
            rgba[idx + 1] = 255;
            rgba[idx + 2] = 255;
            rgba[idx + 3] = 255;
        }
    }
}

fn create_fallback_icon() -> Icon {
    let mut rgba = vec![24u8; 16 * 16 * 4];
    for i in (3..rgba.len()).step_by(4) {
        rgba[i] = 255;
    }
    Icon::from_rgba(rgba, 16, 16).unwrap()
}
