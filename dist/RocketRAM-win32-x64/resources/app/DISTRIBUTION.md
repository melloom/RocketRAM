# 📦 Distribution Guide - RocketRAM for Windows

## 🚀 Quick Start (No Admin Rights Required!)

Since you're on a work computer without admin rights, we'll create **portable builds** that don't require installation.

### Step 1: Install electron-builder (No Admin Needed)

```bash
cd "c:\Users\Mperalta\Desktop\pc performance"
npm install
```

This installs electron-builder locally (no admin required).

### Step 2: Build Your App

Choose one of these build options:

#### Option A: Portable EXE (Recommended - Single File)
```bash
npm run build:portable
```
Creates: `dist/RocketRAM-1.0.0.exe` (portable, no install needed)

#### Option B: ZIP Archive
```bash
npm run build:win
```
Creates: `dist/RocketRAM-1.0.0-win-x64.zip` (extract and run)

#### Option C: Directory Build (For Testing)
```bash
npm run build:dir
```
Creates: `dist/win-unpacked/` folder with all files

### Step 3: Distribute Your App

After building, you'll find your distributable files in the `dist/` folder:

```
dist/
├── RocketRAM-1.0.0.exe          # Portable executable (single file)
└── RocketRAM-1.0.0-win-x64.zip  # ZIP archive
```

## 📤 How to Share Your App

### Method 1: Direct File Share
1. Build the portable EXE: `npm run build:portable`
2. Upload `dist/RocketRAM-1.0.0.exe` to:
   - Google Drive
   - Dropbox
   - OneDrive
   - GitHub Releases
   - Your own website
3. Share the download link

### Method 2: ZIP Distribution
1. Build the ZIP: `npm run build:win`
2. Upload `dist/RocketRAM-1.0.0-win-x64.zip` to a file sharing service
3. Users download, extract, and run `RocketRAM.exe`

### Method 3: GitHub Releases (Free & Professional)
1. Create a GitHub repository (if you haven't)
2. Build your app: `npm run build:portable`
3. Go to your repo → Releases → Create new release
4. Upload `dist/RocketRAM-1.0.0.exe` as a release asset
5. Share the release link

## 🎯 Build Options Explained

### Portable EXE (`npm run build:portable`)
- ✅ Single file - easy to distribute
- ✅ No installation needed
- ✅ No admin rights required to run
- ⚠️ Larger file size (~100-150 MB)

### ZIP Archive (`npm run build:win`)
- ✅ Smaller file size (compressed)
- ✅ Easy to extract
- ✅ No admin rights required
- ⚠️ Users need to extract first

### Directory Build (`npm run build:dir`)
- ✅ Good for testing
- ✅ Fastest build
- ⚠️ Not ideal for distribution (many files)

## 📋 What Users Need

Users downloading your app need:
- **Windows 10/11** (64-bit)
- **No admin rights** (portable version)
- **No installation** - just run the .exe!

## 🔧 Troubleshooting Build Issues

### Build Fails with "Cannot find module"
```bash
npm install
npm run build:portable
```

### Build is Slow
- First build downloads Electron binaries (one-time)
- Subsequent builds are faster

### File Size Too Large
- This is normal for Electron apps (~100-150 MB)
- All dependencies are bundled
- Users only download once

### Windows Defender Warning
- First-time users may see "Windows protected your PC"
- This is normal for unsigned apps
- Users can click "More info" → "Run anyway"
- To avoid this, you'd need code signing (requires paid certificate)

## 🎁 Professional Distribution Options

### Code Signing (Requires Certificate)
- Removes Windows Defender warnings
- Costs ~$200-400/year for certificate
- Requires admin rights to sign

### Microsoft Store (Free)
- Requires Microsoft Developer account ($19 one-time)
- Users can install from Store
- No admin rights needed for users
- Requires app packaging as .msix

### Auto-Updater (Advanced)
- Use `electron-updater` package
- Auto-update from GitHub releases
- Free and works great!

## 📝 Next Steps

1. **Build your app**: `npm run build:portable`
2. **Test the EXE**: Run `dist/RocketRAM-1.0.0.exe` on your computer
3. **Share it**: Upload to your preferred platform
4. **Get feedback**: Share with users and iterate!

## 💡 Tips

- **Version numbers**: Update version in `package.json` before each build
- **File naming**: Build automatically includes version number
- **Testing**: Always test the built EXE before sharing
- **Updates**: Rebuild and upload new version when you make changes

---

**Ready to build?** Run `npm run build:portable` and you're done! 🚀

