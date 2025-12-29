# 🚀 RocketRAM

<div align="center">

**A powerful desktop widget for real-time system monitoring, process management, and PC optimization**

[![Electron](https://img.shields.io/badge/Electron-28.0-blue.svg)](https://www.electronjs.org/)
[![Node](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Widget Preview](https://img.shields.io/badge/Status-Production%20Ready-success)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Settings & Configuration](#-settings--configuration)
- [System Requirements](#-system-requirements)
- [Troubleshooting](#-troubleshooting)
- [Technical Details](#-technical-details)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

RocketRAM is a modern, feature-rich desktop application that provides real-time system monitoring, advanced process management, and comprehensive PC optimization tools. Built with Electron and designed with a sleek cyberpunk-inspired UI, it's like having a supercharged Task Manager that's always at your fingertips.

### Why RocketRAM?

- **🎨 Beautiful UI** - Dark theme with neon accents and smooth animations
- **⚡ Real-time Monitoring** - Live CPU, RAM, Disk, and Network stats
- **🔧 Process Management** - View, search, and terminate processes with ease
- **🧹 Smart Cleaning** - Remove junk files and free up disk space
- **⚙️ System Optimization** - Optimize startup, services, and disk performance
- **📅 Auto-Scheduling** - Set up automatic daily/weekly/monthly cleanups
- **💯 Health Scoring** - Get system health score with actionable recommendations
- **🔔 Notifications** - Stay informed about cleaning and optimization tasks

---

## ✨ Features

### 📊 Real-Time System Monitoring

- **CPU Monitoring**
  - Live CPU usage percentage
  - Current CPU speed (GHz)
  - CPU temperature (when available)
  - Processor name and details
  - Visual progress bar with glow effects

- **Memory (RAM) Monitoring**
  - Real-time memory usage percentage
  - Used/Total memory in GB
  - Available memory
  - Cached memory
  - Color-coded progress indicators

- **Disk Monitoring**
  - Disk usage percentage
  - Used/Total disk space
  - Read/Write speeds (MB/s)
  - I/O performance tracking

- **Network Monitoring**
  - Download/Upload speeds
  - Active network interface
  - Connection status
  - Real-time bandwidth usage

- **System Uptime**
  - Days, hours, minutes, seconds
  - Formatted display

### 🖱️ Process Management

- **Clickable Metric Cards**
  - Click any metric (CPU, RAM, Disk, Network) to view related processes
  - Processes sorted by usage (highest first)
  - Top 100 processes displayed

- **Process List Features**
  - Process name and PID
  - CPU and Memory usage per process
  - High-usage process highlighting
  - Search functionality
  - Real-time updates (every 3 seconds)

- **Process Actions**
  - End individual processes
  - Optimize button to close high-usage processes
  - Confirmation dialogs for safety
  - Auto-refresh after process termination

### 🧹 Advanced Cleaning System

- **Scan for Junk**
  - Pre-scan to calculate disk space that can be freed
  - Shows total junk file size before cleaning
  - Helps you decide if cleaning is needed

- **Cleaning Options**
  - ✅ **Temp Files** - Windows temp folders and user temp files
  - ✅ **Browser Cache** - Chrome, Edge, Firefox cache files
  - ✅ **Recycle Bin** - Empty recycle bin
  - ✅ **System Logs** - Windows event logs
  - ✅ **Prefetch Files** - Windows prefetch cache
  - ✅ **Thumbnail Cache** - Windows thumbnail cache
  - ✅ **DNS Cache** - Flush DNS resolver cache
  - ✅ **Font Cache** - Windows font cache files
  - ✅ **Windows Update Cache** - Old Windows update files
  - ✅ **Browser History** - Clear browsing history

- **Cleaning Features**
  - Real-time progress tracking
  - Space freed calculation
  - Files cleaned count
  - Detailed cleaning log
  - Success/error notifications

### ⚙️ System Optimization

- **Optimization Options**
  - ✅ **Startup Optimization** - Analyze and manage startup programs
  - ✅ **Services Optimization** - Check and optimize Windows services
  - ✅ **Registry Cleanup** - Clean invalid registry entries (via Disk Cleanup)
  - ✅ **Disk Optimization** - SSD trim or HDD defragmentation
  - ✅ **Memory Optimization** - Clear standby memory

- **Optimization Features**
  - Progress tracking
  - Detailed optimization logs
  - Automatic system health update after optimization
  - Notification on completion

### 💯 System Health Score

- **Health Scoring System**
  - Visual circular progress indicator (0-100)
  - Color-coded: Green (80+), Yellow (60-79), Red (<60)
  - Real-time health calculation

- **Smart Recommendations**
  - CPU usage analysis
  - Memory usage warnings
  - Disk space alerts
  - Process count optimization suggestions
  - Actionable recommendations with icons

### 📅 Automatic Scheduling

- **Schedule Options**
  - Daily, Weekly, or Monthly cleaning
  - Custom time selection
  - Next run time display
  - Background operation

- **Schedule Features**
  - Uses saved cleaning preferences
  - Runs automatically in background
  - Notification on completion
  - Persistent settings

### ⚙️ Advanced Settings

- **App Behavior**
  - Start with Windows
  - Always on Top toggle
  - Minimize to Tray
  - Show Notifications

- **Settings Persistence**
  - All settings saved automatically
  - Restored on app restart
  - JSON-based configuration

### 🎨 User Interface

- **Modern Design**
  - Dark cyberpunk theme
  - Neon accent colors
  - Smooth animations and transitions
  - Glassmorphism effects
  - Custom fonts (Orbitron, JetBrains Mono)

- **Widget Features**
  - Collapsible design (minimize to title bar)
  - Draggable window
  - Always-on-top option
  - System tray integration
  - Minimize to taskbar

---

## 📸 Screenshots

### Main Widget
- **Expanded View**: Shows all system metrics with real-time updates
- **Collapsed View**: Minimal title bar only view
- **Metric Cards**: Click any card to view related processes

### Process Management
- **Process List**: Sorted by usage with search functionality
- **Process Details**: CPU, Memory, PID for each process
- **Optimize Button**: Quick cleanup of high-usage processes

### Settings Panel
- **Cleaning Tab**: Select what to clean, scan, and run cleanup
- **Optimization Tab**: System health score and optimization options
- **Schedule Tab**: Set up automatic cleaning
- **Advanced Tab**: App behavior settings

---

## 📦 Installation

### Prerequisites

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Windows 10/11** (primary platform)

### Step 1: Clone or Download

```bash
# If you have the project folder, navigate to it
cd "C:\Users\YourName\Desktop\pc performance"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Electron (desktop framework)
- systeminformation (system monitoring)
- All required dependencies

### Step 3: Run the Application

```bash
npm start
```

The widget will appear in the top-right corner of your screen!

---

## 🚀 Quick Start

1. **Launch the App**
   ```bash
   npm start
   ```

2. **View System Metrics**
   - The widget shows CPU, RAM, Disk, and Network stats
   - All metrics update in real-time

3. **View Processes**
   - Click any metric card (CPU, RAM, etc.)
   - See all related processes sorted by usage
   - Search for specific processes

4. **Clean Your PC**
   - Click the ⚙️ Settings button
   - Go to "Cleaning" tab
   - Click "Scan for Junk" to see how much space can be freed
   - Click "Run Cleanup Now" to clean

5. **Optimize System**
   - Go to "Optimization" tab
   - Check your system health score
   - Click "Run Full Optimization"

6. **Set Up Auto-Cleaning**
   - Go to "Schedule" tab
   - Enable automatic cleaning
   - Choose frequency (Daily/Weekly/Monthly)
   - Set time

---

## 📖 Usage Guide

### Main Widget Controls

| Button | Function |
|--------|----------|
| ⚙️ | Open Settings panel |
| ➖ | Minimize to taskbar |
| − | Collapse to title bar only |
| ✕ | Hide to system tray |

### Viewing Processes

1. **Click any metric card** (CPU, RAM, Disk, Network)
2. **Process panel opens** showing related processes
3. **Search** for specific processes using the search box
4. **End process** by clicking the ✕ button
5. **Optimize** by clicking "Optimize" to close high-usage processes

### Cleaning Your PC

#### Quick Clean
1. Open Settings (⚙️ button)
2. Go to "Cleaning" tab
3. Click "Run Cleanup Now"
4. Watch progress and see results

#### Scan First (Recommended)
1. Open Settings → "Cleaning" tab
2. Click "Scan for Junk"
3. See how much space can be freed
4. Then click "Run Cleanup Now"

#### Custom Cleaning
1. Open Settings → "Cleaning" tab
2. Check/uncheck cleaning options
3. Click "Run Cleanup Now"
4. View detailed cleaning log

### System Optimization

1. Open Settings → "Optimization" tab
2. View your **System Health Score**
3. Read **recommendations** for improvement
4. Select optimization options
5. Click "Run Full Optimization"
6. View optimization logs

### Scheduling Automatic Cleaning

1. Open Settings → "Schedule" tab
2. Enable "Automatic Cleaning"
3. Select frequency:
   - **Daily** - Every day at specified time
   - **Weekly** - Once per week
   - **Monthly** - Once per month
4. Set time (e.g., 2:00 AM)
5. View "Next Run" time
6. Cleaning runs automatically in background

### Advanced Settings

1. Open Settings → "Advanced" tab
2. Configure:
   - **Start with Windows** - Auto-launch on boot
   - **Always on Top** - Keep widget above other windows
   - **Minimize to Tray** - Hide to system tray when minimized
   - **Show Notifications** - Get alerts when tasks complete

---

## ⚙️ Settings & Configuration

### Settings File Location

Settings are saved to:
```
%APPDATA%\rocketram\rocketram-settings.json
```

### Settings Structure

```json
{
  "cleaning": {
    "tempFiles": true,
    "cache": true,
    "recycleBin": true,
    "logs": true,
    "prefetch": true,
    "thumbnails": true,
    "dnsCache": true,
    "fontCache": true,
    "windowsUpdate": true,
    "browserHistory": false
  },
  "optimization": {
    "startup": true,
    "services": true,
    "registry": true,
    "disk": true,
    "memory": true
  },
  "schedule": {
    "enabled": true,
    "frequency": "daily",
    "time": "02:00"
  },
  "advanced": {
    "autoStartup": true,
    "alwaysOnTop": true,
    "minimizeToTray": false,
    "showNotifications": true
  }
}
```

---

## 💻 System Requirements

### Minimum Requirements

- **OS**: Windows 10 (64-bit) or Windows 11
- **RAM**: 2 GB
- **Disk Space**: 200 MB
- **Node.js**: v16.0.0 or higher

### Recommended Requirements

- **OS**: Windows 11
- **RAM**: 4 GB or more
- **Disk Space**: 500 MB
- **Node.js**: v18.0.0 or higher

### Permissions

Some features may require:
- **Administrator rights** for:
  - Registry cleanup
  - Service optimization
  - Disk defragmentation

---

## 🔧 Troubleshooting

### App Won't Start

**Problem**: App doesn't launch after `npm start`

**Solutions**:
1. Check Node.js version: `node --version` (should be v16+)
2. Reinstall dependencies: `npm install`
3. Check for error messages in terminal
4. Try: `npm cache clean --force` then `npm install`

### Widget Not Showing

**Problem**: Widget doesn't appear on screen

**Solutions**:
1. Check system tray for the app icon
2. Click the tray icon to show widget
3. Check if widget is minimized
4. Restart the app

### Cleaning Not Working

**Problem**: Cleanup doesn't free space or shows errors

**Solutions**:
1. Run as Administrator (right-click → Run as administrator)
2. Check if files are in use (close other programs)
3. Some cleaning options require admin rights
4. Check Windows permissions

### High CPU Usage

**Problem**: Widget itself uses too much CPU

**Solutions**:
1. Reduce update frequency (currently 1 second)
2. Close process panel when not needed
3. Collapse widget when not in use
4. Check for background processes

### Settings Not Saving

**Problem**: Settings reset after restart

**Solutions**:
1. Check write permissions in `%APPDATA%`
2. Manually save settings file
3. Check disk space
4. Restart app after changing settings

### Process Termination Fails

**Problem**: Can't end certain processes

**Solutions**:
1. Some processes are protected by Windows
2. Run app as Administrator
3. System processes cannot be terminated
4. Check if process is critical

---

## 🔬 Technical Details

### Architecture

- **Framework**: Electron 28.0
- **Main Process**: Node.js with system APIs
- **Renderer Process**: HTML/CSS/JavaScript
- **System Info**: systeminformation library
- **Process Management**: Windows taskkill command

### Key Technologies

- **Electron** - Desktop application framework
- **systeminformation** - System monitoring library
- **Node.js** - Runtime environment
- **PowerShell** - Windows command execution
- **Native APIs** - Windows system calls

### File Structure

```
pc performance/
├── main.js              # Electron main process
├── renderer.js          # Renderer process logic
├── index.html           # UI structure
├── styles.css           # Styling
├── package.json         # Dependencies
└── README.md           # This file
```

### Performance

- **Memory Usage**: ~50-100 MB
- **CPU Usage**: <1% (idle), 2-5% (active monitoring)
- **Update Frequency**: 1 second (metrics), 3 seconds (processes)
- **Startup Time**: <2 seconds

### Security

- **No Data Collection**: All processing is local
- **No Internet Required**: Works completely offline
- **Safe Cleaning**: Only removes safe, non-critical files
- **Process Confirmation**: Asks before terminating processes

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Setup

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Code Style

- Use ES6+ JavaScript
- Follow existing code structure
- Add comments for complex logic
- Test on Windows 10/11

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Electron** - For the amazing desktop framework
- **systeminformation** - For comprehensive system monitoring
- **Orbitron & JetBrains Mono** - For beautiful fonts
- **All Contributors** - For making this project better

---

## 📞 Support

Having issues or questions?

1. **Check Troubleshooting** section above
2. **Review** the Usage Guide
3. **Open an Issue** on GitHub
4. **Check** existing issues for solutions

---

## 🎯 Roadmap

### Planned Features

- [ ] GPU monitoring
- [ ] Battery monitoring (laptops)
- [ ] Network connection details
- [ ] Export cleaning reports
- [ ] Custom themes
- [ ] Multi-monitor support
- [ ] Process priority management
- [ ] Startup program editor
- [ ] Service manager UI
- [ ] Disk health monitoring

### Version History

- **v1.0.0** - Initial release
  - Real-time system monitoring
  - Process management
  - Cleaning and optimization
  - Scheduling system
  - System health scoring

---

<div align="center">

**Made with ❤️ for Windows users**

⭐ **Star this repo if you find it useful!** ⭐

</div>
