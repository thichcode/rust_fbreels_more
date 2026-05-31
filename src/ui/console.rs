#[cfg(target_os = "windows")]
pub fn auto_hide_console() {
    use std::thread;
    use std::time::Duration;

    thread::spawn(|| {
        thread::sleep(Duration::from_secs(5));
        unsafe {
            let hwnd = GetConsoleWindow();
            if !hwnd.is_null() {
                ShowWindow(hwnd, SW_HIDE);
            }
        }
    });
}

#[cfg(not(target_os = "windows"))]
pub fn auto_hide_console() {}

#[cfg(target_os = "windows")]
extern "system" {
    fn GetConsoleWindow() -> *mut std::ffi::c_void;
    fn ShowWindow(hwnd: *mut std::ffi::c_void, nCmdShow: i32) -> i32;
}

#[cfg(target_os = "windows")]
const SW_HIDE: i32 = 0;
