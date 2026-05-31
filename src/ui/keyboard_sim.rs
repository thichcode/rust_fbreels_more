#[cfg(target_os = "windows")]
pub fn send_arrow_down() {
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::*;

    unsafe {
        let mut input: INPUT = std::mem::zeroed();
        input.r#type = INPUT_KEYBOARD;
        input.Anonymous.ki.wVk = VK_DOWN;
        input.Anonymous.ki.wScan = 0;
        input.Anonymous.ki.dwFlags = 0;
        input.Anonymous.ki.time = 0;
        input.Anonymous.ki.dwExtraInfo = 0;
        SendInput(1, &input, std::mem::size_of::<INPUT>() as i32);

        std::thread::sleep(std::time::Duration::from_millis(50));

        let mut input_up: INPUT = std::mem::zeroed();
        input_up.r#type = INPUT_KEYBOARD;
        input_up.Anonymous.ki.wVk = VK_DOWN;
        input_up.Anonymous.ki.wScan = 0;
        input_up.Anonymous.ki.dwFlags = KEYEVENTF_KEYUP;
        input_up.Anonymous.ki.time = 0;
        input_up.Anonymous.ki.dwExtraInfo = 0;
        SendInput(1, &input_up, std::mem::size_of::<INPUT>() as i32);
    }

    log::info!("Sent ArrowDown via winapi SendInput");
}

#[cfg(not(target_os = "windows"))]
pub fn send_arrow_down() {
    log::warn!("Keyboard simulation not supported on this platform");
}
