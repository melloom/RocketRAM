# Icon Setup Instructions

## Adding Your App Icon

RocketRAM supports platform-specific icons for the best experience on each operating system.

### Windows Icons

1. **Place your Windows icon file** in the project root directory:
   - `icon.ico` (recommended)
   - OR `icon-windows.ico`

2. **ICO file requirements:**
   - Multiple sizes: 16x16, 32x32, 48x48, 256x256 pixels
   - Best quality for Windows taskbar, system tray, and window

### macOS Icons

1. **Place your Mac icon file** in the project root directory:
   - `icon.icns` (recommended)
   - OR `icon-mac.icns`

2. **ICNS file requirements:**
   - Multiple sizes: 16x16, 32x32, 128x128, 256x256, 512x512, 1024x1024 pixels
   - Native macOS icon format

### File Locations Checked

The app automatically detects icons in this order:

**Windows:**
- `icon.ico`
- `icon-windows.ico`
- `assets/icon.ico`
- `assets/icon-windows.ico`
- `icon.png` (fallback)

**macOS:**
- `icon.icns`
- `icon-mac.icns`
- `assets/icon.icns`
- `assets/icon-mac.icns`
- `icon.png` (fallback)

### After Adding Icons

1. **Restart the app**
2. The icon will appear in:
   - Window title bar
   - System tray
   - Taskbar/Dock
   - Task Manager/Activity Monitor

### Creating Icon Files

**Windows ICO:**
- Use online converters (convertio.co, ico-convert.com)
- Or use image editing software (GIMP, Photoshop)
- Include multiple sizes for best quality

**macOS ICNS:**
- Use `iconutil` command: `iconutil -c icns icon.iconset`
- Or use online converters
- Or use image editing software with ICNS export

### Current Status

✅ The app is configured to automatically detect and use platform-specific icon files. Just place your icons in the project root and restart!

