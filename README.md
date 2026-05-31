# FbReelsLite

Lightweight Facebook Reels viewer with auto-scroll, built with Rust + WebView2.

## Features

- **WebView2 Engine** - Renders Facebook Reels directly
- **Auto-Scroll** - Scrolls to next reel when video ends (configurable delay)
- **Keyboard Shortcuts** - Space (play/pause), ↑↓ (prev/next), F (fullscreen), Esc
- **System Tray** - Minimize to tray, quick access
- **Configurable** - Window size, auto-scroll delay, keyboard shortcuts

## Download

Download the latest release from [GitHub Releases](https://github.com/thichcode/rust_fbreels_more/releases).

## Build from Source

```bash
# Clone
git clone https://github.com/thichcode/rust_fbreels_more.git
cd rust_fbreels_more

# Build
cargo build --release

# Run
cargo run --release
```

## Configuration

Config file location: `%APPDATA%\fb-reels-lite\app\config\config.json`

```json
{
  "window": {
    "width": 400,
    "height": 700,
    "maximized": false
  },
  "auto_scroll": {
    "enabled": true,
    "delay_ms": 1500
  },
  "keyboard": {
    "enabled": true
  }
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ↑ | Previous reel |
| ↓ | Next reel |
| F | Toggle fullscreen |
| Esc | Exit fullscreen |

## System Requirements

- Windows 10/11 (64-bit)
- WebView2 Runtime (pre-installed on Windows 11)

## License

MIT
