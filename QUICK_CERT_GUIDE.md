# 🚀 Quick Guide: Create Self-Signed Certificate

## For macOS/Linux (Current System)

Run the script:

```bash
./create-cert.sh
```

The script will:
1. Prompt you for a password (remember this!)
2. Create a certificate in `./certificates/rocketram-self-signed.pfx`
3. Show you the commands to set environment variables

## For Windows

Use PowerShell (run as Administrator):

### Option 1: Use the PowerShell Script

```powershell
.\create-self-signed-cert-windows.ps1
```

### Option 2: Manual Command

```powershell
# Create certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=RocketRAM" -CertStoreLocation Cert:\CurrentUser\My

# Export to PFX (replace password)
$password = Read-Host "Enter password" -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath ".\certificates\rocketram-self-signed.pfx" -Password $password
```

## After Creating Certificate

### macOS/Linux:
```bash
export WIN_CERTIFICATE_FILE="./certificates/rocketram-self-signed.pfx"
export WIN_CERTIFICATE_PASSWORD="your_password_here"
npm run build:win
```

### Windows:
```powershell
$env:WIN_CERTIFICATE_FILE = ".\certificates\rocketram-self-signed.pfx"
$env:WIN_CERTIFICATE_PASSWORD = "your_password_here"
npm run build:win
```

## Important Notes

- ⚠️ Self-signed certificates will still show warnings to users
- 🔒 Keep your certificate password secure
- 📁 The certificate is automatically added to `.gitignore`
- ✅ This is for testing - use a real CA certificate for production


