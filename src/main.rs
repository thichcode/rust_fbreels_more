mod app;
mod config;
mod error;
mod platforms;
mod ui;
mod updater;

use anyhow::Result;
use tao::event::{Event, StartCause, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::window::{Fullscreen, WindowBuilder};
use tao::dpi::LogicalSize;

use crate::config::ConfigManager;
use crate::ui::console::auto_hide_console;
use crate::ui::keyboard::{handle_keyboard_event, KeyboardAction};
use crate::ui::tray::TrayIcon;
use crate::ui::webview::create_webview;

fn main() -> Result<()> {
    env_logger::init();
    auto_hide_console();

    log::info!("Starting FbReelsLite...");

    let mut config_manager = ConfigManager::new();
    config_manager.load()?;
    let config = config_manager.get().clone();

    let event_loop = EventLoopBuilder::new().build();

    let mut window_builder = WindowBuilder::new()
        .with_title("FbReelsLite")
        .with_inner_size(LogicalSize::new(config.window.width, config.window.height))
        .with_resizable(true);

    if config.window.maximized {
        window_builder = window_builder.with_maximized(true);
    }

    let window = window_builder.build(&event_loop)?;

    let webview = create_webview(&window, &config)?;

    let mut tray = TrayIcon::new();
    tray.initialize()?;

    log::info!("FbReelsLite initialized successfully");

    let mut is_fullscreen = false;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::NewEvents(StartCause::Poll) => {}
            Event::LoopDestroyed => {
                log::info!("FbReelsLite shutting down");
            }
            Event::WindowEvent { event, window_id, .. } => {
                if window_id == window.id() {
                    match event {
                        WindowEvent::CloseRequested => {
                            log::info!("Close requested, hiding window");
                            window.set_visible(false);
                            *control_flow = ControlFlow::Wait;
                        }
                        WindowEvent::Resized(_size) => {}
                        _ => {}
                    }
                }

                if let Some(action) = handle_keyboard_event(&event) {
                    match action {
                        KeyboardAction::PlayPause => {
                            let js = "window.FbReelsLite?.playPause();";
                            webview.evaluate_script(js).ok();
                        }
                        KeyboardAction::NextReel => {
                            let js = "window.FbReelsLite?.nextReel();";
                            webview.evaluate_script(js).ok();
                        }
                        KeyboardAction::PrevReel => {
                            let js = "window.FbReelsLite?.prevReel();";
                            webview.evaluate_script(js).ok();
                        }
                        KeyboardAction::ToggleFullscreen => {
                            is_fullscreen = !is_fullscreen;
                            if is_fullscreen {
                                window.set_fullscreen(Some(Fullscreen::Borderless(None)));
                            } else {
                                window.set_fullscreen(None);
                            }
                        }
                        KeyboardAction::ExitFullscreen => {
                            if is_fullscreen {
                                is_fullscreen = false;
                                window.set_fullscreen(None);
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    });
}
