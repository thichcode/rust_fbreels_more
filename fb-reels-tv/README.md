# FbReels TV

Facebook Reels viewer for Samsung TV via TizenBrew with auto-scroll and remote controls.

## Prerequisites

- Samsung TV with TizenBrew installed

## Quick Start

### Install on TV

Open TizenBrew → Install Module → enter `@thichcode/fb-reels-tv`

### Or build locally

```bash
npm install -g tizenbrew-kit
tizenbrew-kit build
npm publish --access public
```

## Usage

1. Open FbReels TV from TizenBrew
2. If not logged in: use TV remote to enter your Facebook email and password on screen
3. Cookies are saved automatically — you won't need to log in again
4. Use TV remote to navigate reels

### Remote Controls

| Key | Action |
|-----|--------|
| ↑ / ↓ | Previous / next reel |
| ← / → | Previous / next reel |
| Enter | Play / pause |
| Back | Show/hide login prompt |
| Yellow (ColorF2) | Toggle auto-scroll on/off |

### Auto-Scroll

Automatically advances to the next reel when the current video loops. Toggle with the Yellow button.

## License

MIT
