#!/bin/bash

# Create Self-Signed Code Signing Certificate for RocketRAM
# This creates a certificate that can be used for Windows code signing

set -e

echo "🔐 Creating Self-Signed Code Signing Certificate"
echo "================================================"
echo ""

# Create certificates directory
CERT_DIR="./certificates"
mkdir -p "$CERT_DIR"

# Certificate file
CERT_FILE="$CERT_DIR/rocketram-self-signed.pfx"

# Check if certificate already exists
if [ -f "$CERT_FILE" ]; then
    echo "⚠️  Certificate already exists at: $CERT_FILE"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    rm -f "$CERT_FILE"
fi

# Prompt for password
echo "Enter a password for the certificate (keep this safe!):"
read -s CERT_PASSWORD
echo ""

if [ -z "$CERT_PASSWORD" ]; then
    echo "❌ Error: Password cannot be empty"
    exit 1
fi

echo "Confirm password:"
read -s CERT_PASSWORD_CONFIRM
echo ""

if [ "$CERT_PASSWORD" != "$CERT_PASSWORD_CONFIRM" ]; then
    echo "❌ Error: Passwords do not match"
    exit 1
fi

echo ""
echo "Creating certificate..."

# Create certificate config
CONFIG_FILE="$CERT_DIR/cert.conf"
cat > "$CONFIG_FILE" << 'EOF'
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = San Francisco
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

# Generate private key (2048 bits)
KEY_FILE="$CERT_DIR/rocketram.key"
openssl genrsa -out "$KEY_FILE" 2048

# Generate certificate
CERT_PEM="$CERT_DIR/rocketram.crt"
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_PEM" -days 365 -config "$CONFIG_FILE" -extensions v3_req

# Convert to PFX format (Windows code signing format)
openssl pkcs12 -export \
    -out "$CERT_FILE" \
    -inkey "$KEY_FILE" \
    -in "$CERT_PEM" \
    -name "RocketRAM" \
    -password "pass:$CERT_PASSWORD"

# Clean up temporary files
rm -f "$KEY_FILE" "$CERT_PEM" "$CONFIG_FILE"

# Get absolute path
CERT_ABS_PATH=$(cd "$(dirname "$CERT_FILE")" && pwd)/$(basename "$CERT_FILE")

echo ""
echo "✅ Certificate created successfully!"
echo ""
echo "📁 Location: $CERT_ABS_PATH"
echo "🔑 Password: [The password you entered]"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Set environment variables:"
echo "   export WIN_CERTIFICATE_FILE=\"$CERT_ABS_PATH\""
echo "   export WIN_CERTIFICATE_PASSWORD=\"$CERT_PASSWORD\""
echo ""
echo "2. Build your app:"
echo "   npm run build:win"
echo ""
echo "⚠️  Note: Self-signed certificates will show 'Unknown Publisher' warnings."
echo "   This is expected. For production, use a certificate from a trusted CA."
echo ""


