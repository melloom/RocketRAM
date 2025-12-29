const { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage, Notification } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow;
let tray;
let isCollapsed = false;
let scheduleInterval = null;
const SETTINGS_FILE = path.join(app.getPath('userData'), 'rocketram-settings.json');

const EXPANDED_HEIGHT = 520;
const COLLAPSED_HEIGHT = 60;
const WINDOW_WIDTH = 340;

// Create a simple tray icon programmatically
function createTrayIcon() {
  // Create a 16x16 icon with a simple design
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const centerX = size / 2;
      const centerY = size / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (dist < 6) {
        // Cyan/teal color
        canvas[idx] = 6;      // R
        canvas[idx + 1] = 182; // G
        canvas[idx + 2] = 212; // B
        canvas[idx + 3] = dist < 5 ? 255 : 128; // A
      } else {
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  
  // Try to load platform-specific icon file
  let iconPath = null;
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: prefer .ico files
    const windowsIconPaths = [
      path.join(__dirname, 'icon.ico'),
      path.join(__dirname, 'icon-windows.ico'),
      path.join(__dirname, 'assets', 'icon.ico'),
      path.join(__dirname, 'assets', 'icon-windows.ico'),
      path.join(__dirname, 'icon.png'), // fallback
      path.join(__dirname, 'assets', 'icon.png')
    ];
    
    for (const iconPathToTry of windowsIconPaths) {
      if (fs.existsSync(iconPathToTry)) {
        iconPath = iconPathToTry;
        break;
      }
    }
  } else if (platform === 'darwin') {
    // macOS: prefer .icns files
    const macIconPaths = [
      path.join(__dirname, 'icon.icns'),
      path.join(__dirname, 'icon-mac.icns'),
      path.join(__dirname, 'assets', 'icon.icns'),
      path.join(__dirname, 'assets', 'icon-mac.icns'),
      path.join(__dirname, 'icon.png'), // fallback
      path.join(__dirname, 'assets', 'icon.png')
    ];
    
    for (const iconPathToTry of macIconPaths) {
      if (fs.existsSync(iconPathToTry)) {
        iconPath = iconPathToTry;
        break;
      }
    }
  } else {
    // Linux: use PNG
    const linuxIconPaths = [
      path.join(__dirname, 'icon.png'),
      path.join(__dirname, 'icon-linux.png'),
      path.join(__dirname, 'assets', 'icon.png'),
      path.join(__dirname, 'assets', 'icon-linux.png')
    ];
    
    for (const iconPathToTry of linuxIconPaths) {
      if (fs.existsSync(iconPathToTry)) {
        iconPath = iconPathToTry;
        break;
      }
    }
  }
  
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: EXPANDED_HEIGHT,
    x: screenWidth - WINDOW_WIDTH - 20,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    icon: iconPath || undefined,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // Prevent window from closing, hide instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // Try to load platform-specific icon file for tray
  let icon = null;
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows: prefer .ico files
    const windowsIconPaths = [
      path.join(__dirname, 'icon.ico'),
      path.join(__dirname, 'icon-windows.ico'),
      path.join(__dirname, 'assets', 'icon.ico'),
      path.join(__dirname, 'assets', 'icon-windows.ico'),
      path.join(__dirname, 'icon.png'),
      path.join(__dirname, 'assets', 'icon.png')
    ];
    
    for (const iconPath of windowsIconPaths) {
      if (fs.existsSync(iconPath)) {
        try {
          icon = nativeImage.createFromPath(iconPath);
          // Resize to 16x16 for tray
          icon = icon.resize({ width: 16, height: 16 });
          break;
        } catch (e) {
          console.error('Error loading icon:', e);
        }
      }
    }
  } else if (platform === 'darwin') {
    // macOS: prefer .icns files
    const macIconPaths = [
      path.join(__dirname, 'icon.icns'),
      path.join(__dirname, 'icon-mac.icns'),
      path.join(__dirname, 'assets', 'icon.icns'),
      path.join(__dirname, 'assets', 'icon-mac.icns'),
      path.join(__dirname, 'icon.png'),
      path.join(__dirname, 'assets', 'icon.png')
    ];
    
    for (const iconPath of macIconPaths) {
      if (fs.existsSync(iconPath)) {
        try {
          icon = nativeImage.createFromPath(iconPath);
          // Resize to 16x16 for tray
          icon = icon.resize({ width: 16, height: 16 });
          break;
        } catch (e) {
          console.error('Error loading icon:', e);
        }
      }
    }
  } else {
    // Linux: use PNG
    const linuxIconPaths = [
      path.join(__dirname, 'icon.png'),
      path.join(__dirname, 'icon-linux.png'),
      path.join(__dirname, 'assets', 'icon.png'),
      path.join(__dirname, 'assets', 'icon-linux.png')
    ];
    
    for (const iconPath of linuxIconPaths) {
      if (fs.existsSync(iconPath)) {
        try {
          icon = nativeImage.createFromPath(iconPath);
          icon = icon.resize({ width: 16, height: 16 });
          break;
        } catch (e) {
          console.error('Error loading icon:', e);
        }
      }
    }
  }
  
  // Fallback to programmatic icon if file not found
  if (!icon) {
    icon = createTrayIcon();
  }
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Widget', 
      click: () => {
        mainWindow.setAlwaysOnTop(true);
        mainWindow.show();
      }
    },
    { 
      label: 'Always on Top', 
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('RocketRAM');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      // Restore always-on-top when showing from tray
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
    }
  });
}

