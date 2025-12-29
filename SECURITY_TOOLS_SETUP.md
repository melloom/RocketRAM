# 🔐 Security Tools Setup Guide

This guide explains how to set up and integrate the security tools supported by RocketRAM's Security & Protection module.

## 📋 Overview

RocketRAM integrates with the following security tools:

1. **ClamAV** - Antivirus scanning engine
2. **YARA** - Pattern matching for malware detection
3. **osquery** - SQL-powered operating system instrumentation and monitoring
4. **Suricata** - Intrusion Detection/Prevention System (IDS/IPS)
5. **Wazuh** - Security monitoring platform

---

## 🛡️ ClamAV (Antivirus Scanner)

### What is ClamAV?
ClamAV is an open-source antivirus engine for detecting trojans, viruses, malware, and other malicious threats.

### Installation

**Windows:**
1. Download from: https://www.clamav.net/downloads
2. Install the Windows version
3. Add ClamAV to your PATH environment variable

**macOS:**
```bash
brew install clamav
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install clamav clamav-daemon
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install clamav clamav-update
```

### Configuration

1. **Update virus definitions:**
   ```bash
   freshclam
   ```

2. **Test installation:**
   ```bash
   clamscan --version
   ```

### Usage in RocketRAM

- **Quick Scan**: Scans common user directories
- **Full Scan**: Scans entire system
- **Auto-update**: Keep virus definitions up to date
- **Quarantine**: Automatically quarantine detected threats

### Integration Features

- Real-time file scanning (optional)
- Scheduled scans
- Threat detection and alerts
- Automatic quarantine of infected files

---

## 🔍 YARA (Rule-Based Malware Detection)

### What is YARA?
YARA is a tool designed to help malware researchers identify and classify malware samples based on textual or binary patterns.

### Installation

**Windows:**
1. Download from: https://github.com/VirusTotal/yara/releases
2. Extract and add to PATH

**macOS:**
```bash
brew install yara
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install yara
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install yara
```

### Configuration

1. **Create rules directory:**
   ```bash
   mkdir -p ~/.yara/rules
   ```

2. **Download community rules:**
   ```bash
   # Example: Clone popular YARA rules repository
   git clone https://github.com/Yara-Rules/rules.git ~/.yara/rules
   ```

3. **Test installation:**
   ```bash
   yara --version
   ```

### Usage in RocketRAM

- **Rule-based scanning**: Scan files using YARA rules
- **Custom rules**: Add your own YARA rules
- **Real-time detection**: Monitor files as they're created/modified
- **Threat intelligence**: Leverage community-maintained rules

### Integration Features

- Custom rule management
- File scanning with YARA rules
- Pattern matching for malware signatures
- Integration with ClamAV for comprehensive scanning

---

## 📊 osquery (System Monitoring)

### What is osquery?
osquery is a SQL-powered operating system instrumentation, monitoring, and analytics framework.

### Installation

**Windows:**
1. Download from: https://osquery.io/downloads
2. Install using the Windows installer
3. Add osquery to PATH

**macOS:**
```bash
brew install osquery
```

**Linux (Ubuntu/Debian):**
```bash
# Add osquery repository
export OSQUERY_KEY=1484120AC4E9F8A1A577AEEE97A80C63C9D8B80B
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys $OSQUERY_KEY
sudo add-apt-repository 'deb [arch=amd64] https://pkg.osquery.io/deb deb main'
sudo apt-get update
sudo apt-get install osquery
```

**Linux (Fedora/RHEL):**
```bash
# Add osquery repository
curl -L https://pkg.osquery.io/rpm/GPG | sudo tee /etc/pki/rpm-gpg/RPM-GPG-KEY-osquery
sudo yum-config-manager --add-repo https://pkg.osquery.io/rpm/osquery-s3-rpm.repo
sudo yum-config-manager --enable osquery-s3-rpm-repo
sudo yum install osquery
```

