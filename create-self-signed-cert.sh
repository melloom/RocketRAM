#!/bin/bash

# Create Self-Signed Code Signing Certificate for RocketRAM
# This script creates a self-signed certificate that can be used for testing code signing

echo "🔐 Creating Self-Signed Code Signing Certificate for RocketRAM"
echo ""

# Create certificates directory if it doesn't exist
CERT_DIR="./certificates"
mkdir -p "$CERT_DIR"

# Certificate details
CERT_NAME="RocketRAM-SelfSigned"
CERT_FILE="$CERT_DIR/rocketram-self-signed.pfx"
KEY_FILE="$CERT_DIR/rocketram.key"
CERT_FILE_CER="$CERT_DIR/rocketram.cer"

# Prompt for certificate password
echo "Enter a password for the certificate (you'll need this for code signing):"
read -s CERT_PASSWORD
echo ""

if [ -z "$CERT_PASSWORD" ]; then
    echo "⚠️  Error: Password cannot be empty"
    exit 1
fi

echo "Creating certificate files..."
echo ""

# Generate private key
openssl genrsa -out "$KEY_FILE" 2048

# Create certificate configuration file
cat > "$CERT_DIR/cert.conf" << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = State
L = City
O = RocketRAM
OU = Development
CN = RocketRAM Self-Signed Certificate

[v3_req]
keyUsage = critical, digitalSignature
extendedKeyUsage = codeSigning
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
EOF

# Generate self-signed certificate
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE_CER" -days 365 -config "$CERT_DIR/cert.conf" -extensions v3_req

# Convert to PFX format (for Windows code signing)
openssl pkcs12 -export -out "$CERT_FILE" -inkey "$KEY_FILE" -in "$CERT_FILE_CER" -password "pass:$CERT_PASSWORD" -name "RocketRAM"

# Clean up temporary files
rm -f "$KEY_FILE" "$CERT_FILE_CER" "$CERT_DIR/cert.conf"

# Get absolute path
CERT_ABS_PATH=$(cd "$(dirname "$CERT_FILE")" && pwd)/$(basename "$CERT_FILE")

echo ""
echo "✅ Self-signed certificate created successfully!"
echo ""
echo "📁 Certificate location: $CERT_ABS_PATH"
echo "🔑 Password: [The password you entered]"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Set environment variables before building:"
echo "   export WIN_CERTIFICATE_FILE=\"$CERT_ABS_PATH\""
echo "   export WIN_CERTIFICATE_PASSWORD=\"$CERT_PASSWORD\""
echo ""
echo "2. Build your app:"
echo "   npm run build:win"
echo ""
echo "⚠️  Note: Self-signed certificates will still show warnings to users."
echo "   This is normal and expected for self-signed certificates."
echo ""
echo "🔒 Security: Keep your certificate and password secure!"
echo "   The certificate file has been added to .gitignore"


