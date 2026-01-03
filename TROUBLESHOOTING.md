# 🔧 Troubleshooting Guide - RocketRAM

This guide helps resolve common issues when downloading and running RocketRAM.

## 🍎 Mac: "App is Damaged" Error

If you see the error **"RocketRAM.app is damaged and can't be opened"**, this is a macOS security feature (Gatekeeper) blocking unsigned apps.

### Quick Fix (Recommended)

1. **Right-click** on `RocketRAM.app`
2. Select **"Open"** from the context menu
3. Click **"Open"** when macOS asks for confirmation
4. The app will now be trusted and open normally

### Alternative Fix (Terminal)

If the right-click method doesn't work, remove the quarantine attribute:

1. Open **Terminal** (Applications → Utilities → Terminal)
2. Run this command (replace path with your actual download location):
   ```bash
   xattr -cr /path/to/RocketRAM.app
   ```
   
   Example if downloaded to Downloads:
   ```bash
   xattr -cr ~/Downloads/RocketRAM.app
   ```
3. Double-click the app to open it

### Why This Happens

- macOS Gatekeeper blocks apps from unidentified developers
- This is a security feature, not a problem with the app
- The app is safe to use - it just needs user approval

---

## 🪟 Windows: Missing FFmpeg.dll Error

If you see an error about **"ffmpeg.dll is missing"**, try these solutions:

### Solution 1: Use ZIP Archive Instead (Recommended)

1. Download the **ZIP version** (`RocketRAM-X.X.X-win-x64.zip`) instead of the portable EXE
2. **Extract** the ZIP file completely (right-click → Extract All)
3. Run `RocketRAM.exe` from the extracted folder
4. Make sure you extract **all files** from the ZIP

### Solution 2: Check Antivirus Software

Some antivirus software may delete `ffmpeg.dll` thinking it's suspicious:

1. Check your antivirus quarantine folder
2. Restore `ffmpeg.dll` if it was quarantined
3. Add an exception for the RocketRAM folder

### Solution 3: Re-download

The download may have been corrupted:

1. Delete the current download
2. Download again from a reliable source
3. Verify the file size matches what's expected (~100-150 MB)

### Solution 4: Run from Unpacked Folder

If you have the unpacked folder (`win-unpacked`):

1. Navigate to the `win-unpacked` folder
2. Make sure `ffmpeg.dll` is in the same folder as `RocketRAM.exe`
3. Run `RocketRAM.exe` directly from this folder

### Why This Happens

- `ffmpeg.dll` is a required component bundled with Electron
- Antivirus software sometimes flags it as suspicious
- Corrupted downloads may exclude necessary files
- Portable EXEs may not extract correctly in some environments

---

## 🔒 Windows Defender / Antivirus Warnings

### "Windows protected your PC" Warning

This is normal for unsigned apps:

1. Click **"More info"**
2. Click **"Run anyway"**
3. The app will launch normally

### To Avoid Warnings (Future)

- Code signing with a valid certificate removes these warnings
- Requires purchasing a code signing certificate (~$200-400/year)
- See `CODE_SIGNING.md` for more information

---

## ❓ Still Having Issues?

1. **Check the file size** - Should be ~100-150 MB
2. **Try a different download method** - Direct download vs browser download
3. **Check available disk space** - Need at least 200 MB free
4. **Run as administrator** (Windows) - Sometimes needed for first run
5. **Check system requirements**:
   - Windows 10/11 (64-bit)
   - macOS 10.13 or later
   - 200+ MB free disk space

---

## 📝 Build-Specific Notes

### Mac Builds
- Distributed as `.dmg` or `.zip`
- Extract the `.app` bundle before running
- May require removing quarantine attribute (see above)

### Windows Builds
- **ZIP Archive**: Extract all files, run `RocketRAM.exe`
- **Portable EXE**: Single file, double-click to run
- **Directory Build**: For testing, run from `win-unpacked` folder

