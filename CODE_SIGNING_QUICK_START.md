# 🔐 Code Signing - Quick Start Guide

## What is Code Signing?

Code signing adds a digital signature to your app so Windows recognizes it as safe and trusted. **Without it, Windows will show warnings** like "Unknown publisher" when users try to install your app.

## ⚡ Quick Answer: What You Need to Do

You have **2 options**:

### Option 1: Skip Code Signing (For Now)
✅ **If you're just testing or distributing to friends:**
- You can build without signing - the app will work fine
- Users will see "Unknown publisher" warnings (they can still install)
- No cost, no setup needed
- **Just run:** `npm run build:win`

### Option 2: Add Code Signing (For Professional Distribution)
✅ **If you want to distribute publicly:**
- You need to **buy a code signing certificate** ($200-400/year)
- OR create a **self-signed certificate** (free, but still shows warnings)
- Set up environment variables
- Then build normally

---

## 📋 Step-by-Step: Option 1 (No Signing - Easiest)

**For now, you can skip code signing:**

1. **Just build your app:**
   ```bash
   npm run build:win
   ```

2. **That's it!** The app will build successfully
   - You'll see a warning: "⚠️ Code signing certificate not found. Building without signature."
   - This is fine - your app will still work
   - Users will see "Unknown publisher" but can still install

**Use this if:** You're testing, showing to friends, or learning. You can always add signing later.

---

## 📋 Step-by-Step: Option 2A (Buy Certificate - Recommended for Public Distribution)

### Step 1: Buy a Code Signing Certificate

**Where to buy:**
- **DigiCert** - https://www.digicert.com/ (~$200-400/year) - Most trusted
- **Sectigo** - https://sectigo.com/ (~$200-400/year) - Popular
- **SSL.com** - https://www.ssl.com/ (~$200-300/year) - Affordable

**What you'll get:**
- A `.pfx` certificate file (or instructions to export it)
- A password to protect the certificate

### Step 2: Save Your Certificate

1. Download/export your certificate as a **.pfx file**
2. Save it somewhere safe (e.g., `C:\certificates\rocketram.pfx`)
3. Remember the password

### Step 3: Set Environment Variables

**Windows PowerShell (recommended):**
```powershell
# Set the certificate file path (use your actual path)
$env:WIN_CERTIFICATE_FILE = "C:\certificates\rocketram.pfx"

# Set the password (use your actual password)
$env:WIN_CERTIFICATE_PASSWORD = "YourPassword123"

# Now build
npm run build:win
```

**Windows Command Prompt:**
```cmd
set WIN_CERTIFICATE_FILE=C:\certificates\rocketram.pfx
set WIN_CERTIFICATE_PASSWORD=YourPassword123
npm run build:win
```

### Step 4: Build Your App

```bash
npm run build:win
```

**You should see:**
```
🔐 Signing executable: ...
✅ Code signing successful!
```

---

## 📋 Step-by-Step: Option 2B (Self-Signed Certificate - Free but Shows Warnings)

**Use this if:** You want to test the signing process, but don't want to buy a certificate yet.

### Step 1: Create Self-Signed Certificate

**Open PowerShell as Administrator** and run:

whe you oroginally press any the disk or anything it shuld be liek teh network one a just one card wit al the info if i cick that then teh k=list f oeration for that pos up fox it ```powershell
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=RocketRAM" -CertStoreLocation Cert:\CurrentUser\My
```

This creates a certificate in your Windows certificate store.

### Step 2: Export Certificate as PFX

1. Press `Windows + R`, type `certmgr.msc`, press Enter
2. Go to **Personal** → **Certificates**
3. Find "RocketRAM" certificate
4. Right-click → **All Tasks** → **Export**
5. Click **Next**
6. Select **Yes, export the private key**
7. Select **Personal Information Exchange - PKCS #12 (.PFX)**
8. Check **Include all certificates in the certification path if possible**
9. Set a password (remember this!)
10. Choose a location (e.g., `C:\certificates\rocketram-self-signed.pfx`)
11. Click **Finish**

### Step 3: Set Environment Variables

```powershell
$env:WIN_CERTIFICATE_FILE = "C:\certificates\rocketram-self-signed.pfx"
$env:WIN_CERTIFICATE_PASSWORD = "YourPassword123"
npm run build:win
```

**Note:** Self-signed certificates will still show warnings to users, but you can verify the signing process works.

---

## 🔍 Verify Your Signature

After building, check if signing worked:

**PowerShell:**
```powershell
Get-AuthenticodeSignature .\dist\win-unpacked\RocketRAM.exe
```

**You should see:**
- `Status: Valid` (if using real certificate)
- `Status: UnknownError` (if using self-signed - this is normal)

---

## 🎯 Summary: What Should I Do?

| Scenario | What to Do |
|----------|------------|
| **Just testing/learning** | Skip signing → Just run `npm run build:win` |
| **Distributing to friends** | Skip signing → Just run `npm run build:win` |
| **Public distribution** | Buy certificate → Follow Option 2A |
| **Testing signing process** | Self-sign → Follow Option 2B |

---

## ❓ Common Questions

### Do I need to sign my app?
**No!** Signing is optional. Your app works fine without it. Users will just see "Unknown publisher" warnings.

### Will users still be able to install without signing?
**Yes!** They just click "More info" → "Run anyway" (one extra step).

### Do I need admin privileges to sign?
**Yes**, you need admin privileges when building.

### Can I sign later?
**Yes!** You can always add signing later. Just set the environment variables and rebuild.

### What if I'm on macOS?
For macOS builds, you'll need an Apple Developer account ($99/year) and set:
```bash
export APPLE_IDENTITY="Developer ID Application: Melvin Peralta (TEAM_ID)"
npm run build:mac
```

---

## 🆘 Troubleshooting

**"signtool.exe not found"**
- Install Visual Studio or Windows SDK
- Or add Windows SDK to PATH: `C:\Program Files (x86)\Windows Kits\10\bin\x64\`

**"Certificate file not found"**
- Use the full absolute path (e.g., `C:\certificates\file.pfx`)
- Don't use relative paths

**"Invalid password"**
- Double-check your password
- Make sure there are no extra spaces

**Build works but shows warning about no certificate**
- This is fine! Your app still builds successfully
- You just won't have a signature

---

## 💡 Recommendation

**For now:** Skip signing and just build. You can always add it later when you're ready to distribute publicly.

**When ready:** Buy a certificate from DigiCert or Sectigo for professional distribution.

---

**Need more details?** See `CODE_SIGNING.md` for the full technical documentation.


1