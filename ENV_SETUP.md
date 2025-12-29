# 🔐 Environment Variables & Certificates Setup

## ⚠️ IMPORTANT: What Should NOT Be in Git

**NEVER commit these to Git:**
- ❌ `.env` files (any `.env*` files)
- ❌ Certificate files (`.pfx`, `.p12`, `.key`, `.pem`, etc.)
- ❌ Passwords or API keys
- ❌ The `certificates/` folder

**✅ Safe to commit:**
- ✅ `.env.example` (template file with no real values)
- ✅ Documentation files
- ✅ Source code

---

## 📋 Setting Up Environment Variables

### For Windows Code Signing (Optional)

If you want to sign your Windows executable, set these environment variables **locally on your machine**:

**PowerShell:**
```powershell
$env:WIN_CERTIFICATE_FILE = "C:\certificates\rocketram.pfx"
$env:WIN_CERTIFICATE_PASSWORD = "YourPassword123"
```

**Command Prompt:**
```cmd
set WIN_CERTIFICATE_FILE=C:\certificates\rocketram.pfx
set WIN_CERTIFICATE_PASSWORD=YourPassword123
```

**macOS/Linux:**
```bash
export WIN_CERTIFICATE_FILE="./certificates/rocketram.pfx"
export WIN_CERTIFICATE_PASSWORD="YourPassword123"
```

### Creating a Local .env File (Optional)

You can create a `.env.local` file in your project root (it's already in `.gitignore`):

```bash
# .env.local (DO NOT COMMIT THIS FILE!)
WIN_CERTIFICATE_FILE=C:\certificates\rocketram.pfx
WIN_CERTIFICATE_PASSWORD=YourPassword123
```

Then load it before building:
```bash
# PowerShell
Get-Content .env.local | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }

# Bash
export $(cat .env.local | xargs)
```

---

## 🎯 Quick Answer

**Do I need to put .env or certificates in Git?**
- **NO!** Never commit `.env` files or certificates to Git.

**Where do I put them?**
- Keep `.env` files and certificates **locally on your machine only**
- Set environment variables in your terminal before building
- Or create a `.env.local` file (it's already ignored by Git)

**Is code signing required?**
- **NO!** Code signing is optional. Your app works fine without it.
- Users will just see "Unknown publisher" warnings (they can still install)

**For more details:** See `CODE_SIGNING_QUICK_START.md`
