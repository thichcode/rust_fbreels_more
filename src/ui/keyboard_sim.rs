#[cfg(windows)]
pub fn send_key(key_code: u16) {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;

    unsafe {
        let mut input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: key_code,
                    wScan: 0,
                    dwFlags: 0,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        };
        SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);

        input.Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        SendInput(1, &mut input, std::mem::size_of::<INPUT>() as i32);
    }
}

#[cfg(not(windows))]
pub fn send_key(_key_code: u16) {
    // no-op on non-windows
}

pub fn send_arrow_down() {
    send_key(0x28); // VK_DOWN
}
