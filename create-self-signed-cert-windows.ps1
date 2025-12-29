# Create Self-Signed Code Signing Certificate for RocketRAM (Windows)
# Run this script in PowerShell as Administrator

Write-Host "🔐 Creating Self-Signed Code Signing Certificate for RocketRAM" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: This script should be run as Administrator for best results" -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Create certificates directory if it doesn't exist
$certDir = Join-Path $PSScriptRoot "certificates"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Certificate details
$certName = "CN=RocketRAM-SelfSigned"
$certStoreLocation = "Cert:\CurrentUser\My"
$pfxPath = Join-Path $certDir "rocketram-self-signed.pfx"

# Prompt for certificate password
$certPassword = Read-Host "Enter a password for the certificate (you'll need this for code signing)" -AsSecureString
$certPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($certPassword))

if ([string]::IsNullOrEmpty($certPasswordPlain)) {
    Write-Host "⚠️  Error: Password cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating self-signed certificate..." -ForegroundColor Green

try {
    # Create self-signed certificate
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $certName `
        -CertStoreLocation $certStoreLocation `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature `
        -KeySpec Signature `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -ValidityPeriod Years `
        -ValidityPeriodUnits 1

    Write-Host "✅ Certificate created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certificate Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
    Write-Host "Subject: $($cert.Subject)" -ForegroundColor Cyan
    Write-Host ""

    # Export certificate to PFX
    Write-Host "Exporting certificate to PFX format..." -ForegroundColor Green
    
    $pfxPassword = ConvertTo-SecureString -String $certPasswordPlain -Force -AsPlainText
    
    Export-PfxCertificate `
        -Cert $cert `
        -FilePath $pfxPath `
        -Password $pfxPassword | Out-Null

    Write-Host "✅ Certificate exported to: $pfxPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Set environment variables before building:" -ForegroundColor White
    Write-Host "   `$env:WIN_CERTIFICATE_FILE = `"$pfxPath`"" -ForegroundColor Cyan
    Write-Host "   `$env:WIN_CERTIFICATE_PASSWORD = `"$certPasswordPlain`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Build your app:" -ForegroundColor White
    Write-Host "   npm run build:win" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  Note: Self-signed certificates will still show warnings to users." -ForegroundColor Yellow
    Write-Host "   This is normal and expected for self-signed certificates." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔒 Security: Keep your certificate and password secure!" -ForegroundColor Red
    Write-Host "   The certificate file has been added to .gitignore" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To remove the certificate from your certificate store later:" -ForegroundColor Cyan
    Write-Host "   Remove-Item -Path `"$certStoreLocation\$($cert.Thumbprint)`"" -ForegroundColor Gray

} catch {
    Write-Host "❌ Error creating certificate: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}


