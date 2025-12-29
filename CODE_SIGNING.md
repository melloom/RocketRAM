# 🔐 Code Signing Guide for RocketRAM

This guide explains how to set up code signing for RocketRAM to remove Windows Defender warnings and add professional credibility to your app.

## 📋 Prerequisites

1. **Code Signing Certificate** - You'll need a valid code signing certificate
2. **Admin Privileges** - Required to sign the executable
3. **Windows SDK** - For signtool.exe (usually installed with Visual Studio)

## 🎫 Getting a Code Signing Certificate

### Option 1: Purchase from Certificate Authority (Recommended)
- **DigiCert** - ~$200-400/year
- **Sectigo** - ~$200-400/year  
- **GlobalSign** - ~$200-400/year
- **SSL.com** - ~$200-300/year

These certificates are trusted by Windows and will remove all warnings.

### Option 2: Self-Signed Certificate (For Testing Only)
⚠️ **Warning**: Self-signed certificates will still trigger Windows warnings, but useful for testing the signing process.

```powershell
# Create self-signed certificate (requires admin)
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=RocketRAM" -CertStoreLocation Cert:\CurrentUser\My
```

## 🔧 Setup Instructions

### Step 1: Export Your Certificate

If you have a certificate in Windows Certificate Store:

1. Open **certmgr.msc**
2. Go to **Personal** → **Certificates**
3. Find your code signing certificate
4. Right-click → **All Tasks** → **Export**
5. Export as **PFX** format (.pfx file)
6. Set a password and save the file

### Step 2: Set Environment Variables

Before building, set these environment variables:

**Windows (PowerShell):**
```powershell
$env:WIN_CERTIFICATE_FILE = "C:\path\to\your\certificate.pfx"
$env:WIN_CERTIFICATE_PASSWORD = "your_certificate_password"
npm run build:win
```

**Windows (Command Prompt):**
```cmd
set WIN_CERTIFICATE_FILE=C:\path\to\your\certificate.pfx
set WIN_CERTIFICATE_PASSWORD=your_certificate_password
npm run build:win
```

**macOS/Linux (for future macOS builds):**
```bash
export APPLE_IDENTITY="Developer ID Application: Melvin Peralta (TEAM_ID)"
npm run build:mac
```

### Step 3: Update Company Information

Edit `package.json` and update:

```json
{
  "author": "Melvin Peralta",
  "build": {
    "copyright": "Copyright © 2025 Melvin Peralta",
    "win": {
      "publisherName": "Melvin Peralta"
    }
  }
}
```

### Step 4: Build with Signing

Once environment variables are set, build normally:

```bash
# Build NSIS installer (signed)
npm run build:win

# Build portable (signed)
npm run build:portable
```

The `sign.js` script will automatically sign the executables if certificates are found.

## 🔍 Verifying Signature

After building, verify the signature:

**Windows:**
```powershell
Get-AuthenticodeSignature .\dist\win-unpacked\RocketRAM.exe
```

Or use signtool:
```cmd
signtool verify /pa /v RocketRAM.exe
```

## 🎯 Build Targets

The configuration supports multiple build targets:

1. **NSIS Installer** - Full installer with signature
   ```bash
   npm run build:win
   ```
   Creates: `dist/RocketRAM Setup 1.0.0.exe`

2. **Portable EXE** - Single executable with signature
   ```bash
   npm run build:portable
   ```
   Creates: `dist/RocketRAM-1.0.0.exe`

3. **ZIP Archive** - Signed executables in ZIP
   ```bash
   npm run build:win
   ```
   Creates: `dist/RocketRAM-1.0.0-win-x64.zip`

## ⚠️ Troubleshooting

### "signtool.exe not found"
- Install Visual Studio or Windows SDK
- Add Windows SDK bin directory to PATH:
  ```
  C:\Program Files (x86)\Windows Kits\10\bin\x64\
  ```

### "Certificate file not found"
- Check `WIN_CERTIFICATE_FILE` path is correct
- Use absolute path, not relative

### "Signing failed: Invalid password"
- Verify `WIN_CERTIFICATE_PASSWORD` is correct
- Check for special characters that need escaping

### Build completes but signature not applied
- Check that `sign.js` is being called (look for "Signing executable" in build output)
- Verify certificate file format is .pfx (not .cer or .p7b)
- Ensure you have admin privileges

## 🔐 Security Best Practices

1. **Never commit certificates to git** - Add to `.gitignore`
2. **Use environment variables** - Don't hardcode passwords
3. **Store certificates securely** - Use password-protected storage
4. **Rotate certificates** - Renew before expiration

## 📝 CI/CD Integration

For automated builds, set environment variables in your CI/CD platform:

**GitHub Actions:**
```yaml
env:
  WIN_CERTIFICATE_FILE: ${{ secrets.WIN_CERTIFICATE_FILE }}
  WIN_CERTIFICATE_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
```

**Azure DevOps:**
- Add variables in Pipeline → Variables → Secret variables

## ✅ What You Get

With code signing enabled:
- ✅ No Windows Defender warnings
- ✅ Professional installer appearance
- ✅ Publisher name in file properties
- ✅ Trusted by Windows SmartScreen (after reputation)
- ✅ Better user experience

## 🆓 Alternative: Self-Signing for Testing

If you just want to test the signing process without purchasing a certificate:

1. Create self-signed certificate (see above)
2. Export as PFX
3. Set environment variables
4. Build and sign

Note: Users will still see warnings, but you can verify the signing process works.

