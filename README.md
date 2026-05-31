<div align="center">

# FbReelsLite

**Lightweight Facebook Reels Viewer with Auto-Scroll**

Built with Rust + WebView2 | ~2MB | Zero Chromium bundle

[![Release](https://img.shields.io/github/v/release/thichcode/rust_fbreels_more?style=flat-square)](https://github.com/thichcode/rust_fbreels_more/releases)
[![Build](https://img.shields.io/github/actions/workflow/status/thichcode/rust_fbreels_more/release.yml?style=flat-square)](https://github.com/thichcode/rust_fbreels_more/actions)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| WebView2 Engine | Renders Facebook Reels natively, no Chromium bundle |
| Auto-Scroll | Automatically scrolls to next reel when video ends |
| Keyboard Shortcuts | Space (play/pause), Arrow keys (prev/next), F (fullscreen) |
| System Tray | Minimize to tray, quick access from taskbar |
| Lightweight | ~2MB executable, ~10MB RAM usage |
| Configurable | Window size, auto-scroll delay, keyboard shortcuts |

## Download

Download the latest release from [**GitHub Releases**](https://github.com/thichcode/rust_fbreels_more/releases).

```
fb-reels-lite.exe    - Standalone executable (~2MB)
fb-reels-lite.zip    - Compressed archive
```

## Quick Start

```bash
# Download and run
fb-reels-lite.exe

# Or build from source
git clone https://github.com/thichcode/rust_fbreels_more.git
cd rust_fbreels_more
cargo build --release
target/release/fb-reels-lite.exe
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `↑` | Previous reel |
| `↓` | Next reel |
| `F` | Toggle fullscreen |
| `Esc` | Exit fullscreen |

## Configuration

Config file: `%APPDATA%\fb-reels-lite\app\config\config.json`

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

## Architecture

```
FbReelsLite/
├── src/
│   ├── main.rs           # Event loop, WebView setup
│   ├── app.rs            # AppConfig struct
│   ├── config.rs         # ConfigManager (ProjectDirs)
│   ├── updater.rs        # Auto-update via GitHub Releases
│   └── ui/
│       ├── webview.rs    # WebView + IPC handler
│       ├── keyboard.rs   # Keyboard shortcuts
│       ├── tray.rs       # System tray
│       └── console.rs    # Auto-hide console
├── js/
│   ├── auto_scroll.js    # Video detection + auto-scroll
│   └── controls.js       # Playback controls
└── .github/
    └── workflows/
        └── release.yml   # Auto-tag + build + release
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Window | [tao](https://crates.io/crates/tao) 0.35 |
| WebView | [wry](https://crates.io/crates/wry) 0.55 (WebView2) |
| Tray | [tray-icon](https://crates.io/crates/tray-icon) + [muda](https://crates.io/crates/muda) |
| HTTP | [reqwest](https://crates.io/crates/reqwest) 0.12 |
| Config | [directories](https://crates.io/crates/directories) 4.0 |

## System Requirements

- Windows 10/11 (64-bit)
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 11)

## Development

```bash
# Debug build
cargo run

# Release build
cargo build --release

# Run with logging
RUST_LOG=info cargo run
```

## Roadmap

- [ ] Reliable auto-scroll with video end detection
- [ ] TikTok support
- [ ] YouTube Shorts support
- [ ] Multi-platform tray menu (enable/disable platforms)
- [ ] Customizable keyboard shortcuts
- [ ] Proxy support

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with Rust**

[Report Issues](https://github.com/thichcode/rust_fbreels_more/issues)

</div>