### Configuration

1. **Test installation:**
   ```bash
   osqueryi --version
   ```

2. **Example queries:**
   ```sql
   -- List running processes
   SELECT * FROM processes LIMIT 10;

   -- List listening ports
   SELECT * FROM listening_ports;

   -- Check file integrity
   SELECT * FROM file WHERE path LIKE '/etc/%';
   ```

### Usage in RocketRAM

- **System queries**: Run SQL queries on system data
- **Real-time monitoring**: Monitor system events
- **Activity tracking**: Track process, file, and network activity
- **Security monitoring**: Detect suspicious behavior

### Integration Features

- SQL-based system queries
- Real-time event monitoring
- Process and file tracking
- Network activity monitoring
- Integration with Wazuh for centralized logging

---

## 🚨 Suricata (IDS/IPS)

### What is Suricata?
Suricata is a high-performance Network IDS, IPS, and Network Security Monitoring engine.

### Installation

**Windows:**
1. Download from: https://suricata.io/download/
2. Install using the Windows installer

**macOS:**
```bash
brew install suricata
```

**Linux (Ubuntu/Debian):**
```bash
sudo add-apt-repository ppa:oisf/suricata-stable
sudo apt-get update
sudo apt-get install suricata
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install suricata
```

### Configuration

1. **Basic configuration** (usually at `/etc/suricata/suricata.yaml`):
   ```yaml
   # Configure network interface
   interface: eth0  # or your interface

   # Enable IPS mode (requires nfqueue)
   # Set to IDS mode by default
   ```

2. **Update rules:**
   ```bash
   sudo suricata-update
   ```

3. **Test installation:**
   ```bash
   suricata --version
   ```

### Usage in RocketRAM

- **Network monitoring**: Monitor network traffic
- **Threat detection**: Detect network-based attacks
- **IPS mode**: Block malicious traffic (optional)
- **Alert management**: View and manage security alerts

### Integration Features

- Real-time network traffic analysis
- Intrusion detection
- Optional intrusion prevention (blocking)
- Alert generation and logging
- Integration with Wazuh for centralized monitoring

---

## 🔐 Wazuh (Security Monitoring Platform)

### What is Wazuh?
Wazuh is a free, open-source security platform that provides unified XDR and SIEM capabilities.

### Installation

**Note:** Wazuh requires a Wazuh Manager server. You can install:

1. **Wazuh Manager** (server) - https://documentation.wazuh.com/current/installation-guide/index.html
2. **Wazuh Agent** (client) - https://documentation.wazuh.com/current/installation-guide/wazuh-agent/index.html

### Quick Setup

**Wazuh Manager:**
```bash
# Install Wazuh Manager (Linux)
curl -sO https://packages.wazuh.com/4.x/wazuh-install.sh
sudo bash ./wazuh-install.sh --wazuh-indexer --wazuh-dashboard --wazuh-server

# Default credentials:
# Username: admin
# Password: (generated during installation)
```

**Wazuh Agent:**
```bash
# Install Wazuh Agent
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && chmod 644 /usr/share/keyrings/wazuh.gpg && echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee -a /etc/apt/sources.list.d/wazuh.list
sudo apt-get update
sudo apt-get install wazuh-agent

# Configure agent
sudo nano /var/ossec/etc/ossec.conf
# Set <address> to your Wazuh Manager IP

# Start agent
sudo systemctl start wazuh-agent
sudo systemctl enable wazuh-agent
```

### Configuration in RocketRAM

1. **Set Wazuh Manager URL:**
   - Default: `https://localhost:55000` (or your manager IP)
   - Use HTTPS for secure communication

2. **API Credentials:**
   - Username: Your Wazuh API user
   - Password: Your Wazuh API password

3. **Test Connection:**
   - Click "Test Connection" to verify connectivity

### Usage in RocketRAM