// This is now handled in the settings section above

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.on('toggle-collapse', () => {
  isCollapsed = !isCollapsed;
  const newHeight = isCollapsed ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
  mainWindow.setSize(WINDOW_WIDTH, newHeight, true);
});

ipcMain.on('close-app', () => {
  mainWindow.hide();
});

ipcMain.on('minimize-app', () => {
  // Temporarily disable always-on-top to allow proper minimizing
  const wasAlwaysOnTop = mainWindow.isAlwaysOnTop();
  if (wasAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(false);
  }
  mainWindow.minimize();
  // Restore always-on-top after a short delay
  if (wasAlwaysOnTop) {
    setTimeout(() => {
      if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.setAlwaysOnTop(true);
      }
    }, 100);
  }
});

// Kill process handler
ipcMain.on('kill-process', (event, pid) => {
  if (!pid || isNaN(pid)) {
    console.error('Invalid PID:', pid);
    return;
  }
  
  try {
    if (process.platform === 'win32') {
      // Windows: use taskkill
      exec(`taskkill /F /PID ${pid}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error killing process ${pid}:`, error.message);
          // Send error back to renderer if needed
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('process-kill-result', {
              success: false,
              pid: pid,
              error: error.message
            });
          }
        } else {
          console.log(`Process ${pid} killed successfully`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('process-kill-result', {
              success: true,
              pid: pid
            });
          }
        }
      });
    } else {
      // Linux/Mac: use kill command
      exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error killing process ${pid}:`, error.message);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('process-kill-result', {
              success: false,
              pid: pid,
              error: error.message
            });
          }
        } else {
          console.log(`Process ${pid} killed successfully`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('process-kill-result', {
              success: true,
              pid: pid
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Exception killing process:', error);
  }
});

// Settings handlers
ipcMain.on('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
});

ipcMain.on('load-settings', (event) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      event.reply('settings-loaded', settings);
    } else {
      event.reply('settings-loaded', null);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    event.reply('settings-loaded', null);
  }
});

ipcMain.on('set-always-on-top', (event, enabled) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(enabled);
  }
});

ipcMain.on('set-auto-startup', (event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: app.getPath('exe')
  });
});

// Schedule handlers
ipcMain.on('enable-schedule', (event, schedule) => {
  setupSchedule(schedule);
});

ipcMain.on('disable-schedule', () => {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
  }
});

ipcMain.on('update-schedule', (event, schedule) => {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
  }
  setupSchedule(schedule);
});

function setupSchedule(schedule) {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
  }
  
  const { frequency, time } = schedule;
  const [hours, minutes] = time.split(':').map(Number);
  
  function runScheduledCleanup() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('run-scheduled-cleanup');
    }
  }
  
  function calculateNextRun() {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (frequency === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + 7);
    } else if (frequency === 'monthly') {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
    
    return nextRun;
  }
  
  function checkAndRun() {
    const now = new Date();
    const nextRun = calculateNextRun();
    
    if (now >= nextRun) {
      runScheduledCleanup();
      // Schedule next run
      const interval = frequency === 'daily' ? 24 * 60 * 60 * 1000 :
                       frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
                       30 * 24 * 60 * 60 * 1000;
      scheduleInterval = setTimeout(() => {
        checkAndRun();
        scheduleInterval = setInterval(checkAndRun, interval);
      }, interval);
    }
  }
  
  // Check every minute
  scheduleInterval = setInterval(checkAndRun, 60 * 1000);
  checkAndRun();
}

// Notification handler
ipcMain.on('show-notification', (event, title, body) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title,
      body: body,
      icon: createTrayIcon()
    }).show();
  }
});

// Export report handler
const { dialog } = require('electron');

ipcMain.on('export-report', async (event, data) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: `Export ${data.type === 'cleanup' ? 'Cleanup' : 'System'} Report`,
      defaultPath: `${data.defaultName}.json`,
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: 'CSV', extensions: ['csv'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      const content = result.filePath.endsWith('.csv') ? data.csv : data.json;
      fs.writeFileSync(result.filePath, content);
      
      if (Notification.isSupported()) {
        new Notification({
          title: 'Export Complete',
          body: 'Report exported successfully!',
          icon: createTrayIcon()
        }).show();
      }
    }
  } catch (error) {
    console.error('Export error:', error);
  }
});

// Load settings on startup
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Load and apply settings
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (settings.schedule && settings.schedule.enabled) {
        setupSchedule(settings.schedule);
      }
      if (settings.advanced) {
        if (settings.advanced.alwaysOnTop !== false) {
          mainWindow.setAlwaysOnTop(true);
        }
        if (settings.advanced.autoStartup !== false) {
          app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
          });
        }
      }
    }
  } catch (error) {
    console.error('Error loading settings on startup:', error);
  }
});

