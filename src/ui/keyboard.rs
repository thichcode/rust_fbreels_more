use tao::event::{ElementState, KeyEvent, WindowEvent};
use tao::keyboard::Key;

pub fn handle_keyboard_event(window_event: &WindowEvent<'_>) -> Option<KeyboardAction> {
    if let WindowEvent::KeyboardInput {
        event:
            KeyEvent {
                logical_key,
                state: ElementState::Pressed,
                ..
            },
        ..
    } = window_event
    {
        match logical_key {
            Key::Space => Some(KeyboardAction::PlayPause),
            Key::ArrowDown => Some(KeyboardAction::NextReel),
            Key::ArrowUp => Some(KeyboardAction::PrevReel),
            Key::Character("f") | Key::Character("F") => Some(KeyboardAction::ToggleFullscreen),
            Key::Escape => Some(KeyboardAction::ExitFullscreen),
            _ => None,
        }
    } else {
        None
    }
}

#[derive(Debug)]
pub enum KeyboardAction {
    PlayPause,
    NextReel,
    PrevReel,
    ToggleFullscreen,
    ExitFullscreen,
}