- **Centralized monitoring**: Send security events to Wazuh
- **Dashboards**: Access Wazuh dashboard for analysis
- **Alert correlation**: Correlate events from multiple sources
- **Compliance**: Monitor compliance with security policies

### Integration Features

- Automatic event forwarding
- Integration with ClamAV, YARA, osquery, and Suricata
- Centralized logging and analysis
- Real-time alerting
- Compliance monitoring

---

## 🔗 Tool Integration

RocketRAM integrates all these tools to provide comprehensive security monitoring:

### Integration Flow

```
┌──────────┐
│ ClamAV   │──┐
└──────────┘  │
              │
┌──────────┐  │     ┌──────────┐     ┌──────────┐
│  YARA    │──┼────>│ RocketRAM│────>│  Wazuh   │
└──────────┘  │     └──────────┘     └──────────┘
              │           │
┌──────────┐  │           │
│ osquery  │──┘           │
└──────────┘              │
                          │
              ┌───────────┘
              │
       ┌──────────┐
       │ Suricata │
       └──────────┘
```

### Integration Benefits

1. **ClamAV + YARA**: Comprehensive malware detection
2. **osquery**: System-level activity monitoring
3. **Suricata**: Network-level threat detection
4. **Wazuh**: Centralized logging and analysis
5. **RocketRAM**: Unified interface for all tools

---

## ⚙️ Configuration Best Practices

### 1. Update Definitions Regularly

- **ClamAV**: Run `freshclam` daily
- **YARA**: Update rule repositories regularly
- **Suricata**: Run `suricata-update` weekly

### 2. Resource Management

- Schedule full scans during off-hours
- Use quick scans for regular monitoring
- Configure osquery queries to be lightweight
- Monitor Suricata performance impact

### 3. Alert Tuning

- Configure thresholds appropriately
- Reduce false positives by tuning rules
- Set up email/notification for critical alerts
- Review logs regularly

### 4. Security

- Keep all tools updated
- Use secure communication (HTTPS) for Wazuh
- Restrict access to security tools
- Regularly audit security configurations

---

## 🚀 Getting Started

1. **Install Tools**: Start with ClamAV for basic antivirus protection
2. **Configure RocketRAM**: Enable security tools in Settings > Security & Protection
3. **Test Installation**: Use "Check Installation" buttons to verify
4. **Run Initial Scan**: Perform a quick scan to test functionality
5. **Set Up Monitoring**: Enable real-time monitoring for active protection
6. **Configure Wazuh**: (Optional) Set up Wazuh for centralized monitoring

---

## 📚 Additional Resources

- **ClamAV**: https://www.clamav.net/documentation
- **YARA**: https://yara.readthedocs.io/
- **osquery**: https://osquery.readthedocs.io/
- **Suricata**: https://suricata.readthedocs.io/
- **Wazuh**: https://documentation.wazuh.com/

---

## ⚠️ Important Notes

1. **Administrative Rights**: Some tools require admin/root privileges
2. **Performance Impact**: Security scanning can impact system performance
3. **False Positives**: Some detections may be false positives - review carefully
4. **Updates**: Keep all security tools updated for latest threat signatures
5. **Backups**: Always maintain backups before making security changes

---

## 🆘 Troubleshooting

### ClamAV not found
- Verify PATH includes ClamAV installation directory
- Restart terminal/application after installation
- Check installation with `clamscan --version`

### YARA rules not working
- Verify rule files exist and are valid
- Check YARA syntax with `yara --test`
- Ensure rule files are readable

### osquery queries fail
- Verify osquery is running: `osqueryi --version`
- Check query syntax matches your osquery version
- Some queries require root/admin privileges

### Suricata not starting
- Check configuration file syntax
- Verify network interface exists
- Check permissions on log directories

### Wazuh connection fails
- Verify Wazuh Manager is running
- Check firewall settings (port 55000)
- Verify API credentials are correct
- Test with curl: `curl -k -u user:pass https://manager:55000/`


