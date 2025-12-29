# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of RocketRAM seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue
- Discuss the vulnerability publicly
- Share details until we've addressed it

### Please DO:

1. **Email us directly** at contact@mellowsites.com
2. **Include the following information:**
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - The location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue, including how an attacker might exploit the issue
   - Your contact information

### What to Expect:

- **Initial Response:** We'll acknowledge receipt within 48 hours
- **Status Update:** We'll provide a status update within 7 days
- **Resolution:** We'll work to resolve critical issues as quickly as possible

### Disclosure Policy

- We will work with you to understand and resolve the issue quickly
- We will notify you when the vulnerability is fixed
- We will credit you for the discovery (unless you prefer to remain anonymous)
- We will publish a security advisory after the fix is released

## Security Best Practices for Users

### System Access

- **Administrative Privileges:** Only grant administrative/root privileges if you trust the source of the software
- **Download Sources:** Only download RocketRAM from official sources
- **Code Signing:** Verify code signatures when available
- **Updates:** Keep RocketRAM updated to the latest version

### Data Safety

- **Backups:** Always maintain backups before using optimization features
- **File Deletion:** Review what files will be deleted before running cleanup
- **Process Termination:** Understand what processes will be terminated before optimization

### Network Security

- **Firewall:** RocketRAM does not require internet access for core functionality
- **Updates:** Only enable automatic updates if you trust the update mechanism
- **Network Monitoring:** Be aware that network monitoring features require network access

## Known Security Considerations

### Local System Access

RocketRAM requires access to system information and APIs to function. This includes:

- Process enumeration and termination
- File system access (for cleanup operations)
- System service management
- Registry access (Windows)
- System settings modification

**These operations are performed locally only and do not transmit data externally.**

### Code Execution

RocketRAM may execute system commands for:
- Cleaning operations
- Optimization tasks
- Service management

**All command execution is local and based on user-initiated actions.**

### Data Storage

RocketRAM stores settings locally in:
- Windows: `%APPDATA%\rocketram\`
- macOS: `~/Library/Application Support/rocketram/`
- Linux: `~/.config/rocketram/`

**No sensitive data is stored. Settings are plain JSON files.**

## Security Features

### Privacy by Design

- No data collection
- No external data transmission
- All processing is local
- No analytics or tracking

### Code Integrity

- Code signing (when certificates are available)
- Electron security best practices
- Regular dependency updates
- Security-focused architecture

### User Control

- User-initiated actions only
- Confirmation dialogs for destructive operations
- Transparent operation
- User-configurable settings

## Reporting Security Issues

If you discover a security vulnerability, please send an email to **contact@mellowsites.com** instead of using the issue tracker.

Thank you for helping keep RocketRAM and its users safe!


