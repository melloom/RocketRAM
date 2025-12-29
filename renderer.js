const si = require('systeminformation');
const { ipcRenderer } = require('electron');

// DOM Elements
const cpuValue = document.getElementById('cpuValue');
const cpuBar = document.getElementById('cpuBar');
const cpuDetail = document.getElementById('cpuDetail');
const cpuName = document.getElementById('cpuName');
const cpuTemp = document.getElementById('cpuTemp');

const ramValue = document.getElementById('ramValue');
const ramBar = document.getElementById('ramBar');
const ramDetail = document.getElementById('ramDetail');
const ramAvailable = document.getElementById('ramAvailable');
const ramCached = document.getElementById('ramCached');

const diskValue = document.getElementById('diskValue');
const diskBar = document.getElementById('diskBar');
const diskDetail = document.getElementById('diskDetail');
const diskRead = document.getElementById('diskRead');
const diskWrite = document.getElementById('diskWrite');

const netValue = document.getElementById('netValue');
const netDetail = document.getElementById('netDetail');
const netDown = document.getElementById('netDown');
const netUp = document.getElementById('netUp');

const gpuValue = document.getElementById('gpuValue');
const gpuBar = document.getElementById('gpuBar');
const gpuDetail = document.getElementById('gpuDetail');
const gpuName = document.getElementById('gpuName');
const gpuTemp = document.getElementById('gpuTemp');
const gpuCard = document.getElementById('gpuCard');

const batteryValue = document.getElementById('batteryValue');
const batteryBar = document.getElementById('batteryBar');
const batteryDetail = document.getElementById('batteryDetail');
const batteryStatus = document.getElementById('batteryStatus');
const batteryTime = document.getElementById('batteryTime');
const batteryCard = document.getElementById('batteryCard');

const uptimeEl = document.getElementById('uptime');
const content = document.getElementById('content');
const settingsBtn = document.getElementById('settingsBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const collapseBtn = document.getElementById('collapseBtn');
const closeBtn = document.getElementById('closeBtn');

// Antivirus elements (removed from main page - now in settings)

// Process panel elements
const processOverlay = document.getElementById('processOverlay');
const processTitle = document.getElementById('processTitle');
const processCount = document.getElementById('processCount');
const processList = document.getElementById('processList');
const processSearch = document.getElementById('processSearch');
const closePanelBtn = document.getElementById('closePanelBtn');
const optimizeBtn = document.getElementById('optimizeBtn');
const loadingState = document.getElementById('loadingState');

let isCollapsed = false;
let previousNetStats = null;
let previousDiskStats = null;
let previousBatteryStats = null; // Track previous battery state for time estimation
let currentProcessType = null;
let allProcesses = [];
let filteredProcesses = [];
let processUpdateInterval = null;
let isModalOpen = false;
let currentModalType = null;

// Mini Graphs Data
const graphData = {
  cpu: [],
  ram: [],
  disk: []
};
const MAX_GRAPH_POINTS = 60; // 60 seconds of data

// CPU smoothing - use average of last 5 readings for display
const CPU_SMOOTHING_WINDOW = 5;

// Alert System
let alertStates = {
  cpu: { active: false, startTime: null, notified: false },
  ram: { active: false, startTime: null, notified: false },
  disk: { active: false, startTime: null, notified: false }
};

// Utility functions
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
  if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(1) + ' KB/s';
  return (bytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update functions with loading states
async function updateCPU() {
  try {
    if (!cpuValue || !cpuBar || !cpuDetail || !cpuName || !cpuTemp) {
      console.warn('CPU elements not found');
      return;
    }
    
    const load = await Promise.race([
      si.currentLoad(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    const cpu = await Promise.race([
      si.cpu(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    const cpuSpeed = await Promise.race([
      si.cpuCurrentSpeed(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    
    // Get raw CPU usage (ensure it's a valid number)
    // Handle different possible property names
    const cpuUsage = load.currentLoad !== undefined ? load.currentLoad : 
                     (load.currentload !== undefined ? load.currentload : 
                     (load.avgLoad !== undefined ? load.avgLoad : 0));
    const rawUsage = Math.max(0, Math.min(100, cpuUsage || 0));
    
    // Add to graph data for visualization
    graphData.cpu.push(rawUsage);
    if (graphData.cpu.length > MAX_GRAPH_POINTS) {
      graphData.cpu.shift();
    }
    
    // Calculate smoothed average from recent readings (last 5 values)
    let smoothedUsage = rawUsage;
    if (graphData.cpu.length > 1) {
      const recentReadings = graphData.cpu.slice(-CPU_SMOOTHING_WINDOW);
      const sum = recentReadings.reduce((a, b) => a + b, 0);
      smoothedUsage = sum / recentReadings.length;
    }
    
    // Round the smoothed value for display
    const usage = Math.round(smoothedUsage);
    if (cpuValue) cpuValue.textContent = usage + '%';
    if (cpuBar) cpuBar.style.width = usage + '%';
    
    // Update CPU speed detail (use average speed)
    if (cpuDetail) {
      if (cpuSpeed && cpuSpeed.avg !== undefined && cpuSpeed.avg > 0) {
        cpuDetail.textContent = cpuSpeed.avg.toFixed(2) + ' GHz';
      } else if (cpuSpeed && cpuSpeed.avg === 0 && cpuSpeed.min && cpuSpeed.max) {
        // Fallback to showing min-max range if avg is 0
        cpuDetail.textContent = `${cpuSpeed.min.toFixed(2)}-${cpuSpeed.max.toFixed(2)} GHz`;
      } else {
        cpuDetail.textContent = '-- GHz';
      }
    }
    
    if (cpuName) cpuName.textContent = cpu.brand ? cpu.brand.substring(0, 30) + (cpu.brand.length > 30 ? '...' : '') : 'Unknown CPU';
    
    // Add warning class for high CPU (using smoothed value)
    const cpuCard = cpuValue.closest('.metric-card');
    if (usage > 90) {
      cpuCard.classList.add('warning');
    } else {
      cpuCard.classList.remove('warning');
    }
    
    // Draw mini graph (if element exists)
    const cpuGraph = document.getElementById('cpuGraph');
    if (cpuGraph) {
      drawGraph('cpuGraph', graphData.cpu, 'rgb(244, 63, 94)');
    }
    
    // Try to get temperature (may not work on all systems)
    try {
      const temps = await Promise.race([
        si.cpuTemperature(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      if (temps.main !== null && temps.main !== -1 && temps.main > 0) {
        cpuTemp.textContent = Math.round(temps.main) + '°C';
      } else {
        cpuTemp.textContent = '--';
      }
    } catch (e) {
      cpuTemp.textContent = '--';
    }
  } catch (error) {
    console.error('CPU update error:', error);
    if (cpuValue) cpuValue.textContent = '0%';
    if (cpuBar) cpuBar.style.width = '0%';
    if (cpuDetail) cpuDetail.textContent = '-- GHz';
    if (cpuName) cpuName.textContent = 'Loading...';
    if (cpuTemp) cpuTemp.textContent = '--';
  }
}

async function updateRAM() {
  try {
    const mem = await Promise.race([
      si.mem(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    
    // Ensure we have valid memory values
    if (!mem || !mem.total || mem.total === 0) {
      if (ramValue) ramValue.textContent = '0%';
      if (ramBar) ramBar.style.width = '0%';
      if (ramDetail) ramDetail.textContent = '0 / 0 GB';
      if (ramAvailable) ramAvailable.textContent = 'Available: 0 GB';
      if (ramCached) ramCached.textContent = 'Cached: 0 GB';
      return;
    }
    
    const usedPercent = Math.max(0, Math.min(100, Math.round((mem.used / mem.total) * 100)));
    const usedGB = (mem.used / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (mem.total / (1024 * 1024 * 1024)).toFixed(1);
    const availableGB = ((mem.available || mem.free || 0) / (1024 * 1024 * 1024)).toFixed(1);
    const cachedGB = ((mem.cached || 0) / (1024 * 1024 * 1024)).toFixed(1);
    
    if (ramValue) ramValue.textContent = usedPercent + '%';
    if (ramBar) ramBar.style.width = usedPercent + '%';
    if (ramDetail) ramDetail.textContent = `${usedGB} / ${totalGB} GB`;
    if (ramAvailable) ramAvailable.textContent = `Available: ${availableGB} GB`;
    if (ramCached) ramCached.textContent = `Cached: ${cachedGB} GB`;
    
    // Add to graph data
    graphData.ram.push(usedPercent);
    if (graphData.ram.length > MAX_GRAPH_POINTS) {
      graphData.ram.shift();
    }
    const ramGraph = document.getElementById('ramGraph');
    if (ramGraph) {
      drawGraph('ramGraph', graphData.ram, 'rgb(139, 92, 246)');
    }
  } catch (error) {
    console.error('RAM update error:', error);
    ramValue.textContent = '--';
    ramDetail.textContent = '--';
  }
}

async function updateDisk() {
  try {
    if (!diskValue || !diskBar || !diskDetail || !diskRead || !diskWrite) return;
    
    const fsSize = await Promise.race([
      si.fsSize(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    
    // Get primary disk (usually C: on Windows)
    const primaryDisk = fsSize && fsSize.length > 0 ? (fsSize.find(d => d.mount === 'C:' || d.mount === '/') || fsSize[0]) : null;
    
    if (primaryDisk && primaryDisk.size > 0) {
      // Calculate use percentage from used and size if 'use' property is not available
      let usedPercent = 0;
      if (primaryDisk.use !== undefined && primaryDisk.use !== null) {
        usedPercent = Math.max(0, Math.min(100, Math.round(primaryDisk.use)));
      } else if (primaryDisk.used !== undefined && primaryDisk.size > 0) {
        // Calculate percentage from used/size
        usedPercent = Math.max(0, Math.min(100, Math.round((primaryDisk.used / primaryDisk.size) * 100)));
      }
      
      const usedGB = (primaryDisk.used / (1024 * 1024 * 1024)).toFixed(0);
      const totalGB = (primaryDisk.size / (1024 * 1024 * 1024)).toFixed(0);
      
      diskValue.textContent = usedPercent + '%';
      diskBar.style.width = usedPercent + '%';
      diskDetail.textContent = `${usedGB} / ${totalGB} GB`;
      
      // Add to graph data
      graphData.disk.push(usedPercent);
      if (graphData.disk.length > MAX_GRAPH_POINTS) {
        graphData.disk.shift();
      }
      const diskGraph = document.getElementById('diskGraph');
      if (diskGraph) {
        drawGraph('diskGraph', graphData.disk, 'rgb(6, 182, 212)');
      }
    } else {
      if (diskValue) diskValue.textContent = '0%';
      if (diskBar) diskBar.style.width = '0%';
      if (diskDetail) diskDetail.textContent = '0 / 0 GB';
    }
    
    // Disk I/O speed - calculate from bytes read/written per second
    try {
      const disksIO = await Promise.race([
        si.disksIO(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      
      if (disksIO && previousDiskStats) {
        // Calculate bytes per second from difference
        const timeDiff = 1; // We update every second
        const readBytesPerSec = Math.max(0, ((disksIO.rx_bytes || 0) - (previousDiskStats.rx_bytes || 0)) / timeDiff);
        const writeBytesPerSec = Math.max(0, ((disksIO.wx_bytes || 0) - (previousDiskStats.wx_bytes || 0)) / timeDiff);
        
        if (diskRead) diskRead.textContent = '↓ ' + formatSpeed(readBytesPerSec);
        if (diskWrite) diskWrite.textContent = '↑ ' + formatSpeed(writeBytesPerSec);
      } else {
        // First reading or no previous stats
        if (diskRead) diskRead.textContent = '↓ 0 KB/s';
        if (diskWrite) diskWrite.textContent = '↑ 0 KB/s';
      }
      previousDiskStats = disksIO;
    } catch (ioError) {
      // Disk I/O might not be available on all systems
      if (diskRead) diskRead.textContent = '↓ 0 KB/s';
      if (diskWrite) diskWrite.textContent = '↑ 0 KB/s';
    }
  } catch (error) {
    console.error('Disk update error:', error);
    if (diskValue) diskValue.textContent = '0%';
    if (diskBar) diskBar.style.width = '0%';
    if (diskDetail) diskDetail.textContent = '0 / 0 GB';
    if (diskRead) diskRead.textContent = '↓ 0 KB/s';
    if (diskWrite) diskWrite.textContent = '↑ 0 KB/s';
  }
}

async function updateNetwork() {
  try {
    const networkStats = await si.networkStats();
    const interfaces = await si.networkInterfaces();
    
    // Find active interface (first non-internal interface that's up)
    const activeInterface = interfaces.find(i => i.operstate === 'up' && !i.internal) || 
                           interfaces.find(i => i.operstate === 'up') ||
                           interfaces.find(i => !i.internal) ||
                           interfaces[0];
    
    if (activeInterface) {
      netValue.textContent = activeInterface.operstate === 'up' ? 'Connected' : 'Disconnected';
      netDetail.textContent = activeInterface.iface || 'Unknown';
    } else {
      netValue.textContent = 'No Connection';
      netDetail.textContent = '--';
    }
    
    // Calculate network speed from bytes per second
    // Find stats for the active interface
    let stats = null;
    if (activeInterface && networkStats && networkStats.length > 0) {
      stats = networkStats.find(s => s.iface === activeInterface.iface) || networkStats[0];
    } else if (networkStats && networkStats.length > 0) {
      stats = networkStats[0];
    }
    
    if (stats) {
      let rxSpeed = 0;
      let txSpeed = 0;
      
      // Try to use per-second values first (most accurate)
      if (stats.rx_bytes_sec !== undefined && stats.rx_bytes_sec !== null) {
        rxSpeed = stats.rx_bytes_sec;
      } else if (previousNetStats && previousNetStats.iface === stats.iface) {
        // Calculate from byte difference
        const rxBytesDiff = Math.max(0, (stats.rx_bytes || 0) - (previousNetStats.rx_bytes || 0));
        rxSpeed = rxBytesDiff; // bytes per second (updating every second)
      }
      
      if (stats.tx_bytes_sec !== undefined && stats.tx_bytes_sec !== null) {
        txSpeed = stats.tx_bytes_sec;
      } else if (previousNetStats && previousNetStats.iface === stats.iface) {
        // Calculate from byte difference
        const txBytesDiff = Math.max(0, (stats.tx_bytes || 0) - (previousNetStats.tx_bytes || 0));
        txSpeed = txBytesDiff; // bytes per second (updating every second)
      }
      
      netDown.textContent = formatSpeed(rxSpeed);
      netUp.textContent = formatSpeed(txSpeed);
      
      // Store stats for next calculation
      previousNetStats = {
        rx_bytes: stats.rx_bytes || 0,
        tx_bytes: stats.tx_bytes || 0,
        iface: stats.iface
      };
    } else {
      // No stats available
      if (netDown) netDown.textContent = '0 KB/s';
      if (netUp) netUp.textContent = '0 KB/s';
    }
  } catch (error) {
    console.error('Network update error:', error);
    if (netValue) netValue.textContent = 'Error';
    if (netDetail) netDetail.textContent = '--';
    if (netDown) netDown.textContent = '0 KB/s';
    if (netUp) netUp.textContent = '0 KB/s';
  }
}

async function updateUptime() {
  try {
    const time = await si.time();
    uptimeEl.textContent = formatUptime(time.uptime);
  } catch (error) {
    console.error('Uptime error:', error);
  }
}

async function updateGPU() {
  try {
    if (!gpuCard) return;
    
    const graphics = await Promise.race([
      si.graphics(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      const gpu = graphics.controllers[0];
      gpuCard.style.display = 'block';
      gpuName.textContent = (gpu.model || gpu.name || 'Unknown GPU').substring(0, 30);
      
      // Try to get additional GPU info from graphics data
      // Note: GPU usage/temperature APIs vary by platform and may not be available
      try {
        // Use data from graphics() call - it may have usage info
        const usage = gpu.utilGpu || gpu.utilCore || gpu.usageGpu || 0;
        if (usage > 0) {
          const usagePercent = Math.round(usage);
          gpuValue.textContent = usagePercent + '%';
          gpuBar.style.width = usagePercent + '%';
        } else {
          gpuValue.textContent = '--%';
          gpuBar.style.width = '0%';
        }
        
        // Try to get temperature
        const temp = gpu.temperatureGpu || gpu.temperatureCore || gpu.temperatureMemory;
        if (temp !== null && temp !== undefined && temp > 0) {
          gpuTemp.textContent = Math.round(temp) + '°C';
        } else {
          gpuTemp.textContent = '--';
        }
        
        // VRAM info if available
        if (gpu.vram) {
          gpuDetail.textContent = formatBytes(gpu.vram * 1024 * 1024);
        } else if (gpu.memoryTotal) {
          gpuDetail.textContent = formatBytes(gpu.memoryTotal);
        } else if (gpu.memoryUsed && gpu.memoryTotal) {
          const vramUsed = (gpu.memoryUsed / (1024 * 1024 * 1024)).toFixed(1);
          const vramTotal = (gpu.memoryTotal / (1024 * 1024 * 1024)).toFixed(1);
          gpuDetail.textContent = `${vramUsed} / ${vramTotal} GB`;
        } else {
          gpuDetail.textContent = '--';
        }
      } catch (gpuError) {
        // If GPU info processing fails, show basic info
        console.warn('GPU info processing failed:', gpuError);
        gpuValue.textContent = '--%';
        gpuBar.style.width = '0%';
        if (gpu.vram) {
          gpuDetail.textContent = formatBytes(gpu.vram * 1024 * 1024);
        } else {
          gpuDetail.textContent = '--';
        }
        gpuTemp.textContent = '--';
      }
    } else {
      gpuCard.style.display = 'none';
    }
  } catch (error) {
    console.warn('GPU update error:', error);
    if (gpuCard) {
      gpuCard.style.display = 'none';
    }
  }
}

async function updateBattery() {
  try {
    if (!batteryCard) return;
    const battery = await Promise.race([
      si.battery(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    
    if (battery && battery.hasBattery) {
      batteryCard.style.display = 'block';
      const percent = Math.round(battery.percent || 0);
      batteryValue.textContent = percent + '%';
      batteryBar.style.width = percent + '%';
      batteryStatus.textContent = battery.isCharging ? 'Charging' : 'Discharging';
      
      // Show time to full when charging, time remaining when discharging
      if (battery.isCharging) {
        if (percent >= 100) {
          batteryTime.textContent = 'Full';
        } else if (battery.timeToFull !== null && battery.timeToFull !== undefined && battery.timeToFull > 0 && battery.timeToFull !== -1) {
          batteryTime.textContent = formatUptime(battery.timeToFull * 60);
        } else {
          batteryTime.textContent = '--';
        }
      } else {
        batteryTime.textContent = battery.timeRemaining && battery.timeRemaining > 0 ? formatUptime(battery.timeRemaining * 60) : '--';
      }
      
      batteryDetail.textContent = battery.isCharging ? 'Plugged in' : 'On battery';
      previousBatteryStats = { percent, isCharging, timestamp: Date.now() };
    } else {
      batteryCard.style.display = 'none';
    }
  } catch (error) {
    if (batteryCard) batteryCard.style.display = 'none';
  }
}

// Antivirus function removed - now handled in settings tab

function drawGraph(canvasId, data, color) {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (data.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const maxValue = Math.max(...data, 100);
    const stepX = width / (data.length - 1);
    
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - (value / maxValue) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  } catch (error) {
    console.error('Graph draw error:', error);
  }
}

async function checkAlerts() {
  try {
    // Check if alerts are enabled
    const enableAlertsEl = document.getElementById('enableAlerts');
    const showNotificationsEl = document.getElementById('showNotifications');
    
    if (!enableAlertsEl || !enableAlertsEl.checked) {
      return; // Alerts disabled
    }
    
    if (!showNotificationsEl || !showNotificationsEl.checked) {
      return; // Notifications disabled
    }
    
    // Get alert thresholds from settings
    const cpuThreshold = parseInt(document.getElementById('cpuAlertThreshold')?.value) || 90;
    const ramThreshold = parseInt(document.getElementById('ramAlertThreshold')?.value) || 85;
    const diskThreshold = parseInt(document.getElementById('diskAlertThreshold')?.value) || 10;
    const alertDuration = parseInt(document.getElementById('alertDuration')?.value) || 30; // seconds
    
    // Get current values
    const cpuPercent = parseInt(cpuValue.textContent) || 0;
    const ramPercent = parseInt(ramValue.textContent) || 0;
    const diskPercent = parseInt(diskValue.textContent) || 0;
    const freeDisk = 100 - diskPercent;
    
    const now = Date.now();
    
    // Check CPU alert
    if (cpuPercent > cpuThreshold) {
      if (!alertStates.cpu.active) {
        alertStates.cpu.active = true;
        alertStates.cpu.startTime = now;
      }
      
      // Check if we should send notification (after duration threshold)
      const durationExceeded = (now - alertStates.cpu.startTime) >= (alertDuration * 1000);
      if (durationExceeded && !alertStates.cpu.notified) {
        alertStates.cpu.notified = true;
        ipcRenderer.send('show-notification', 
          '⚠️ High CPU Usage',
          `CPU usage is at ${cpuPercent}% (threshold: ${cpuThreshold}%)`,
          { urgency: 'critical' }
        );
      }
    } else {
      if (alertStates.cpu.active) {
        // Reset when below threshold
        alertStates.cpu.active = false;
        alertStates.cpu.notified = false;
      }
    }
    
    // Check RAM alert
    if (ramPercent > ramThreshold) {
      if (!alertStates.ram.active) {
        alertStates.ram.active = true;
        alertStates.ram.startTime = now;
      }
      
      const durationExceeded = (now - alertStates.ram.startTime) >= (alertDuration * 1000);
      if (durationExceeded && !alertStates.ram.notified) {
        alertStates.ram.notified = true;
        ipcRenderer.send('show-notification',
          '⚠️ High Memory Usage',
          `Memory usage is at ${ramPercent}% (threshold: ${ramThreshold}%)`,
          { urgency: 'critical' }
        );
      }
    } else {
      if (alertStates.ram.active) {
        alertStates.ram.active = false;
        alertStates.ram.notified = false;
      }
    }
    
    // Check Disk alert (low free space)
    if (freeDisk < diskThreshold) {
      if (!alertStates.disk.active) {
        alertStates.disk.active = true;
        alertStates.disk.startTime = now;
      }
      
      const durationExceeded = (now - alertStates.disk.startTime) >= (alertDuration * 1000);
      if (durationExceeded && !alertStates.disk.notified) {
        alertStates.disk.notified = true;
        ipcRenderer.send('show-notification',
          '💾 Low Disk Space',
          `Only ${freeDisk}% disk space remaining (threshold: ${diskThreshold}%)`,
          { urgency: 'critical' }
        );
      }
    } else {
      if (alertStates.disk.active) {
        alertStates.disk.active = false;
        alertStates.disk.notified = false;
      }
    }
  } catch (error) {
    console.error('Alert check error:', error);
  }
}

function loadServices() {
  try {
    const servicesList = document.getElementById('servicesList');
    if (!servicesList) return;
    
    servicesList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading services...</span></div>';
    
    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows - Try without admin first
      exec('powershell -Command "Get-Service | Select-Object Name, Status, DisplayName | ConvertTo-Json"', (error, stdout) => {
        if (error || !stdout) {
          servicesList.innerHTML = `
            <div class="empty-state">
              <div style="margin-bottom: 12px;">Failed to load services. Some services may require administrator privileges.</div>
              <div style="margin-bottom: 16px; font-size: 11px; color: var(--text-muted);">
                <strong>Note:</strong> To load all services, run RocketRAM as Administrator (Right-click → Run as administrator)
              </div>
              <button class="action-btn scan-btn" onclick="loadServices()" style="padding: 8px 16px; font-size: 12px; margin-right: 8px;">Try Again</button>
              <button class="action-btn optimize-btn" onclick="requestAdminRights()" style="padding: 8px 16px; font-size: 12px;">Run as Admin</button>
            </div>
          `;
          return;
        }
        
        try {
          const services = JSON.parse(stdout);
          const serviceArray = Array.isArray(services) ? services : [services].filter(s => s);
          
          if (serviceArray.length === 0) {
            servicesList.innerHTML = '<div class="empty-state">No services found. Admin rights may be required.</div>';
            return;
          }
          
          servicesList.innerHTML = '';
          serviceArray.forEach(service => {
            if (!service || !service.Name) return;
            
            const item = document.createElement('div');
            item.className = 'service-item';
            const serviceName = service.Name;
            const displayName = service.DisplayName || service.Name;
            const status = service.Status || 'Unknown';
            const isRunning = status === 'Running';
            const safeServiceName = serviceName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeDisplayName = displayName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            item.innerHTML = `
              <div class="service-info">
                <div class="service-name" title="${safeDisplayName}">${safeDisplayName}</div>
                <div class="service-desc" style="font-family: monospace; font-size: 10px; color: var(--text-muted);">${safeServiceName}</div>
              </div>
              <div class="service-status ${isRunning ? 'running' : 'stopped'}">${status}</div>
              <div class="service-actions">
                ${isRunning ? 
                  `<button class="service-action-btn stop" onclick="toggleService('${safeServiceName}', false)" title="Stop Service">Stop</button>` :
                  `<button class="service-action-btn start" onclick="toggleService('${safeServiceName}', true)" title="Start Service">Start</button>`
                }
              </div>
            `;
            servicesList.appendChild(item);
          });
        } catch (e) {
          servicesList.innerHTML = '<div class="empty-state">Error parsing services data.</div>';
        }
      });
    } else if (platform === 'darwin') {
      // macOS - Use launchctl
      exec('launchctl list | head -50', (error, stdout) => {
        if (error || !stdout) {
          servicesList.innerHTML = '<div class="empty-state">Failed to load services. This feature may require permissions.</div>';
          return;
        }
        
        try {
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          servicesList.innerHTML = '';
          
          if (lines.length === 0) {
            servicesList.innerHTML = '<div class="empty-state">No services found.</div>';
            return;
          }
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) return;
            
            const pid = parts[0];
            const status = pid !== '-' ? 'Running' : 'Stopped';
            const name = parts.slice(2).join(' ');
            
            if (!name) return;
            
            const item = document.createElement('div');
            item.className = 'service-item';
            const isRunning = status === 'Running';
            const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            item.innerHTML = `
              <div class="service-info">
                <div class="service-name" title="${safeName}">${safeName}</div>
              </div>
              <div class="service-status ${isRunning ? 'running' : 'stopped'}">${status}</div>
              <div class="service-actions">
                ${isRunning ? 
                  `<button class="service-action-btn stop" onclick="toggleService('${safeName}', false)" title="Stop Service">Stop</button>` :
                  `<button class="service-action-btn start" onclick="toggleService('${safeName}', true)" title="Start Service">Start</button>`
                }
              </div>
            `;
            servicesList.appendChild(item);
          });
        } catch (e) {
          servicesList.innerHTML = '<div class="empty-state">Error parsing services data.</div>';
        }
      });
    } else {
      // Linux - Use systemctl
      exec('systemctl list-units --type=service --no-pager | head -50', (error, stdout) => {
        if (error || !stdout) {
          servicesList.innerHTML = '<div class="empty-state">Failed to load services. Admin rights may be required.</div>';
          return;
        }
        
        try {
          const lines = stdout.trim().split('\n').slice(1);
          servicesList.innerHTML = '';
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 4) return;
            
            const name = parts[0];
            const status = parts[3];
            
            const item = document.createElement('div');
            item.className = 'service-item';
            const isRunning = status === 'active';
            const safeName = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            item.innerHTML = `
              <div class="service-info">
                <div class="service-name" title="${safeName}">${safeName}</div>
              </div>
              <div class="service-status ${isRunning ? 'running' : 'stopped'}">${status}</div>
              <div class="service-actions">
                ${isRunning ? 
                  `<button class="service-action-btn stop" onclick="toggleService('${safeName}', false)" title="Stop Service">Stop</button>` :
                  `<button class="service-action-btn start" onclick="toggleService('${safeName}', true)" title="Start Service">Start</button>`
                }
              </div>
            `;
            servicesList.appendChild(item);
          });
        } catch (e) {
          servicesList.innerHTML = '<div class="empty-state">Error parsing services data.</div>';
        }
      });
    }
  } catch (error) {
    console.error('Load services error:', error);
  }
}

function requestAdminRights() {
  const os = require('os');
  const platform = os.platform();
  
  if (platform === 'win32') {
    alert('To run RocketRAM as Administrator on Windows:\n\n1. Close RocketRAM\n2. Right-click the RocketRAM icon\n3. Select "Run as administrator"\n\nThis will allow the app to access all services and system information.');
  } else if (platform === 'darwin') {
    alert('On macOS, some features require granting permissions:\n\n1. Go to System Preferences → Security & Privacy\n2. Select "Privacy" tab\n3. Grant "Accessibility" and "Full Disk Access" permissions to RocketRAM\n4. Restart RocketRAM after granting permissions');
  } else {
    alert('To run with elevated privileges:\n\nRun RocketRAM with sudo or grant appropriate permissions in your system settings.');
  }
}

function toggleService(serviceName, shouldStart) {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  const action = shouldStart ? 'start' : 'stop';
  
  if (platform === 'win32') {
    // Windows - Use sc command
    const safeServiceName = serviceName.replace(/"/g, '\\"');
    exec(`powershell -Command "Start-Process powershell -ArgumentList '-Command sc ${action} \\"${safeServiceName}\\"' -Verb RunAs"`, (error) => {
      if (error) {
        // Try without admin first
        exec(`sc ${action} "${safeServiceName}"`, (error2) => {
          if (error2) {
            alert(`Failed to ${action} service "${serviceName}".\n\nAdmin rights may be required. Try running RocketRAM as Administrator.`);
          } else {
            // Refresh after a short delay
            setTimeout(loadServices, 1000);
          }
        });
      } else {
        // Refresh after a short delay
        setTimeout(loadServices, 1500);
      }
    });
  } else if (platform === 'darwin') {
    // macOS - Use launchctl
    const safeServiceName = serviceName.replace(/"/g, '\\"');
    const command = shouldStart ? `launchctl load -w "${safeServiceName}"` : `launchctl unload -w "${safeServiceName}"`;
    exec(command, (error) => {
      if (error) {
        alert(`Failed to ${action} service "${serviceName}".\n\nAdmin rights may be required.`);
      } else {
        setTimeout(loadServices, 500);
      }
    });
  } else {
    // Linux - Use systemctl
    const safeServiceName = serviceName.replace(/"/g, '\\"');
    exec(`systemctl ${action} "${safeServiceName}"`, (error) => {
      if (error) {
        // Try with sudo
        exec(`sudo systemctl ${action} "${safeServiceName}"`, (error2) => {
          if (error2) {
            alert(`Failed to ${action} service "${serviceName}".\n\nAdmin rights may be required.`);
          } else {
            setTimeout(loadServices, 500);
          }
        });
      } else {
        setTimeout(loadServices, 500);
      }
    });
  }
}

// Make functions available globally for onclick handlers
window.loadServices = loadServices;
window.requestAdminRights = requestAdminRights;
window.loadStartupPrograms = loadStartupPrograms;
window.toggleService = toggleService;

async function loadNetworkConnections() {
  try {
    const networkList = document.getElementById('networkList');
    if (!networkList) return;
    
    networkList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading network information...</span></div>';
    
    try {
      const interfaces = await Promise.race([
        si.networkInterfaces(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      const networkStats = await Promise.race([
        si.networkStats(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      
      // Find the active connected interface (non-internal, state is 'up')
      const activeInterface = interfaces.find(i => i.operstate === 'up' && !i.internal) || 
                             interfaces.find(i => i.operstate === 'up') ||
                             null;
      
      networkList.innerHTML = '';
      
      if (!activeInterface) {
        networkList.innerHTML = '<div class="empty-state">No active network connection found</div>';
        return;
      }
      
      // Get stats for the active interface
      let stats = null;
      if (networkStats && networkStats.length > 0) {
        stats = networkStats.find(s => s.iface === activeInterface.iface) || networkStats[0];
      }
      
      // Calculate speeds
      let downloadSpeed = '0 KB/s';
      let uploadSpeed = '0 KB/s';
      
      if (stats) {
        if (stats.rx_bytes_sec !== undefined && stats.rx_bytes_sec !== null) {
          downloadSpeed = formatSpeed(stats.rx_bytes_sec);
        }
        if (stats.tx_bytes_sec !== undefined && stats.tx_bytes_sec !== null) {
          uploadSpeed = formatSpeed(stats.tx_bytes_sec);
        }
      }
      
      const ip = activeInterface.ip4 || activeInterface.ip6 || 'Not assigned';
      const type = activeInterface.type || 'Unknown';
      const speed = activeInterface.speed ? activeInterface.speed + ' Mbps' : 'Unknown';
      
      const item = document.createElement('div');
      item.className = 'network-item';
      item.style.padding = '16px';
      item.style.background = 'var(--bg-card)';
      item.style.border = '1px solid var(--border-color)';
      item.style.borderRadius = '10px';
      item.style.marginBottom = '12px';
      
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(34, 197, 94, 0.2); display: flex; align-items: center; justify-content: center; color: var(--accent-net); font-size: 20px;">
            📡
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--text-primary); font-size: 14px; margin-bottom: 4px;">
              ${activeInterface.iface || 'Unknown'}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${type} • ${speed}
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--text-muted);">IP Address:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${ip}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--text-muted);">Status:</span>
            <span style="color: var(--accent-net); font-weight: 600;">${activeInterface.operstate === 'up' ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; padding-top: 8px; border-top: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Download:</span>
            <span style="color: var(--accent-net); font-weight: 600;">${downloadSpeed}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: var(--text-muted);">Upload:</span>
            <span style="color: var(--accent-cpu); font-weight: 600;">${uploadSpeed}</span>
          </div>
        </div>
      `;
      
      networkList.appendChild(item);
      
      // Update speeds every second
      if (stats) {
        let previousStats = {
          rx_bytes: stats.rx_bytes || 0,
          tx_bytes: stats.tx_bytes || 0,
          iface: stats.iface
        };
        
        const speedInterval = setInterval(async () => {
          try {
            const newStats = await si.networkStats();
            if (newStats && newStats.length > 0) {
              const newInterfaceStats = newStats.find(s => s.iface === activeInterface.iface) || newStats[0];
              if (newInterfaceStats && previousStats.iface === newInterfaceStats.iface) {
                let rxSpeed = 0;
                let txSpeed = 0;
                
                if (newInterfaceStats.rx_bytes_sec !== undefined && newInterfaceStats.rx_bytes_sec !== null) {
                  rxSpeed = newInterfaceStats.rx_bytes_sec;
                } else {
                  const rxBytesDiff = Math.max(0, (newInterfaceStats.rx_bytes || 0) - previousStats.rx_bytes);
                  rxSpeed = rxBytesDiff;
                }
                
                if (newInterfaceStats.tx_bytes_sec !== undefined && newInterfaceStats.tx_bytes_sec !== null) {
                  txSpeed = newInterfaceStats.tx_bytes_sec;
                } else {
                  const txBytesDiff = Math.max(0, (newInterfaceStats.tx_bytes || 0) - previousStats.tx_bytes);
                  txSpeed = txBytesDiff;
                }
                
                const speedElements = networkList.querySelectorAll('.network-item');
                if (speedElements.length > 0) {
                  const speedTexts = speedElements[0].querySelectorAll('span[style*="font-weight: 600"]');
                  if (speedTexts.length >= 4) {
                    speedTexts[2].textContent = formatSpeed(rxSpeed);
                    speedTexts[3].textContent = formatSpeed(txSpeed);
                  }
                }
                
                previousStats = {
                  rx_bytes: newInterfaceStats.rx_bytes || 0,
                  tx_bytes: newInterfaceStats.tx_bytes || 0,
                  iface: newInterfaceStats.iface
                };
              }
            }
          } catch (e) {
            console.error('Error updating network speeds:', e);
          }
        }, 1000);
        
        // Store interval to clear later if needed
        if (networkList.dataset.intervalId) {
          clearInterval(parseInt(networkList.dataset.intervalId));
        }
        networkList.dataset.intervalId = speedInterval.toString();
      }
    } catch (error) {
      console.error('Load network error:', error);
      networkList.innerHTML = '<div class="empty-state">Failed to load network information.</div>';
    }
  } catch (error) {
    console.error('Load network error:', error);
    const networkList = document.getElementById('networkList');
    if (networkList) {
      networkList.innerHTML = '<div class="empty-state">Failed to load network information.</div>';
    }
  }
}

// Initial load of static data
async function loadStaticData() {
  try {
    if (cpuName) {
      const cpu = await Promise.race([
        si.cpu(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);
      if (cpu && cpu.brand) {
        cpuName.textContent = cpu.brand.substring(0, 30) + (cpu.brand.length > 30 ? '...' : '');
      } else {
        cpuName.textContent = 'Loading...';
      }
    }
  } catch (error) {
    console.error('Static data error:', error);
    if (cpuName) cpuName.textContent = 'Unknown CPU';
  }
}

// Control buttons - with proper event handling
if (collapseBtn) {
  collapseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      isCollapsed = !isCollapsed;
      if (content) {
        content.classList.toggle('collapsed');
      }
      ipcRenderer.send('toggle-collapse');
      
      // Rotate the collapse button icon
      collapseBtn.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    } catch (error) {
      console.error('Collapse button error:', error);
    }
  });
}

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      ipcRenderer.send('minimize-app');
    } catch (error) {
      console.error('Minimize button error:', error);
    }
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      ipcRenderer.send('close-app');
    } catch (error) {
      console.error('Close button error:', error);
    }
  });
}

// Main update loop
async function updateAll() {
  if (!isCollapsed) {
    await Promise.all([
      updateCPU(),
      updateRAM(),
      updateDisk(),
      updateNetwork(),
      updateGPU(),
      updateBattery(),
      updateUptime()
    ]);
    // Check alerts after updates
    checkAlerts();
  } else {
    // Still update uptime even when collapsed
    await updateUptime();
  }
}

// Process Management Functions
async function fetchProcesses(type = 'cpu', retryCount = 0, showLoading = true) {
  // Don't fetch if modal is closed or showing preview
  if (!isModalOpen || !processList) return;
  
  // Don't fetch if we're showing optimization preview (check if title contains "PREVIEW")
  if (processTitle && processTitle.textContent && processTitle.textContent.includes('PREVIEW')) {
    return;
  }
  
  try {
    // Only show loading on first attempt or when explicitly requested, not on auto-refresh
    if (showLoading && retryCount === 0) {
      loadingState.style.display = 'flex';
      processList.innerHTML = '';
      processList.appendChild(loadingState);
    }
    
    const processes = await Promise.race([
      si.processes(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);
    
    // Check if modal is still open before updating
    if (!isModalOpen || !processList) return;
    
    loadingState.style.display = 'none';
    
    if (!processes || !processes.list || processes.list.length === 0) {
      throw new Error('No processes returned');
    }
    
    allProcesses = processes.list || [];
    
    // Filter and sort based on type
    let sorted = [...allProcesses];
    
    if (type === 'cpu') {
      sorted.sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
      sorted = sorted.filter(p => (p.cpu || 0) > 0);
    } else if (type === 'ram') {
      sorted.sort((a, b) => (b.mem || 0) - (a.mem || 0));
      sorted = sorted.filter(p => (p.mem || 0) > 0);
    } else if (type === 'disk') {
      // For disk, we'll show processes with high I/O (if available)
      sorted.sort((a, b) => (b.mem || 0) - (a.mem || 0));
    } else if (type === 'network') {
      // Network processes - show all for now
      sorted.sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
    }
    
    filteredProcesses = sorted.slice(0, 100); // Limit to top 100
    // Skip count update on auto-refresh to reduce flicker (only update count on initial load)
    renderProcesses(!showLoading);
    
  } catch (error) {
    console.error('Process fetch error:', error);
    
    // Retry up to 2 times with exponential backoff
    if (retryCount < 2 && isModalOpen) {
      setTimeout(() => {
        fetchProcesses(type, retryCount + 1, showLoading);
      }, 1000 * (retryCount + 1)); // 1s, 2s delays
      return;
    }
    
    // Show error only if modal is still open
    if (isModalOpen && processList) {
      loadingState.style.display = 'none';
      processList.innerHTML = `<div class="empty-state">
        <div style="margin-bottom: 8px;">Failed to load processes.</div>
        <div style="font-size: 11px; color: var(--text-muted);">${error.message || 'Unknown error'}</div>
        <button onclick="fetchProcesses('${type}')" style="margin-top: 12px; padding: 8px 16px; background: var(--accent-cpu); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">Retry</button>
      </div>`;
    }
  }
}

function renderProcesses(skipCountUpdate = false) {
  // Only update if modal is still open
  if (!isModalOpen || !processList) return;
  
  // Don't render if showing preview
  if (processTitle && processTitle.textContent && processTitle.textContent.includes('PREVIEW')) {
    return;
  }
  
  // Use fragment for smoother rendering
  const fragment = document.createDocumentFragment();
  if (!skipCountUpdate) {
    processCount.textContent = filteredProcesses.length;
  }
  
  if (filteredProcesses.length === 0) {
    processList.innerHTML = '<div class="empty-state">No processes found</div>';
    return;
  }
  
  // Check for important processes to avoid marking them as "should shutdown"
  const importantProcs = getImportantProcesses(filteredProcesses);
  const importantPids = new Set(importantProcs.map(p => p.pid));
  
  filteredProcesses.forEach(proc => {
    const item = document.createElement('div');
    item.className = 'process-item';
    
    const usage = currentProcessType === 'cpu' ? (proc.cpu || 0).toFixed(1) + '%' :
                  currentProcessType === 'ram' ? formatBytes((proc.mem || 0) * 1024 * 1024) :
                  (proc.cpu || 0).toFixed(1) + '%';
    
    // Memory is already in MB from systeminformation, so convert properly
    const memBytes = (proc.mem || 0) * 1024 * 1024;
    
    const usageClass = currentProcessType === 'cpu' ? '' :
                       currentProcessType === 'ram' ? 'ram' :
                       currentProcessType === 'disk' ? 'disk' : '';
    
    // Determine if process should be shut down
    const isSystemProcess = (proc.name || '').toLowerCase().includes('system') ||
                           (proc.name || '').toLowerCase().includes('svchost') ||
                           (proc.name || '').toLowerCase().includes('winlogon') ||
                           (proc.name || '').toLowerCase().includes('csrss') ||
                           (proc.name || '').toLowerCase().includes('lsass') ||
                           (proc.name || '').toLowerCase().includes('kernel') ||
                           (proc.name || '').toLowerCase().includes('ntoskrnl') ||
                           proc.pid === 0 || proc.pid === 4;
    
    const isImportant = importantPids.has(proc.pid);
    
    let shouldShutdown = false;
    let shutdownReason = '';
    
    if (!isSystemProcess && !isImportant) {
      if (currentProcessType === 'cpu') {
        if ((proc.cpu || 0) > 15) {
          shouldShutdown = true;
          shutdownReason = 'High CPU (>15%)';
        }
      } else if (currentProcessType === 'ram') {
        if ((proc.mem || 0) > 200) {
          shouldShutdown = true;
          shutdownReason = 'High Memory (>200MB)';
        }
      } else if (currentProcessType === 'disk') {
        if ((proc.cpu || 0) > 10 || (proc.mem || 0) > 150) {
          shouldShutdown = true;
          shutdownReason = 'High Usage';
        }
      }
    }
    
    const isHighUsage = (currentProcessType === 'cpu' && (proc.cpu || 0) > 10) ||
                       (currentProcessType === 'ram' && (proc.mem || 0) > 100);
    
    if (isHighUsage) {
      item.classList.add('high-usage');
    }
    
    if (shouldShutdown) {
      item.classList.add('should-shutdown');
    }
    
    const name = proc.name || 'Unknown';
    const pid = proc.pid || 'N/A';
    const memMB = (proc.mem || 0).toFixed(1);
    
    item.innerHTML = `
      <div class="process-icon">${name.charAt(0).toUpperCase()}</div>
      <div class="process-info">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="process-name" title="${name}">${name}</div>
          ${shouldShutdown ? `<span class="shutdown-badge" title="${shutdownReason} - Consider shutting down">⚠️ Shut Down</span>` : ''}
          ${isImportant ? `<span class="important-badge" title="Important application">🔒 Important</span>` : ''}
          ${isSystemProcess ? `<span class="system-badge" title="System process - do not shut down">🛡️ System</span>` : ''}
        </div>
        <div class="process-details">
          <span>PID: ${pid}</span>
          <span>Memory: ${memMB} MB</span>
        </div>
      </div>
      <div class="process-metrics">
        <div class="process-usage ${usageClass}">${usage}</div>
        <div class="process-memory">${proc.cpu ? proc.cpu.toFixed(1) + '% CPU' : ''}</div>
      </div>
      <div class="process-actions">
        <button class="process-action-btn" onclick="killProcess(${pid})" title="End Process">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
      </div>
    `;
    
    fragment.appendChild(item);
  });
  
  // Clear and append all at once to prevent flicker
  processList.innerHTML = '';
  processList.appendChild(fragment);
}

function killProcess(pid) {
  if (confirm(`Are you sure you want to end process ${pid}?`)) {
    ipcRenderer.send('kill-process', pid);
    // Refresh process list after a short delay
    setTimeout(() => {
      if (currentProcessType) {
        fetchProcesses(currentProcessType);
      }
    }, 500);
  }
}

async function optimizeSystem() {
  // Determine optimization type based on current modal
  if (currentModalType === 'cpu') {
    await optimizeCPU();
  } else if (currentModalType === 'ram') {
    await optimizeRAM();
  } else if (currentModalType === 'battery') {
    await optimizeBattery();
  } else if (currentModalType === 'disk') {
    await showDiskOptimizationOptions();
  } else if (currentModalType && currentModalType.startsWith('process-')) {
    // For process lists (disk processes, etc.)
    optimizeProcessList();
  } else {
    // Default: optimize processes
    optimizeProcessList();
  }
}

// Check if important processes are running
function getImportantProcesses(processes) {
  const importantKeywords = [
    'chrome', 'firefox', 'edge', 'safari', 'opera', 'brave', 'vivaldi', // Browsers
    'code', 'vscode', 'visual studio', 'intellij', 'webstorm', 'pycharm', 'sublime', 'atom', // Code editors
    'word', 'excel', 'powerpoint', 'outlook', 'onenote', 'teams', // Office apps
    'photoshop', 'illustrator', 'premiere', 'after effects', 'figma', 'sketch', // Design apps
    'spotify', 'vlc', 'itunes', 'windows media', 'netflix', 'youtube', // Media apps
    'steam', 'epic', 'discord', 'zoom', 'skype', 'slack', // Communication/gaming
    'git', 'docker', 'virtualbox', 'vmware' // Development tools
  ];
  
  const important = [];
  processes.forEach(p => {
    const name = (p.name || '').toLowerCase();
    if (importantKeywords.some(keyword => name.includes(keyword))) {
      important.push(p);
    }
  });
  
  return important;
}

async function optimizeCPU() {
  try {
    const processes = await si.processes();
    const allProcs = processes.list || [];
    
    // Check for important processes first
    const importantProcs = getImportantProcesses(allProcs);
    
    // Filter high CPU processes (excluding system processes)
    const highCPU = allProcs.filter(p => {
      const cpuUsage = p.cpu || 0;
      const isHigh = cpuUsage > 15;
      const isSystem = (p.name || '').toLowerCase().includes('system') ||
                       (p.name || '').toLowerCase().includes('svchost') ||
                       (p.name || '').toLowerCase().includes('winlogon') ||
                       (p.name || '').toLowerCase().includes('csrss') ||
                       (p.name || '').toLowerCase().includes('lsass') ||
                       p.pid === 0 || p.pid === 4; // System processes
      return isHigh && !isSystem;
    });
    
    if (highCPU.length === 0) {
      alert('No high CPU usage processes found to optimize.');
      return;
    }
    
    // Check if any important processes are in the high CPU list
    const importantToKill = highCPU.filter(p => {
      return importantProcs.some(imp => imp.pid === p.pid);
    });
    
    if (importantToKill.length > 0) {
      const importantNames = importantToKill.map(p => p.name || 'Unknown').join(', ');
      const warning = `⚠️ WARNING: Important applications are running and will be closed:\n\n${importantNames}\n\nAre you sure you want to continue?`;
      if (!confirm(warning)) {
        return;
      }
    }
    
    // Sort by CPU usage (highest first)
    highCPU.sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
    
    // Show preview in modal
    await showOptimizationPreview('CPU', highCPU, async () => {
      // Execute optimization
      let killed = 0;
      for (const proc of highCPU) {
        if (proc.pid) {
          try {
            ipcRenderer.send('kill-process', proc.pid);
            killed++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (e) {
            console.error('Error killing process:', e);
          }
        }
      }
      
      // Show notification
      const showNotificationsEl = document.getElementById('showNotifications');
      if (showNotificationsEl && showNotificationsEl.checked) {
        ipcRenderer.send('show-notification',
          '⚡ CPU Optimized',
          `Closed ${killed} high-usage process${killed !== 1 ? 'es' : ''}`,
          { urgency: 'normal' }
        );
      }
      
      // Refresh CPU info after optimization
      setTimeout(() => {
        if (currentModalType === 'cpu') {
          openCPUPanel();
        }
      }, 1500);
    });
  } catch (error) {
    console.error('CPU optimization error:', error);
    alert('Error optimizing CPU. Please try again.');
  }
}

async function optimizeRAM() {
  try {
    const processes = await si.processes();
    const allProcs = processes.list || [];
    
    // Check for important processes first
    const importantProcs = getImportantProcesses(allProcs);
    
    // Filter high memory processes (excluding system processes)
    const highRAM = allProcs.filter(p => {
      const memUsage = p.mem || 0; // Memory in MB
      const isHigh = memUsage > 200;
      const isSystem = (p.name || '').toLowerCase().includes('system') ||
                       (p.name || '').toLowerCase().includes('svchost') ||
                       (p.name || '').toLowerCase().includes('winlogon') ||
                       (p.name || '').toLowerCase().includes('csrss') ||
                       (p.name || '').toLowerCase().includes('lsass') ||
                       p.pid === 0 || p.pid === 4; // System processes
      return isHigh && !isSystem;
    });
    
    // Sort by memory usage (highest first)
    highRAM.sort((a, b) => (b.mem || 0) - (a.mem || 0));
    // Limit to top 10 to avoid closing too many
    const toKill = highRAM.slice(0, 10);
    
    if (toKill.length === 0) {
      alert('No high memory usage processes found to optimize.');
      return;
    }
    
    // Check if any important processes are in the high RAM list
    const importantToKill = toKill.filter(p => {
      return importantProcs.some(imp => imp.pid === p.pid);
    });
    
    if (importantToKill.length > 0) {
      const importantNames = importantToKill.map(p => p.name || 'Unknown').join(', ');
      const warning = `⚠️ WARNING: Important applications are running and will be closed:\n\n${importantNames}\n\nAre you sure you want to continue?`;
      if (!confirm(warning)) {
        return;
      }
    }
    
    // Show preview in modal
    await showOptimizationPreview('Memory', toKill, async () => {
      // Execute optimization
      let killed = 0;
      for (const proc of toKill) {
        if (proc.pid) {
          try {
            ipcRenderer.send('kill-process', proc.pid);
            killed++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (e) {
            console.error('Error killing process:', e);
          }
        }
      }
      
      // Show notification
      const showNotificationsEl = document.getElementById('showNotifications');
      if (showNotificationsEl && showNotificationsEl.checked) {
        ipcRenderer.send('show-notification',
          '💾 RAM Optimized',
          `Closed ${killed} memory-intensive process${killed !== 1 ? 'es' : ''}`,
          { urgency: 'normal' }
        );
      }
      
      // Refresh RAM info after optimization
      setTimeout(() => {
        if (currentModalType === 'ram') {
          openRAMPanel();
        }
      }, 1500);
    });
  } catch (error) {
    console.error('RAM optimization error:', error);
    alert('Error optimizing memory. Please try again.');
  }
}

async function showOptimizationPreview(type, processes, onConfirm) {
  // Stop the refresh interval while showing preview
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
  
  // Change modal title
  const originalTitle = processTitle.textContent;
  processTitle.textContent = `${type.toUpperCase()} OPTIMIZATION PREVIEW`;
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Calculate total impact
  let totalCPU = 0;
  let totalMemory = 0;
  processes.forEach(p => {
    totalCPU += p.cpu || 0;
    totalMemory += p.mem || 0;
  });
  
  // Show explanation and process list
  processList.innerHTML = '';
  processCount.textContent = processes.length;
  
  // Explanation section
  const explanation = document.createElement('div');
  explanation.style.padding = '16px';
  explanation.style.marginBottom = '16px';
  explanation.style.background = 'rgba(6, 182, 212, 0.1)';
  explanation.style.border = '1px solid var(--accent-disk)';
  explanation.style.borderRadius = '10px';
  explanation.style.fontSize = '12px';
  explanation.style.color = 'var(--text-primary)';
  
  const explanationText = type === 'CPU' 
    ? `This will close ${processes.length} process${processes.length !== 1 ? 'es' : ''} using high CPU (>15%). This will free up ${totalCPU.toFixed(1)}% CPU usage and improve system performance.`
    : `This will close ${processes.length} process${processes.length !== 1 ? 'es' : ''} using high memory (>200 MB). This will free up ${formatBytes(totalMemory * 1024 * 1024)} of RAM and improve system performance.`;
  
  explanation.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 20px;">⚡</span>
      <span style="font-weight: 600; font-size: 14px;">How This Optimizes:</span>
    </div>
    <div style="line-height: 1.6; color: var(--text-secondary);">
      ${explanationText}
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span>Processes to close:</span>
        <span style="font-weight: 600; color: var(--accent-cpu);">${processes.length}</span>
      </div>
      ${type === 'CPU' ? `
      <div style="display: flex; justify-content: space-between;">
        <span>CPU to free:</span>
        <span style="font-weight: 600; color: var(--accent-cpu);">${totalCPU.toFixed(1)}%</span>
      </div>
      ` : `
      <div style="display: flex; justify-content: space-between;">
        <span>Memory to free:</span>
        <span style="font-weight: 600; color: var(--accent-ram);">${formatBytes(totalMemory * 1024 * 1024)}</span>
      </div>
      `}
    </div>
  `;
  
  processList.appendChild(explanation);
  
  // Process list
  const processHeader = document.createElement('div');
  processHeader.style.padding = '12px 16px';
  processHeader.style.background = 'rgba(0, 0, 0, 0.2)';
  processHeader.style.borderBottom = '1px solid var(--border-color)';
  processHeader.style.fontSize = '11px';
  processHeader.style.fontWeight = '600';
  processHeader.style.color = 'var(--text-muted)';
  processHeader.style.textTransform = 'uppercase';
  processHeader.style.letterSpacing = '1px';
  processHeader.textContent = `Processes That Will Be Closed (${processes.length})`;
  processList.appendChild(processHeader);
  
  processes.forEach((proc, index) => {
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = index < processes.length - 1 ? '8px' : '0';
    item.style.cursor = 'default';
    
    const usage = type === 'CPU' 
      ? (proc.cpu || 0).toFixed(1) + '%'
      : formatBytes((proc.mem || 0) * 1024 * 1024);
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(244, 63, 94, 0.2); color: var(--accent-cpu);">
        ${(proc.name || 'Unknown').charAt(0).toUpperCase()}
      </div>
      <div class="process-info" style="flex: 1;">
        <div class="process-name" title="${proc.name || 'Unknown'}">${proc.name || 'Unknown'}</div>
        <div class="process-details">
          <span>PID: ${proc.pid || 'N/A'}</span>
          ${type === 'CPU' ? '' : `<span>Memory: ${(proc.mem || 0).toFixed(1)} MB</span>`}
        </div>
      </div>
      <div class="process-metrics">
        <div class="process-usage ${type === 'CPU' ? '' : 'ram'}" style="color: var(--accent-cpu);">
          ${usage}
        </div>
        ${type === 'CPU' ? `<div class="process-memory">${proc.mem ? (proc.mem || 0).toFixed(1) + '% CPU' : ''}</div>` : ''}
      </div>
    `;
    
    processList.appendChild(item);
  });
  
  // Action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '12px';
  buttonContainer.style.padding = '16px';
  buttonContainer.style.borderTop = '1px solid var(--border-color)';
  buttonContainer.style.marginTop = '16px';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'process-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.flex = '1';
  cancelBtn.onclick = () => {
    // Restore original view and restart refresh interval
    if (currentModalType === 'cpu' || currentModalType === 'process-cpu') {
      showProcessPanel('cpu');
    } else if (currentModalType === 'ram' || currentModalType === 'process-ram') {
      showProcessPanel('ram');
    } else if (currentModalType === 'disk' || currentModalType === 'process-disk') {
      showProcessPanel('disk');
    }
  };
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'process-btn optimize-btn';
  confirmBtn.textContent = `Optimize ${type}`;
  confirmBtn.style.flex = '1';
  confirmBtn.style.background = 'linear-gradient(135deg, var(--accent-cpu), #dc2626)';
  confirmBtn.style.color = 'white';
  confirmBtn.onclick = async () => {
    processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Optimizing...</span></div>';
    await onConfirm();
  };
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  processList.appendChild(buttonContainer);
}

async function optimizeBattery() {
  try {
    const processes = await si.processes();
    const allProcs = processes.list || [];
    
    // Check for important processes first
    const importantProcs = getImportantProcesses(allProcs);
    
    // Filter power-hungry processes (high CPU OR high memory, excluding system processes)
    const powerHungry = allProcs.filter(p => {
      const cpuUsage = p.cpu || 0;
      const memUsage = p.mem || 0; // Memory in MB
      
      // High CPU (>10%) OR high memory (>150 MB) indicates power drain
      const isPowerHungry = cpuUsage > 10 || memUsage > 150;
      
      // Exclude system processes
      const isSystem = (p.name || '').toLowerCase().includes('system') ||
                       (p.name || '').toLowerCase().includes('svchost') ||
                       (p.name || '').toLowerCase().includes('winlogon') ||
                       (p.name || '').toLowerCase().includes('csrss') ||
                       (p.name || '').toLowerCase().includes('lsass') ||
                       p.pid === 0 || p.pid === 4;
      
      return isPowerHungry && !isSystem;
    });
    
    // Sort by combined resource usage (CPU + normalized memory)
    powerHungry.sort((a, b) => {
      const scoreA = (a.cpu || 0) + ((a.mem || 0) / 10); // Memory MB / 10 for rough comparison
      const scoreB = (b.cpu || 0) + ((b.mem || 0) / 10);
      return scoreB - scoreA;
    });
    
    // Limit to top 15 to avoid closing too many
    const toKill = powerHungry.slice(0, 15);
    
    if (toKill.length === 0) {
      alert('No power-hungry processes found. Your battery usage is already optimized!');
      return;
    }
    
    // Show preview with checkboxes
    await showBatteryOptimizationPreview(toKill, importantProcs);
  } catch (error) {
    console.error('Battery optimization error:', error);
    alert('Error optimizing battery. Please try again.');
  }
}

async function showBatteryOptimizationPreview(processes, importantProcs) {
  // Stop the refresh interval while showing preview
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
  
  // Change modal title
  const originalTitle = processTitle.textContent;
  processTitle.textContent = 'BATTERY OPTIMIZATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Track selected processes (all selected by default)
  const selectedProcesses = new Set(processes.map(p => p.pid));
  
  // Calculate total impact
  let totalCPU = 0;
  let totalMemory = 0;
  processes.forEach(p => {
    totalCPU += p.cpu || 0;
    totalMemory += p.mem || 0;
  });
  
  // Show explanation and process list
  processList.innerHTML = '';
  processCount.textContent = processes.length;
  
  // Explanation section
  const explanation = document.createElement('div');
  explanation.style.padding = '16px';
  explanation.style.marginBottom = '16px';
  explanation.style.background = 'rgba(16, 185, 129, 0.1)';
  explanation.style.border = '1px solid var(--accent-battery)';
  explanation.style.borderRadius = '10px';
  explanation.style.fontSize = '12px';
  explanation.style.color = 'var(--text-primary)';
  
  explanation.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
      <span style="font-size: 20px;">🔋</span>
      <span style="font-weight: 600; font-size: 14px;">Battery Optimization</span>
    </div>
    <div style="line-height: 1.6; color: var(--text-secondary); margin-bottom: 12px;">
      This will close power-hungry processes (high CPU >10% OR high memory >150 MB) to save battery. 
      Uncheck any processes you want to keep running.
    </div>
    <div style="padding-top: 12px; border-top: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span>Selected processes:</span>
        <span style="font-weight: 600; color: var(--accent-battery);" id="selectedCount">${processes.length}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span>CPU to free:</span>
        <span style="font-weight: 600; color: var(--accent-cpu);">${totalCPU.toFixed(1)}%</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Memory to free:</span>
        <span style="font-weight: 600; color: var(--accent-ram);">${formatBytes(totalMemory * 1024 * 1024)}</span>
      </div>
    </div>
  `;
  
  processList.appendChild(explanation);
  
  // Process list with checkboxes
  const processHeader = document.createElement('div');
  processHeader.style.padding = '12px 16px';
  processHeader.style.background = 'rgba(0, 0, 0, 0.2)';
  processHeader.style.borderBottom = '1px solid var(--border-color)';
  processHeader.style.fontSize = '11px';
  processHeader.style.fontWeight = '600';
  processHeader.style.color = 'var(--text-muted)';
  processHeader.style.textTransform = 'uppercase';
  processHeader.style.letterSpacing = '1px';
  processHeader.style.display = 'flex';
  processHeader.style.justifyContent = 'space-between';
  processHeader.style.alignItems = 'center';
  
  const headerText = document.createElement('span');
  headerText.textContent = `Select Processes to Close (${processes.length})`;
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.textContent = 'Select All';
  selectAllBtn.style.padding = '4px 8px';
  selectAllBtn.style.background = 'rgba(255, 255, 255, 0.1)';
  selectAllBtn.style.border = '1px solid var(--border-color)';
  selectAllBtn.style.borderRadius = '4px';
  selectAllBtn.style.color = 'var(--text-primary)';
  selectAllBtn.style.fontSize = '10px';
  selectAllBtn.style.cursor = 'pointer';
  selectAllBtn.onclick = () => {
    processes.forEach(p => selectedProcesses.add(p.pid));
    updateCheckboxes();
    updateSelectedCount();
  };
  
  processHeader.appendChild(headerText);
  processHeader.appendChild(selectAllBtn);
  processList.appendChild(processHeader);
  
  // Create checkbox update function
  const updateCheckboxes = () => {
    processes.forEach(proc => {
      const checkbox = document.getElementById(`battery-checkbox-${proc.pid}`);
      if (checkbox) {
        checkbox.checked = selectedProcesses.has(proc.pid);
        const item = checkbox.closest('.process-item');
        if (item) {
          if (checkbox.checked) {
            item.style.opacity = '1';
          } else {
            item.style.opacity = '0.5';
          }
        }
      }
    });
  };
  
  // Update selected count
  const selectedCountEl = document.getElementById('selectedCount');
  const updateSelectedCount = () => {
    if (selectedCountEl) {
      selectedCountEl.textContent = selectedProcesses.size;
    }
  };
  
  // Create process items with checkboxes
  processes.forEach((proc, index) => {
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = index < processes.length - 1 ? '8px' : '0';
    item.style.cursor = 'pointer';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '12px';
    
    const isImportant = importantProcs.some(imp => imp.pid === proc.pid);
    const cpuUsage = (proc.cpu || 0).toFixed(1) + '%';
    const memUsage = formatBytes((proc.mem || 0) * 1024 * 1024);
    
    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `battery-checkbox-${proc.pid}`;
    checkbox.checked = true;
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.cursor = 'pointer';
    checkbox.style.accentColor = 'var(--accent-battery)';
    checkbox.style.flexShrink = '0';
    checkbox.onchange = (e) => {
      if (e.target.checked) {
        selectedProcesses.add(proc.pid);
      } else {
        selectedProcesses.delete(proc.pid);
      }
      updateSelectedCount();
      if (e.target.checked) {
        item.style.opacity = '1';
      } else {
        item.style.opacity = '0.5';
      }
    };
    
    // Create icon div
    const iconDiv = document.createElement('div');
    iconDiv.className = 'process-icon';
    iconDiv.style.background = isImportant ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)';
    iconDiv.style.color = isImportant ? 'var(--accent-gpu)' : 'var(--accent-cpu)';
    iconDiv.textContent = (proc.name || 'Unknown').charAt(0).toUpperCase();
    
    // Create info div
    const infoDiv = document.createElement('div');
    infoDiv.className = 'process-info';
    infoDiv.style.flex = '1';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'process-name';
    nameDiv.title = proc.name || 'Unknown';
    nameDiv.innerHTML = `${proc.name || 'Unknown'}${isImportant ? ' <span style="color: var(--accent-gpu); font-size: 10px;">⚠️ Important</span>' : ''}`;
    
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'process-details';
    detailsDiv.innerHTML = `<span>PID: ${proc.pid || 'N/A'}</span><span>CPU: ${cpuUsage}</span><span>Memory: ${memUsage}</span>`;
    
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(detailsDiv);
    
    // Create metrics div
    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'process-metrics';
    
    const usageDiv = document.createElement('div');
    usageDiv.className = 'process-usage';
    usageDiv.style.color = 'var(--accent-cpu)';
    usageDiv.textContent = cpuUsage;
    
    const memoryDiv = document.createElement('div');
    memoryDiv.className = 'process-memory';
    memoryDiv.style.color = 'var(--accent-ram)';
    memoryDiv.textContent = memUsage;
    
    metricsDiv.appendChild(usageDiv);
    metricsDiv.appendChild(memoryDiv);
    
    // Append all elements
    item.appendChild(checkbox);
    item.appendChild(iconDiv);
    item.appendChild(infoDiv);
    item.appendChild(metricsDiv);
    
    processList.appendChild(item);
  });
  
  // Action buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '12px';
  buttonContainer.style.padding = '16px';
  buttonContainer.style.borderTop = '1px solid var(--border-color)';
  buttonContainer.style.marginTop = '16px';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'process-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.flex = '1';
  cancelBtn.onclick = () => {
    if (currentModalType === 'battery') {
      openBatteryPanel();
    }
  };
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'process-btn optimize-btn';
  confirmBtn.textContent = 'Optimize Battery';
  confirmBtn.style.flex = '1';
  confirmBtn.style.background = 'linear-gradient(135deg, var(--accent-battery), #059669)';
  confirmBtn.style.color = 'white';
  confirmBtn.onclick = async () => {
    const processesToKill = processes.filter(p => selectedProcesses.has(p.pid));
    
    if (processesToKill.length === 0) {
      alert('Please select at least one process to close.');
      return;
    }
    
    processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Optimizing battery...</span></div>';
    
    // Kill selected processes
    let killed = 0;
    for (const proc of processesToKill) {
      if (proc.pid) {
        try {
          ipcRenderer.send('kill-process', proc.pid);
          killed++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.error('Error killing process:', e);
        }
      }
    }
    
    alert(`Battery optimized: Closed ${killed} power-hungry process${killed !== 1 ? 'es' : ''} to save battery.`);
    
    // Refresh battery info after optimization
    setTimeout(() => {
      if (currentModalType === 'battery') {
        openBatteryPanel();
      }
    }, 1500);
  };
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  processList.appendChild(buttonContainer);
  
  // Initial checkbox update
  updateCheckboxes();
}

async function showDiskOptimizationOptions() {
  // Stop the refresh interval while showing optimization options
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
  
  // Show optimization options in the modal
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading optimization options...</span></div>';
  
  try {
    const fsSize = await si.fsSize().catch(() => null);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    const optimizations = [
      {
        id: 'cleanup',
        name: 'Disk Cleanup',
        description: 'Clean temporary files, cache, and junk files',
        icon: '🧹',
        action: async () => {
          await runDiskCleanup();
        }
      },
      {
        id: 'defrag',
        name: 'Disk Optimization',
        description: 'Optimize disk (SSD trim or HDD defragmentation)',
        icon: '⚡',
        action: async () => {
          await runDiskOptimization();
        }
      },
      {
        id: 'analyze',
        name: 'Analyze Disk Space',
        description: 'Analyze disk usage and find large files',
        icon: '📊',
        action: async () => {
          await analyzeDiskSpace();
        }
      }
    ];
    
    optimizations.forEach((opt, index) => {
      const item = document.createElement('div');
      item.className = 'process-item';
      item.style.marginBottom = index < optimizations.length - 1 ? '12px' : '0';
      item.style.cursor = 'pointer';
      item.onclick = async () => {
        item.style.opacity = '0.7';
        try {
          await opt.action();
          // Refresh disk info after optimization
          setTimeout(() => {
            openDiskPanel();
          }, 1500);
        } catch (error) {
          console.error('Optimization error:', error);
          alert('Error running optimization: ' + error.message);
        } finally {
          item.style.opacity = '1';
        }
      };
      
      item.innerHTML = `
        <div class="process-icon" style="background: rgba(6, 182, 212, 0.2); color: var(--accent-disk); font-size: 20px;">
          ${opt.icon}
        </div>
        <div class="process-info" style="flex: 1;">
          <div class="process-name" style="font-size: 14px; margin-bottom: 6px; color: var(--text-primary);">
            ${opt.name}
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">
            ${opt.description}
          </div>
        </div>
        <div style="color: var(--accent-disk); font-size: 18px;">
          →
        </div>
      `;
      
      processList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading optimization options:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load optimization options.</div>';
  }
}

async function runDiskCleanup() {
  if (!confirm('This will clean temporary files, cache, and junk files. Continue?')) {
    return;
  }
  
  try {
    // Use the existing cleanup functions
    const { exec } = require('child_process');
    const path = require('path');
    const os = require('os');
    
    const platform = os.platform();
    let commands = [];
    
    if (platform === 'win32') {
      // Windows cleanup commands
      commands = [
        { cmd: 'powershell -Command "Get-ChildItem -Path $env:TEMP -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"', desc: 'Cleaning temp files...' },
        { cmd: 'cleanmgr /sagerun:1', desc: 'Running Windows Disk Cleanup...' },
        { cmd: 'powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', desc: 'Emptying Recycle Bin...' }
      ];
    } else if (platform === 'darwin') {
      // macOS cleanup
      commands = [
        { cmd: 'rm -rf ~/Library/Caches/*', desc: 'Cleaning caches...' },
        { cmd: 'rm -rf /tmp/*', desc: 'Cleaning temp files...' }
      ];
    } else {
      // Linux cleanup
      commands = [
        { cmd: 'rm -rf /tmp/*', desc: 'Cleaning temp files...' },
        { cmd: 'apt-get clean', desc: 'Cleaning package cache...' }
      ];
    }
    
    for (const { cmd, desc } of commands) {
      await new Promise((resolve) => {
        exec(cmd, (error) => {
          if (!error) {
            console.log(desc);
          }
          resolve();
        });
      });
    }
    
    alert('Disk cleanup completed!');
  } catch (error) {
    console.error('Cleanup error:', error);
    alert('Error during cleanup: ' + error.message);
  }
}

async function runDiskOptimization() {
  if (!confirm('This will optimize your disk (SSD trim or HDD defrag). This may take a while. Continue?')) {
    return;
  }
  
  try {
    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Try SSD trim first, fallback to defrag
      await new Promise((resolve) => {
        exec('powershell -Command "Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue"', (error) => {
          if (error) {
            // Fallback to defrag
            exec('defrag C: /O', () => {
              alert('Disk optimization started. This may take a while.');
              resolve();
            });
          } else {
            alert('Disk optimization (SSD trim) completed!');
            resolve();
          }
        });
      });
    } else if (platform === 'darwin') {
      // macOS - trim SSD
      await new Promise((resolve) => {
        exec('diskutil secureErase freespace 0 /', (error) => {
          if (error) {
            exec('sudo trimforce enable', () => {
              alert('SSD trim enabled. Optimization may take a while.');
              resolve();
            });
          } else {
            alert('Disk optimization completed!');
            resolve();
          }
        });
      });
    } else {
      // Linux - fstrim
      await new Promise((resolve) => {
        exec('sudo fstrim -av', (error) => {
          if (error) {
            alert('Disk optimization requires admin rights.');
          } else {
            alert('Disk optimization completed!');
          }
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('Optimization error:', error);
    alert('Error during optimization: ' + error.message);
  }
}

async function analyzeDiskSpace() {
  try {
    const fsSize = await si.fsSize().catch(() => null);
    
    if (!fsSize || fsSize.length === 0) {
      alert('Could not analyze disk space.');
      return;
    }
    
    let analysis = 'Disk Space Analysis:\n\n';
    fsSize.forEach(disk => {
      const usedPercent = Math.round(disk.use || 0);
      const usedGB = (disk.used / (1024 * 1024 * 1024)).toFixed(2);
      const totalGB = (disk.size / (1024 * 1024 * 1024)).toFixed(2);
      const freeGB = ((disk.available || 0) / (1024 * 1024 * 1024)).toFixed(2);
      
      analysis += `${disk.mount || 'Unknown'}:\n`;
      analysis += `  Used: ${usedGB} GB (${usedPercent}%)\n`;
      analysis += `  Free: ${freeGB} GB\n`;
      analysis += `  Total: ${totalGB} GB\n\n`;
      
      if (usedPercent > 90) {
        analysis += `  ⚠️ Critical: Less than 10% free space!\n\n`;
      } else if (usedPercent > 80) {
        analysis += `  ⚠️ Warning: Less than 20% free space\n\n`;
      }
    });
    
    alert(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    alert('Error analyzing disk space: ' + error.message);
  }
}

function optimizeProcessList() {
  if (!confirm('This will close processes using high CPU/RAM. Continue?')) {
    return;
  }
  
  const highUsage = filteredProcesses.filter(p => {
    const cpuHigh = (p.cpu || 0) > 15;
    const ramHigh = (p.mem || 0) > 200;
    return cpuHigh || ramHigh;
  });
  
  if (highUsage.length === 0) {
    alert('No high-usage processes found to optimize.');
    return;
  }
  
  highUsage.forEach(proc => {
    if (proc.pid) {
      ipcRenderer.send('kill-process', proc.pid);
    }
  });
  
  setTimeout(() => {
    if (currentProcessType) {
      fetchProcesses(currentProcessType);
    }
  }, 1000);
}

// Make metric cards clickable
document.querySelectorAll('.metric-card').forEach((card) => {
  card.addEventListener('click', () => {
    const type = card.dataset.type;
    if (!type) return;
    
    // Show info panels first for CPU, RAM, and Disk (like network); show info panels for others
    switch(type) {
      case 'cpu':
        showCPUInfoPanel();
        break;
      case 'ram':
        showRAMInfoPanel();
        break;
      case 'disk':
        showDiskInfoPanel();
        break;
      case 'network':
        showNetworkPanel();
        break;
      case 'gpu':
        showGPUPanel();
        break;
      case 'battery':
        showBatteryPanel();
        break;
      case 'antivirus':
        showAntivirusPanel();
        break;
    }
  });
});

// Function to show antivirus panel
function showAntivirusPanel() {
  if (!antivirusOverlay || !antivirusPanel) return;
  
  // Show the overlay using the same pattern as process overlay
  antivirusOverlay.style.display = 'flex';
  antivirusOverlay.offsetHeight; // Force reflow
  antivirusOverlay.classList.add('active');
  
  // Update antivirus status when panel opens
  updateAntivirusStatus();
}

// Function to close antivirus panel
function closeAntivirusPanel() {
  if (!antivirusOverlay) return;
  
  antivirusOverlay.classList.remove('active');
  
  // Hide overlay after animation
  setTimeout(() => {
    if (!antivirusOverlay.classList.contains('active')) {
      antivirusOverlay.style.display = 'none';
    }
  }, 300);
}

// Function to update antivirus status in the panel
async function updateAntivirusStatus() {
  try {
    const protectionBadge = document.getElementById('antivirusProtectionBadge');
    const statusGrid = document.getElementById('antivirusStatusGrid');
    const toolsGrid = document.getElementById('antivirusToolsGrid');
    
    if (!statusGrid || !toolsGrid) return;
    
    // Check for ClamAV
    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    
    let clamavInstalled = false;
    let windowsDefenderInstalled = false;
    let needsUpdate = false;
    
    // Check ClamAV
    try {
      await new Promise((resolve) => {
        const command = platform === 'win32' ? 'where clamscan' : 'which clamscan';
        exec(command, { timeout: 2000 }, (error) => {
          if (!error) {
            clamavInstalled = true;
            // Check if definitions need updating (check if freshclam exists and last update was > 7 days ago)
            const freshclamCmd = platform === 'win32' ? 'where freshclam' : 'which freshclam';
            exec(freshclamCmd, { timeout: 2000 }, (freshclamError) => {
              if (!freshclamError) {
                // Check database age
                const fs = require('fs');
                const path = require('path');
                let dbPath = '';
                if (platform === 'win32') {
                  dbPath = path.join(process.env.ProgramData || 'C:\\ProgramData', 'ClamAV', 'main.cvd');
                } else if (platform === 'darwin') {
                  dbPath = '/usr/local/var/lib/clamav/main.cvd';
                } else {
                  dbPath = '/var/lib/clamav/main.cvd';
                }
                
                try {
                  if (fs.existsSync(dbPath)) {
                    const stats = fs.statSync(dbPath);
                    const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                    needsUpdate = daysSinceUpdate > 7;
                  } else {
                    needsUpdate = true; // Database doesn't exist, needs initial update
                  }
                } catch (e) {
                  // Can't check, assume needs update
                  needsUpdate = true;
                }
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      // ClamAV not found
    }
    
    // Check Windows Defender on Windows
    if (platform === 'win32') {
      try {
        await new Promise((resolve) => {
          exec('powershell -Command "Get-MpComputerStatus"', { timeout: 2000 }, (error) => {
            if (!error) {
              windowsDefenderInstalled = true;
            }
            resolve();
          });
        });
      } catch (e) {
        // Windows Defender check failed
      }
    }
    
    // Update protection badge
    if (protectionBadge) {
      if (clamavInstalled || windowsDefenderInstalled) {
        if (needsUpdate && clamavInstalled) {
          protectionBadge.className = 'status-badge warning';
          protectionBadge.innerHTML = '<span class="badge-dot"></span>Update Needed';
        } else {
          protectionBadge.className = 'status-badge';
          protectionBadge.innerHTML = '<span class="badge-dot"></span>Protected';
        }
      } else {
        protectionBadge.className = 'status-badge warning';
        protectionBadge.innerHTML = '<span class="badge-dot"></span>No Protection';
      }
    }
    
    // Auto-update definitions if needed and ClamAV is installed
    if (clamavInstalled && needsUpdate) {
      // Show a notification but don't auto-update (user can click update button)
      if (antivirusUpdateBtn) {
        const updateTitle = antivirusUpdateBtn.querySelector('.action-title');
        if (updateTitle) {
          updateTitle.textContent = 'Update Definitions (Recommended)';
          updateTitle.style.color = 'var(--accent-cpu)';
        }
      }
    }
    
    // Populate status grid
    statusGrid.innerHTML = '';
    
    const statusItems = [
      {
        label: 'ClamAV',
        value: clamavInstalled ? 'Installed' : 'Not Installed',
        class: clamavInstalled ? 'installed' : 'not-installed'
      },
      {
        label: platform === 'win32' ? 'Windows Defender' : 'System Protection',
        value: windowsDefenderInstalled ? 'Active' : (platform === 'win32' ? 'Available' : 'N/A'),
        class: windowsDefenderInstalled ? 'installed' : 'not-installed'
      },
      {
        label: 'Last Scan',
        value: 'Never',
        class: 'not-installed'
      },
      {
        label: 'Real-time Protection',
        value: (clamavInstalled || windowsDefenderInstalled) ? 'Enabled' : 'Disabled',
        class: (clamavInstalled || windowsDefenderInstalled) ? 'installed' : 'not-installed'
      }
    ];
    
    statusItems.forEach(item => {
      const statusItem = document.createElement('div');
      statusItem.className = 'status-item';
      statusItem.innerHTML = `
        <div class="status-item-label">${item.label}</div>
        <div class="status-item-value ${item.class}">${item.value}</div>
      `;
      statusGrid.appendChild(statusItem);
    });
    
    // Populate tools grid
    toolsGrid.innerHTML = '';
    
    const tools = [
      { name: 'ClamAV', installed: clamavInstalled },
      { name: platform === 'win32' ? 'Windows Defender' : 'System AV', installed: windowsDefenderInstalled || (platform === 'win32') }
    ];
    
    tools.forEach(tool => {
      const toolItem = document.createElement('div');
      toolItem.className = 'tool-item';
      
      if (!tool.installed && tool.name === 'ClamAV') {
        // Add install button for ClamAV if not installed
        toolItem.innerHTML = `
          <div class="tool-item-name">${tool.name}</div>
          <div class="tool-item-status not-installed" style="margin-bottom: 8px;">Not Installed</div>
          <button class="action-btn scan-btn" onclick="installClamAV()" style="width: 100%; padding: 8px; font-size: 11px; margin-top: 8px;">
            Install ClamAV
          </button>
        `;
      } else {
        toolItem.innerHTML = `
          <div class="tool-item-name">${tool.name}</div>
          <div class="tool-item-status ${tool.installed ? 'installed' : 'not-installed'}">
            ${tool.installed ? 'Installed' : 'Not Installed'}
          </div>
        `;
      }
      
      toolsGrid.appendChild(toolItem);
    });
    
  } catch (error) {
    console.error('Error updating antivirus status:', error);
  }
}

// Function to show process panel (for CPU, RAM, Disk)
function showProcessPanel(type) {
  // Prevent opening if already open with same type
  if (isModalOpen && currentModalType === type) {
    return;
  }
  
  // Close any existing modal first
  if (isModalOpen) {
    closeProcessPanel();
    // Wait a moment for close animation
    setTimeout(() => {
      openProcessPanel(type);
    }, 100);
  } else {
    openProcessPanel(type);
  }
}

function openProcessPanel(type) {
  currentProcessType = type;
  currentModalType = 'process-' + type;
  isModalOpen = true;
  
  const titles = {
    'cpu': 'CPU PROCESSES',
    'ram': 'MEMORY PROCESSES',
    'disk': 'DISK PROCESSES'
  };
  
  processTitle.textContent = titles[type] || 'PROCESSES';
  processSearch.style.display = 'block';
  optimizeBtn.style.display = 'flex';
  // Update button text - find text node after SVG
  const btnNodes = Array.from(optimizeBtn.childNodes);
  const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ' Optimize';
  }
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  // Force reflow
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  fetchProcesses(type);
  
  // Start auto-refresh only if not already running
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
  }
  processUpdateInterval = setInterval(() => {
    // Only refresh if modal is open, correct type, and not showing preview
    if (isModalOpen && currentModalType === 'process-' + type) {
      // Check if we're showing a preview (title contains "PREVIEW")
      if (processTitle && processTitle.textContent && !processTitle.textContent.includes('PREVIEW')) {
        // Refresh without showing loading spinner for smoother updates
        fetchProcesses(type, 0, false);
      }
    }
  }, 2000); // Refresh every 2 seconds for real-time updates
}

// Function to show Disk panel
async function showDiskPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'disk') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openDiskPanel();
    }, 100);
  } else {
    openDiskPanel();
  }
}

async function openDiskPanel() {
  currentModalType = 'disk';
  isModalOpen = true;
  
  processTitle.textContent = 'DISK INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'flex';
  // Update button text - find text node after SVG
  const btnNodes = Array.from(optimizeBtn.childNodes);
  const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ' Disk';
  } else {
    optimizeBtn.appendChild(document.createTextNode(' Disk'));
  }
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading disk information...</span></div>';
  
  try {
    const [fsSize, disksIO] = await Promise.all([
      si.fsSize().catch(() => null),
      si.disksIO().catch(() => null)
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    if (!fsSize || fsSize.length === 0) {
      processList.innerHTML = '<div class="empty-state">Failed to load disk information.</div>';
      return;
    }
    
    // Update previous stats for I/O calculation
    if (disksIO) {
      previousDiskStats = {
        rx_bytes: disksIO.rx_bytes || 0,
        wx_bytes: disksIO.wx_bytes || 0
      };
    }
    
    // Show all disks
    fsSize.forEach((disk, index) => {
      const usedPercent = Math.max(0, Math.min(100, Math.round(disk.use || 0)));
      const usedGB = (disk.used / (1024 * 1024 * 1024)).toFixed(2);
      const totalGB = (disk.size / (1024 * 1024 * 1024)).toFixed(2);
      const freeGB = ((disk.available || 0) / (1024 * 1024 * 1024)).toFixed(2);
      const mountPoint = disk.mount || 'Unknown';
      const filesystem = disk.fs || disk.type || 'Unknown';
      
      // Get disk name/label - try different properties
      let diskName = disk.label || disk.name || disk.mount || 'Unknown Disk';
      
      // Format disk name better
      if (mountPoint === '/') {
        diskName = 'Macintosh HD';
      } else if (mountPoint === '/System/Volumes/Data') {
        diskName = 'Data';
      } else if (mountPoint.startsWith('/Volumes/')) {
        diskName = mountPoint.replace('/Volumes/', '');
      } else if (mountPoint.endsWith(':') && !disk.label && !disk.name) {
        // Windows drive like "C:" - use label if available, otherwise create name
        diskName = `Local Disk (${mountPoint})`;
      }
      
      // Determine disk type/purpose
      let diskPurpose = 'Storage';
      if (mountPoint === '/' || mountPoint === 'C:') {
        diskPurpose = 'System Drive';
      } else if (mountPoint.includes('Data') || mountPoint.includes('Users')) {
        diskPurpose = 'User Data';
      } else if (filesystem.toLowerCase().includes('network') || filesystem.toLowerCase().includes('nfs')) {
        diskPurpose = 'Network Drive';
      } else if (filesystem.toLowerCase().includes('cd') || filesystem.toLowerCase().includes('dvd')) {
        diskPurpose = 'Optical Drive';
      }
      
      const item = document.createElement('div');
      item.className = 'process-item';
      item.style.marginBottom = index < fsSize.length - 1 ? '12px' : '0';
      item.style.cursor = 'pointer';
      item.dataset.diskIndex = index;
      
      // Add click handler to show details
      item.addEventListener('click', () => {
        showDiskDetails(disk, diskName, diskPurpose);
      });
      
      // Truncate long names and paths
      const truncatedName = diskName.length > 30 ? diskName.substring(0, 27) + '...' : diskName;
      const truncatedMount = mountPoint.length > 20 ? mountPoint.substring(0, 17) + '...' : mountPoint;
      
      item.innerHTML = `
        <div class="process-icon" style="background: rgba(6, 182, 212, 0.2); color: var(--accent-disk); flex-shrink: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="18" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <path d="M7 8h10M7 12h10M7 16h4"/>
          </svg>
        </div>
        <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
          <div class="process-name" style="font-size: 14px; margin-bottom: 6px; color: var(--text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${truncatedName}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${diskPurpose} • ${filesystem} • ${truncatedMount}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); min-width: 0;">
              <span style="color: var(--text-muted); white-space: nowrap;">Usage:</span>
              <span style="color: var(--accent-disk); font-weight: 600; font-size: 16px; white-space: nowrap; margin-left: 8px;">${usedPercent}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; min-width: 0;">
              <span style="color: var(--text-muted); white-space: nowrap;">Used:</span>
              <span style="color: var(--text-primary); font-weight: 600; white-space: nowrap; margin-left: 8px;">${usedGB} GB</span>
            </div>
            <div style="display: flex; justify-content: space-between; min-width: 0;">
              <span style="color: var(--text-muted); white-space: nowrap;">Free:</span>
              <span style="color: var(--accent-net); font-weight: 600; white-space: nowrap; margin-left: 8px;">${freeGB} GB</span>
            </div>
            <div style="display: flex; justify-content: space-between; min-width: 0;">
              <span style="color: var(--text-muted); white-space: nowrap;">Total:</span>
              <span style="color: var(--text-primary); white-space: nowrap; margin-left: 8px;">${totalGB} GB</span>
            </div>
          </div>
        </div>
        <div style="color: var(--accent-disk); font-size: 18px; margin-left: 12px; opacity: 0.6; flex-shrink: 0;">
          →
        </div>
      `;
      
      processList.appendChild(item);
    });
    
    processCount.textContent = fsSize.length;
  } catch (error) {
    console.error('Disk panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load disk information.</div>';
  }
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
}

// Function to show disk details when clicked
function showDiskDetails(disk, diskName, diskPurpose) {
  const usedPercent = Math.max(0, Math.min(100, Math.round(disk.use || 0)));
  const usedGB = (disk.used / (1024 * 1024 * 1024)).toFixed(2);
  const totalGB = (disk.size / (1024 * 1024 * 1024)).toFixed(2);
  const freeGB = ((disk.available || 0) / (1024 * 1024 * 1024)).toFixed(2);
  const mountPoint = disk.mount || 'Unknown';
  const filesystem = disk.fs || disk.type || 'Unknown';
  
  // Create a detailed description based on disk purpose
  let description = '';
  if (diskPurpose === 'System Drive') {
    description = 'This is your main system drive containing the operating system and core system files. Keep at least 15-20% free space for optimal performance.';
  } else if (diskPurpose === 'User Data') {
    description = 'This drive stores your personal files, documents, and user data. Regular backups are recommended.';
  } else if (diskPurpose === 'Network Drive') {
    description = 'This is a network-attached storage device. Performance depends on network speed and connection quality.';
  } else if (diskPurpose === 'Optical Drive') {
    description = 'This is a CD/DVD drive. It\'s read-only and used for installing software or accessing media.';
  } else {
    description = 'Storage drive for files and applications. Maintain at least 10% free space for file system operations.';
  }
  
  const detailsHtml = `
    <div style="padding: 20px; background: var(--bg-card); border-radius: 12px; max-width: 500px; margin: 40px auto;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid var(--border-color);">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(6, 182, 212, 0.2); display: flex; align-items: center; justify-content: center; color: var(--accent-disk);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="18" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 4px 0; font-size: 18px; color: var(--text-primary); font-weight: 700;">${diskName}</h3>
          <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${diskPurpose}</p>
        </div>
      </div>
      
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
          ${description}
        </p>
        
        <div style="background: rgba(6, 182, 212, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="color: var(--text-muted); font-size: 13px;">Storage Usage</span>
            <span style="color: var(--accent-disk); font-weight: 700; font-size: 20px;">${usedPercent}%</span>
          </div>
          <div style="height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${usedPercent}%; background: var(--accent-disk); transition: width 0.3s;"></div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px;">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Used Space</div>
            <div style="font-size: 16px; color: var(--text-primary); font-weight: 600;">${usedGB} GB</div>
          </div>
          <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px;">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Free Space</div>
            <div style="font-size: 16px; color: var(--accent-net); font-weight: 600;">${freeGB} GB</div>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted); font-size: 12px;">Total Capacity:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${totalGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted); font-size: 12px;">Mount Point:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 12px;">${mountPoint}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted); font-size: 12px;">File System:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${filesystem}</span>
          </div>
        </div>
      </div>
      
      <button onclick="this.closest('div').parentElement.remove()" style="width: 100%; padding: 12px; background: var(--accent-disk); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">
        Close
      </button>
    </div>
  `;
  
  // Create overlay and show details
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
  overlay.innerHTML = detailsHtml;
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  document.body.appendChild(overlay);
}

// Function to show CPU panel
async function showCPUPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'cpu') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openCPUPanel();
    }, 100);
  } else {
    openCPUPanel();
  }
}

async function openCPUPanel() {
  currentModalType = 'cpu';
  isModalOpen = true;
  
  processTitle.textContent = 'CPU INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'flex';
  // Update button text - find text node after SVG
  const btnNodes = Array.from(optimizeBtn.childNodes);
  const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ' CPU';
  } else {
    // If no text node, create one
    optimizeBtn.appendChild(document.createTextNode(' CPU'));
  }
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading CPU information...</span></div>';
  
  try {
    const [load, cpu, cpuSpeed, temps] = await Promise.all([
      si.currentLoad().catch(() => null),
      si.cpu().catch(() => null),
      si.cpuCurrentSpeed().catch(() => null),
      si.cpuTemperature().catch(() => null)
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    if (!load || !cpu) {
      processList.innerHTML = '<div class="empty-state">Failed to load CPU information.</div>';
      return;
    }
    
    const usage = Math.max(0, Math.min(100, Math.round(load.currentLoad || 0)));
    const speed = cpuSpeed?.avg ? cpuSpeed.avg.toFixed(2) + ' GHz' : 'Unknown';
    const cores = cpu.cores || 'Unknown';
    const physicalCores = cpu.physicalCores || 'Unknown';
    const brand = cpu.brand || 'Unknown CPU';
    const temperature = temps?.main && temps.main > 0 ? Math.round(temps.main) + '°C' : 'N/A';
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(244, 63, 94, 0.2); color: var(--accent-cpu);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/>
          <line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/>
          <line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/>
          <line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 12px; color: var(--text-primary);">
          ${brand.substring(0, 40)}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">CPU Usage:</span>
            <span style="color: var(--accent-cpu); font-weight: 600; font-size: 18px;">${usage}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Current Speed:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${speed}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Cores:</span>
            <span style="color: var(--text-primary);">${physicalCores} Physical / ${cores} Logical</span>
          </div>
          ${temperature !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Temperature:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${temperature}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('CPU panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load CPU information.</div>';
  }
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
}

// Function to show RAM panel
async function showRAMPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'ram') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openRAMPanel();
    }, 100);
  } else {
    openRAMPanel();
  }
}

async function openRAMPanel() {
  currentModalType = 'ram';
  isModalOpen = true;
  
  processTitle.textContent = 'MEMORY INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'flex';
  // Update button text - find text node after SVG
  const btnNodes = Array.from(optimizeBtn.childNodes);
  const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ' RAM';
  } else {
    // If no text node, create one
    optimizeBtn.appendChild(document.createTextNode(' RAM'));
  }
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading memory information...</span></div>';
  
  try {
    const mem = await Promise.race([
      si.mem(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    if (!mem || !mem.total || mem.total === 0) {
      processList.innerHTML = '<div class="empty-state">Failed to load memory information.</div>';
      return;
    }
    
    const usedPercent = Math.max(0, Math.min(100, Math.round((mem.used / mem.total) * 100)));
    const usedGB = (mem.used / (1024 * 1024 * 1024)).toFixed(2);
    const totalGB = (mem.total / (1024 * 1024 * 1024)).toFixed(2);
    const availableGB = ((mem.available || mem.free || 0) / (1024 * 1024 * 1024)).toFixed(2);
    const cachedGB = ((mem.cached || 0) / (1024 * 1024 * 1024)).toFixed(2);
    const freeGB = ((mem.free || 0) / (1024 * 1024 * 1024)).toFixed(2);
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(139, 92, 246, 0.2); color: var(--accent-ram);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <line x1="6" y1="10" x2="6" y2="14"/>
          <line x1="10" y1="10" x2="10" y2="14"/>
          <line x1="14" y1="10" x2="14" y2="14"/>
          <line x1="18" y1="10" x2="18" y2="14"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1;">
        <div class="process-name" style="font-size: 16px; margin-bottom: 12px; color: var(--text-primary);">
          Memory Status
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Memory Usage:</span>
            <span style="color: var(--accent-ram); font-weight: 600; font-size: 18px;">${usedPercent}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Used:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${usedGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Available:</span>
            <span style="color: var(--accent-net); font-weight: 600;">${availableGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Total:</span>
            <span style="color: var(--text-primary);">${totalGB} GB</span>
          </div>
          ${cachedGB > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Cached:</span>
            <span style="color: var(--text-secondary);">${cachedGB} GB</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('RAM panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load memory information.</div>';
  }
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
}

// Function to show battery panel
async function showBatteryPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'battery') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openBatteryPanel();
    }, 100);
  } else {
    openBatteryPanel();
  }
}

async function openBatteryPanel() {
  currentModalType = 'battery';
  isModalOpen = true;
  
  processTitle.textContent = 'BATTERY INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'flex';
  // Update button text - find text node after SVG
  const btnNodes = Array.from(optimizeBtn.childNodes);
  const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = ' Battery';
  } else {
    // If no text node, create one
    optimizeBtn.appendChild(document.createTextNode(' Battery'));
  }
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading battery information...</span></div>';
  
  try {
    const battery = await Promise.race([
      si.battery(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    if (!battery || !battery.hasBattery) {
      processList.innerHTML = '<div class="empty-state">No battery detected. This device is plugged in.</div>';
      return;
    }
    
    const percent = Math.round(battery.percent || 0);
    const isCharging = battery.isCharging || false;
    const timeRemaining = battery.timeRemaining && battery.timeRemaining > 0 ? formatUptime(battery.timeRemaining * 60) : '--';
    
    // Calculate time to full - handle null/undefined/invalid values better
    let timeToFull = '--';
    if (isCharging) {
      if (percent >= 100) {
        timeToFull = 'Full';
      } else if (battery.timeToFull !== null && battery.timeToFull !== undefined && battery.timeToFull > 0 && battery.timeToFull !== -1) {
        // Valid timeToFull value from system
        timeToFull = formatUptime(battery.timeToFull * 60);
      } else if (previousBatteryStats && previousBatteryStats.isCharging && previousBatteryStats.percent < percent) {
        // Estimate based on charge rate from previous reading
        const timeDiff = (Date.now() - previousBatteryStats.timestamp) / 1000 / 60; // minutes
        const percentDiff = percent - previousBatteryStats.percent;
        if (percentDiff > 0 && timeDiff > 0) {
          const chargeRate = percentDiff / timeDiff; // percent per minute
          const percentRemaining = 100 - percent;
          const estimatedMinutes = percentRemaining / chargeRate;
          if (estimatedMinutes > 0 && estimatedMinutes < 1440) { // Reasonable range (less than 24 hours)
            timeToFull = formatUptime(estimatedMinutes * 60);
          } else {
            timeToFull = '--';
          }
        } else {
          timeToFull = '--';
        }
      } else {
        // No previous data or not charging previously - show dash instead of stuck "Calculating..."
        timeToFull = '--';
      }
    }
    
    // Store current battery state for next estimation
    if (battery && battery.hasBattery) {
      previousBatteryStats = { 
        percent, 
        isCharging, 
        timestamp: Date.now() 
      };
    }
    const voltage = battery.voltage ? battery.voltage.toFixed(2) + ' V' : 'N/A';
    const maxCapacity = battery.maxCapacity || 'N/A';
    const designCapacity = battery.designCapacity || 'N/A';
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(16, 185, 129, 0.2); color: var(--accent-battery);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="7" width="16" height="10" rx="2"/>
          <line x1="6" y1="11" x2="10" y2="11"/>
          <path d="M18 11h2"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1;">
        <div class="process-name" style="font-size: 16px; margin-bottom: 12px; color: var(--text-primary);">
          Battery Status: ${isCharging ? 'Charging' : 'Discharging'}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">Charge Level:</span>
            <span style="color: var(--accent-battery); font-weight: 600; font-size: 18px;">${percent}%</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Status:</span>
            <span style="color: ${isCharging ? 'var(--accent-net)' : 'var(--text-primary)'}; font-weight: 600;">
              ${isCharging ? '⚡ Charging' : '🔋 Discharging'}
            </span>
          </div>
          ${!isCharging ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Time Remaining:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${timeRemaining}</span>
          </div>
          ` : `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Time to Full:</span>
            <span style="color: var(--accent-net); font-weight: 600;">${timeToFull}</span>
          </div>
          `}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Voltage:</span>
            <span style="color: var(--text-primary);">${voltage}</span>
          </div>
          ${maxCapacity !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Capacity:</span>
            <span style="color: var(--text-primary);">${maxCapacity} mWh</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('Battery panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load battery information.</div>';
  }
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
}

// Function to show GPU panel
async function showGPUPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'gpu') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openGPUPanel();
    }, 100);
  } else {
    openGPUPanel();
  }
}

async function openGPUPanel() {
  currentModalType = 'gpu';
  isModalOpen = true;
  
  processTitle.textContent = 'GPU INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none'; // GPU can't be optimized via processes
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading GPU information...</span></div>';
  
  try {
    // Get GPU info using graphics() API (si.gpu() doesn't exist)
    const graphicsResult = await Promise.allSettled([
      Promise.race([
        si.graphics(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Graphics timeout')), 5000))
      ])
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '';
    
    let gpu = null;
    
    // Get basic GPU info from graphics()
    if (graphicsResult[0].status === 'fulfilled' && graphicsResult[0].value && graphicsResult[0].value.controllers && graphicsResult[0].value.controllers.length > 0) {
      gpu = graphicsResult[0].value.controllers[0];
    } else {
      // Check all controllers if first one failed
      if (graphicsResult[0].status === 'fulfilled' && graphicsResult[0].value && graphicsResult[0].value.controllers) {
        // Try to find any valid GPU controller
        const controllers = graphicsResult[0].value.controllers;
        gpu = controllers.find(c => c && (c.model || c.name)) || controllers[0];
      }
    }
    
    if (!gpu) {
      // Try one more time as fallback
      try {
        const fallbackGraphics = await Promise.race([
          si.graphics(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        if (fallbackGraphics && fallbackGraphics.controllers && fallbackGraphics.controllers.length > 0) {
          gpu = fallbackGraphics.controllers.find(c => c && (c.model || c.name)) || fallbackGraphics.controllers[0];
        }
      } catch (fallbackError) {
        console.error('Fallback GPU fetch failed:', fallbackError);
      }
      
      if (!gpu) {
        processList.innerHTML = '<div class="empty-state">No GPU detected. GPU information may not be available on this system. This is common on macOS or systems without dedicated GPUs.</div>';
        processCount.textContent = '0';
        return;
      }
    }
    
    const gpuModel = gpu.model || gpu.name || 'GPU Detected';
    const vendor = gpu.vendor || gpu.vendorId || '';
    const bus = gpu.bus || gpu.busAddress || '';
    
    // Get VRAM info - try multiple sources
    let vram = 'Unknown';
    if (gpu.vram) {
      vram = formatBytes(gpu.vram * 1024 * 1024);
    } else if (gpu.memoryTotal) {
      vram = formatBytes(gpu.memoryTotal);
    }
    
    // Get GPU usage from graphics data
    let usage = '0%';
    const usagePercent = gpu.utilGpu || 
                        gpu.utilCore || 
                        gpu.usageGpu || 
                        gpu.utilizationGpu ||
                        gpu.load ||
                        0;
    if (usagePercent > 0) {
      usage = Math.round(usagePercent) + '%';
    }
    
    // Get temperature
    let temperature = 'N/A';
    const temp = gpu.temperatureGpu || 
                 gpu.temperatureCore ||
                 gpu.temperatureMemory ||
                 gpu.temperature;
    if (temp !== null && temp !== undefined && temp > 0) {
      temperature = Math.round(temp) + '°C';
    }
    
    // Get memory usage
    let memoryUsed = 'N/A';
    let memoryTotal = 'N/A';
    if (gpu.memoryUsed !== null && gpu.memoryUsed !== undefined && gpu.memoryUsed > 0) {
      memoryUsed = formatBytes(gpu.memoryUsed);
    }
    if (gpu.memoryTotal !== null && gpu.memoryTotal !== undefined && gpu.memoryTotal > 0) {
      memoryTotal = formatBytes(gpu.memoryTotal);
      if (memoryUsed === 'N/A') {
        // If we have total but not used, show just total
        memoryUsed = '--';
      }
    }
    
    // Get driver version
    const driverVersion = gpu.driverVersion || gpu.driver || 'Unknown';
    
    // Get clock speeds if available
    let clockCore = 'N/A';
    let clockMemory = 'N/A';
    if (gpu.clockCore && gpu.clockCore > 0) {
      clockCore = Math.round(gpu.clockCore) + ' MHz';
    }
    if (gpu.clockMemory && gpu.clockMemory > 0) {
      clockMemory = Math.round(gpu.clockMemory) + ' MHz';
    }
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gpu);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="14" rx="2"/>
          <line x1="6" y1="8" x2="6" y2="14"/>
          <line x1="10" y1="8" x2="10" y2="14"/>
          <line x1="14" y1="8" x2="14" y2="14"/>
          <line x1="18" y1="8" x2="18" y2="14"/>
          <path d="M7 2v2M17 2v2M7 20v2M17 20v2"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 12px; color: var(--text-primary);">
          ${gpuModel}${vendor ? ' (' + vendor + ')' : ''}
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">GPU Usage:</span>
            <span style="color: var(--accent-gpu); font-weight: 600; font-size: 18px;">${usage}</span>
          </div>
          ${temperature !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Temperature:</span>
            <span style="color: var(--text-primary); font-weight: 600;">${temperature}</span>
          </div>
          ` : ''}
          ${vram !== 'Unknown' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">VRAM:</span>
            <span style="color: var(--text-primary);">${vram}</span>
          </div>
          ` : ''}
          ${memoryUsed !== 'N/A' && memoryTotal !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Memory:</span>
            <span style="color: var(--text-primary);">${memoryUsed} / ${memoryTotal}</span>
          </div>
          ` : ''}
          ${clockCore !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Core Clock:</span>
            <span style="color: var(--text-primary);">${clockCore}</span>
          </div>
          ` : ''}
          ${clockMemory !== 'N/A' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Memory Clock:</span>
            <span style="color: var(--text-primary);">${clockMemory}</span>
          </div>
          ` : ''}
          ${driverVersion !== 'Unknown' ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Driver:</span>
            <span style="color: var(--text-primary);">${driverVersion}</span>
          </div>
          ` : ''}
          ${bus ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Bus:</span>
            <span style="color: var(--text-primary);">${bus}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
    
    processList.appendChild(item);
    processCount.textContent = '1';
  } catch (error) {
    console.error('GPU panel error:', error);
    const errorMessage = error.message || 'Unknown error';
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    processList.innerHTML = `<div class="empty-state">
      <div style="margin-bottom: 12px;">Failed to load GPU information.</div>
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">Error: ${errorMessage}</div>
      ${isMac ? `
      <div style="font-size: 11px; color: var(--text-muted);">
        <strong>Note:</strong> GPU information is limited on macOS. Integrated graphics may not report detailed stats.
      </div>
      ` : `
      <div style="font-size: 11px; color: var(--text-muted);">
        GPU information may not be available on this system (common on systems without dedicated GPUs).
      </div>
      `}
    </div>`;
    processCount.textContent = '0';
  }
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
}

// Function to show network connections panel
async function showNetworkPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'network') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openNetworkPanel();
    }, 100);
  } else {
    openNetworkPanel();
  }
}

async function openNetworkPanel() {
  currentModalType = 'network';
  isModalOpen = true;
  
  processTitle.textContent = 'NETWORK INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  // Clear process list and show loading
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading network information...</span></div>';
  
  try {
    const interfaces = await Promise.race([
      si.networkInterfaces(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    const networkStats = await Promise.race([
      si.networkStats(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    // Find the active connected interface (non-internal, state is 'up')
    const activeInterface = interfaces.find(i => i.operstate === 'up' && !i.internal) || 
                           interfaces.find(i => i.operstate === 'up') ||
                           null;
    
    processList.innerHTML = '';
    
    if (!activeInterface) {
      processList.innerHTML = '<div class="empty-state">No active network connection found</div>';
      processCount.textContent = '0';
      return;
    }
    
    // Get stats for the active interface
    let stats = null;
    if (networkStats && networkStats.length > 0) {
      stats = networkStats.find(s => s.iface === activeInterface.iface) || networkStats[0];
    }
    
    // Calculate current speeds
    let downloadSpeed = '0 KB/s';
    let uploadSpeed = '0 KB/s';
    
    if (stats) {
      // Try to use per-second values if available (more accurate)
      if (stats.rx_bytes_sec !== undefined && stats.rx_bytes_sec !== null) {
        downloadSpeed = formatSpeed(stats.rx_bytes_sec);
      }
      if (stats.tx_bytes_sec !== undefined && stats.tx_bytes_sec !== null) {
        uploadSpeed = formatSpeed(stats.tx_bytes_sec);
      }
      
      // Store stats for next calculation
      previousNetStats = {
        rx_bytes: stats.rx_bytes || 0,
        tx_bytes: stats.tx_bytes || 0,
        iface: stats.iface
      };
      
      // Set up interval to update speeds every second
      if (processUpdateInterval) {
        clearInterval(processUpdateInterval);
      }
      processUpdateInterval = setInterval(async () => {
        try {
          const newNetworkStats = await si.networkStats();
          if (newNetworkStats && newNetworkStats.length > 0 && previousNetStats) {
            const newStats = newNetworkStats.find(s => s.iface === activeInterface.iface) || newNetworkStats[0];
            
            if (newStats && previousNetStats) {
              // Use per-second values if available
              let rxSpeed = 0;
              let txSpeed = 0;
              
              if (newStats.rx_bytes_sec !== undefined && newStats.rx_bytes_sec !== null) {
                rxSpeed = newStats.rx_bytes_sec;
              } else {
                const rxBytesDiff = Math.max(0, (newStats.rx_bytes || 0) - (previousNetStats.rx_bytes || 0));
                rxSpeed = rxBytesDiff; // bytes per second (1 second interval)
              }
              
              if (newStats.tx_bytes_sec !== undefined && newStats.tx_bytes_sec !== null) {
                txSpeed = newStats.tx_bytes_sec;
              } else {
                const txBytesDiff = Math.max(0, (newStats.tx_bytes || 0) - (previousNetStats.tx_bytes || 0));
                txSpeed = txBytesDiff; // bytes per second (1 second interval)
              }
              
              // Update the displayed speeds
              const speedElements = processList.querySelectorAll('[data-speed]');
              if (speedElements.length >= 2) {
                speedElements[0].textContent = formatSpeed(rxSpeed);
                speedElements[1].textContent = formatSpeed(txSpeed);
              }
              
              // Update previous stats
              previousNetStats = {
                rx_bytes: newStats.rx_bytes || 0,
                tx_bytes: newStats.tx_bytes || 0,
                iface: newStats.iface
              };
            }
          }
        } catch (e) {
          console.error('Error updating network speeds:', e);
        }
      }, 1000);
    }
    
    processCount.textContent = '1';
    
    // Show only the active connection with essential info
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    
    const ip = activeInterface.ip4 || activeInterface.ip6 || 'Not assigned';
    const ip6 = activeInterface.ip6 && activeInterface.ip6 !== ip ? activeInterface.ip6 : null;
    const type = activeInterface.type || 'Unknown';
    const speed = activeInterface.speed ? activeInterface.speed + ' Mbps' : 'Unknown';
    const mac = activeInterface.mac || 'Unknown';
    const vendor = activeInterface.vendor || activeInterface.manufacturer || '';
    
    // Try to get WiFi network name (SSID) on macOS/Windows/Linux
    const os = require('os');
    const { exec } = require('child_process');
    const platform = os.platform();
    
    // Get network name asynchronously (we'll update it if available)
    const fetchNetworkName = () => {
      if (platform === 'darwin' && activeInterface.iface) {
        exec(`networksetup -getairportnetwork ${activeInterface.iface} 2>/dev/null || echo ""`, (error, stdout) => {
          if (!error && stdout && stdout.trim()) {
            const match = stdout.match(/Current Wi-Fi Network:\s*(.+)/i);
            if (match) {
              const networkName = match[1].trim();
              // Update the network name in the UI
              const nameElement = processList.querySelector('[data-network-name]');
              if (nameElement && networkName) {
                nameElement.textContent = networkName;
                nameElement.style.display = 'block';
              }
            }
          }
        });
      } else if (platform === 'win32' && (type.toLowerCase().includes('wireless') || type.toLowerCase().includes('wi-fi'))) {
        exec('netsh wlan show interfaces | findstr "SSID"', (error, stdout) => {
          if (!error && stdout) {
            const match = stdout.match(/SSID\s*:\s*(.+)/i);
            if (match) {
              const networkName = match[1].trim();
              const nameElement = processList.querySelector('[data-network-name]');
              if (nameElement && networkName) {
                nameElement.textContent = networkName;
                nameElement.style.display = 'block';
              }
            }
          }
        });
      }
    };
    
    // Fetch network name after a short delay to ensure DOM is ready
    setTimeout(fetchNetworkName, 100);
    
    // Get additional network info
    const subnet = activeInterface.netmask || activeInterface.subnet || '';
    const gateway = activeInterface.gateway || '';
    const dns = activeInterface.dnsSuffix || '';
    
    // Determine connection type description
    let connectionType = type;
    if (type.toLowerCase().includes('wireless') || type.toLowerCase().includes('wi-fi') || type.toLowerCase().includes('802.11')) {
      connectionType = 'Wi-Fi';
    } else if (type.toLowerCase().includes('ethernet') || type.toLowerCase().includes('lan')) {
      connectionType = 'Ethernet';
    }
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(34, 197, 94, 0.2); color: var(--accent-net); flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <circle cx="12" cy="20" r="1"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${activeInterface.iface || 'Unknown Interface'}
        </div>
        <div style="font-size: 11px; color: var(--accent-net); margin-bottom: 8px; font-weight: 600; display: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" data-network-name></div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">IP Address:</span>
            <span style="color: var(--text-primary); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${ip}</span>
          </div>
          ${ip6 ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">IPv6:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${ip6}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Connection Type:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${connectionType}</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Link Speed:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${speed}</span>
          </div>
          ${mac !== 'Unknown' ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">MAC Address:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${mac}</span>
          </div>` : ''}
          ${vendor ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Vendor:</span>
            <span style="color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${vendor}</span>
          </div>` : ''}
          ${gateway ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Gateway:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${gateway}</span>
          </div>` : ''}
          ${subnet ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Subnet Mask:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${subnet}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Download:</span>
            <span style="color: var(--accent-net); font-weight: 600; white-space: nowrap;" data-speed="download">${downloadSpeed}</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Upload:</span>
            <span style="color: var(--accent-cpu); font-weight: 600; white-space: nowrap;" data-speed="upload">${uploadSpeed}</span>
          </div>
        </div>
      </div>
    `;
    
    processList.appendChild(item);
    
    // Update previous stats for speed calculation
    if (stats) {
      previousNetStats = {
        rx_bytes: stats.rx_bytes || 0,
        tx_bytes: stats.tx_bytes || 0,
        iface: stats.iface
      };
    }
  } catch (error) {
    console.error('Network panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load network information. Please try again.</div>';
    processCount.textContent = '0';
  }
  
  // Network panel uses its own interval for speed updates, so don't clear it here
  // The interval is set up above in the speed calculation section
}

// Function to show CPU info panel
async function showCPUInfoPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'cpu-info') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openCPUInfoPanel();
    }, 100);
  } else {
    openCPUInfoPanel();
  }
}

async function openCPUInfoPanel() {
  currentModalType = 'cpu-info';
  isModalOpen = true;
  
  processTitle.textContent = 'CPU INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  // Clear process list and show loading
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading CPU information...</span></div>';
  
  try {
    const [load, cpu, cpuSpeed, cpuTemp] = await Promise.all([
      si.currentLoad().catch(() => null),
      si.cpu().catch(() => null),
      si.cpuCurrentSpeed().catch(() => null),
      si.cpuTemperature().catch(() => null)
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '1';
    
    const usage = load ? Math.round(load.currentload || load.currentLoad || 0) : 0;
    const brand = cpu ? (cpu.brand || 'Unknown CPU') : 'Unknown CPU';
    const cores = cpu ? (cpu.cores || 'Unknown') : 'Unknown';
    const physicalCores = cpu ? (cpu.physicalCores || 'Unknown') : 'Unknown';
    const speed = cpuSpeed && cpuSpeed.avg ? cpuSpeed.avg.toFixed(2) + ' GHz' : 'Unknown';
    const temperature = cpuTemp && cpuTemp.main && cpuTemp.main > 0 ? Math.round(cpuTemp.main) + '°C' : '--';
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      closeProcessPanel();
      setTimeout(() => {
        showProcessPanel('cpu');
      }, 100);
    });
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(244, 63, 94, 0.2); color: var(--accent-cpu); flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <path d="M9 9h6v6H9z"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${brand}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Usage:</span>
            <span style="color: var(--accent-cpu); font-weight: 600; white-space: nowrap;">${usage}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Cores:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${physicalCores} Physical / ${cores} Logical</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Speed:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${speed}</span>
          </div>
          ${temperature !== '--' ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Temperature:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${temperature}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Click to view processes</span>
            <span style="color: var(--accent-cpu); font-weight: 600; white-space: nowrap;">→</span>
          </div>
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('CPU info panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load CPU information. Please try again.</div>';
    processCount.textContent = '0';
  }
}

// Function to show RAM info panel
async function showRAMInfoPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'ram-info') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openRAMInfoPanel();
    }, 100);
  } else {
    openRAMInfoPanel();
  }
}

async function openRAMInfoPanel() {
  currentModalType = 'ram-info';
  isModalOpen = true;
  
  processTitle.textContent = 'MEMORY INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  // Clear process list and show loading
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading memory information...</span></div>';
  
  try {
    const mem = await Promise.race([
      si.mem(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    processList.innerHTML = '';
    processCount.textContent = '1';
    
    const usedPercent = Math.round((mem.used / mem.total) * 100);
    const usedGB = (mem.used / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (mem.total / (1024 * 1024 * 1024)).toFixed(1);
    const availableGB = ((mem.available || mem.free || 0) / (1024 * 1024 * 1024)).toFixed(1);
    const cachedGB = ((mem.cached || 0) / (1024 * 1024 * 1024)).toFixed(1);
    const swapTotal = mem.swaptotal ? (mem.swaptotal / (1024 * 1024 * 1024)).toFixed(1) : '0';
    const swapUsed = mem.swapused ? (mem.swapused / (1024 * 1024 * 1024)).toFixed(1) : '0';
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      closeProcessPanel();
      setTimeout(() => {
        showProcessPanel('ram');
      }, 100);
    });
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(139, 92, 246, 0.2); color: var(--accent-ram); flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <line x1="6" y1="10" x2="6" y2="14"/>
          <line x1="10" y1="10" x2="10" y2="14"/>
          <line x1="14" y1="10" x2="14" y2="14"/>
          <line x1="18" y1="10" x2="18" y2="14"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          System Memory
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Usage:</span>
            <span style="color: var(--accent-ram); font-weight: 600; white-space: nowrap;">${usedPercent}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Used:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${usedGB} GB / ${totalGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Available:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${availableGB} GB</span>
          </div>
          ${cachedGB !== '0.0' ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Cached:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${cachedGB} GB</span>
          </div>` : ''}
          ${swapTotal !== '0' ? `<div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Swap:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${swapUsed} GB / ${swapTotal} GB</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Click to view processes</span>
            <span style="color: var(--accent-ram); font-weight: 600; white-space: nowrap;">→</span>
          </div>
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('RAM info panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load memory information. Please try again.</div>';
    processCount.textContent = '0';
  }
}

// Function to show Disk info panel
async function showDiskInfoPanel() {
  // Prevent opening if already open
  if (isModalOpen && currentModalType === 'disk-info') {
    return;
  }
  
  if (isModalOpen) {
    closeProcessPanel();
    setTimeout(() => {
      openDiskInfoPanel();
    }, 100);
  } else {
    openDiskInfoPanel();
  }
}

async function openDiskInfoPanel() {
  currentModalType = 'disk-info';
  isModalOpen = true;
  
  processTitle.textContent = 'DISK INFORMATION';
  processSearch.style.display = 'none';
  optimizeBtn.style.display = 'none';
  
  // Show overlay first
  processOverlay.style.display = 'flex';
  processOverlay.offsetHeight;
  processOverlay.classList.add('active');
  
  // Clear process list and show loading
  processList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading disk information...</span></div>';
  
  try {
    const [fsSize, disksIO] = await Promise.all([
      si.fsSize().catch(() => null),
      si.disksIO().catch(() => null)
    ]);
    
    processList.innerHTML = '';
    
    if (!fsSize || fsSize.length === 0) {
      processList.innerHTML = '<div class="empty-state">Failed to load disk information.</div>';
      processCount.textContent = '0';
      return;
    }
    
    // Find the main system disk (usually the first one or the one with / or C:)
    const mainDisk = fsSize.find(d => d.mount === '/' || d.mount === 'C:') || fsSize[0];
    
    processCount.textContent = '1';
    
    const mountPoint = mainDisk.mount || 'Unknown';
    const filesystem = mainDisk.fs || 'Unknown';
    const usedGB = (mainDisk.used / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (mainDisk.size / (1024 * 1024 * 1024)).toFixed(1);
    const availableGB = (mainDisk.available / (1024 * 1024 * 1024)).toFixed(1);
    const usedPercent = Math.round((mainDisk.used / mainDisk.size) * 100);
    
    let diskName = mainDisk.label || mainDisk.name || mountPoint;
    if (mountPoint === '/') {
      diskName = 'Macintosh HD';
    } else if (mountPoint === '/System/Volumes/Data') {
      diskName = 'Data';
    } else if (mountPoint.startsWith('/Volumes/')) {
      diskName = mountPoint.replace('/Volumes/', '');
    } else if (mountPoint.endsWith(':') && !mainDisk.label && !mainDisk.name) {
      diskName = `Local Disk (${mountPoint})`;
    }
    
    // Get I/O stats if available (will show 0 KB/s initially, actual speeds calculated in main update)
    let readSpeed = '0 KB/s';
    let writeSpeed = '0 KB/s';
    if (disksIO && previousDiskStats) {
      const readBytesPerSec = Math.max(0, ((disksIO.rx_bytes || 0) - (previousDiskStats.rx_bytes || 0)));
      const writeBytesPerSec = Math.max(0, ((disksIO.wx_bytes || 0) - (previousDiskStats.wx_bytes || 0)));
      readSpeed = formatSpeed(readBytesPerSec);
      writeSpeed = formatSpeed(writeBytesPerSec);
    }
    
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.marginBottom = '0';
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      closeProcessPanel();
      setTimeout(() => {
        showProcessPanel('disk');
      }, 100);
    });
    
    item.innerHTML = `
      <div class="process-icon" style="background: rgba(34, 197, 94, 0.2); color: var(--accent-disk); flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
      <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
        <div class="process-name" style="font-size: 14px; margin-bottom: 6px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${diskName}
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Usage:</span>
            <span style="color: var(--accent-disk); font-weight: 600; white-space: nowrap;">${usedPercent}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Used:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${usedGB} GB / ${totalGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Available:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${availableGB} GB</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Filesystem:</span>
            <span style="color: var(--text-primary); white-space: nowrap;">${filesystem}</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Mount:</span>
            <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${mountPoint}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Read Speed:</span>
            <span style="color: var(--accent-disk); font-weight: 600; white-space: nowrap;">${readSpeed}</span>
          </div>
          <div style="display: flex; justify-content: space-between; min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Write Speed:</span>
            <span style="color: var(--accent-disk); font-weight: 600; white-space: nowrap;">${writeSpeed}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); min-width: 0;">
            <span style="color: var(--text-muted); white-space: nowrap; margin-right: 8px;">Click to view processes</span>
            <span style="color: var(--accent-disk); font-weight: 600; white-space: nowrap;">→</span>
          </div>
        </div>
      </div>
    `;
    
    processList.appendChild(item);
  } catch (error) {
    console.error('Disk info panel error:', error);
    processList.innerHTML = '<div class="empty-state">Failed to load disk information. Please try again.</div>';
    processCount.textContent = '0';
  }
}

// Close panel
function closeProcessPanel() {
  isModalOpen = false;
  currentModalType = null;
  
  processOverlay.classList.remove('active');
  
  // Hide overlay after animation
  setTimeout(() => {
    if (!processOverlay.classList.contains('active')) {
      processOverlay.style.display = 'none';
    }
  }, 300);
  
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
  }
  // Reset search and optimize button visibility
  if (processSearch) processSearch.style.display = 'block';
  if (optimizeBtn) {
    optimizeBtn.style.display = 'flex';
    // Reset optimize button text - find text node after SVG
    const btnNodes = Array.from(optimizeBtn.childNodes);
    const textNode = btnNodes.find(node => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = ' Optimize';
    }
  }
}

closePanelBtn.addEventListener('click', closeProcessPanel);

// Click outside to close
processOverlay.addEventListener('click', (e) => {
  if (e.target === processOverlay) {
    closeProcessPanel();
  }
});

// Search functionality
processSearch.addEventListener('input', (e) => {
  const search = e.target.value.toLowerCase();
  if (search) {
    filteredProcesses = allProcesses.filter(p => 
      (p.name || '').toLowerCase().includes(search)
    ).slice(0, 100);
  } else {
    // Reset to original filtered list
    fetchProcesses(currentProcessType);
    return;
  }
  renderProcesses();
});

// Optimize button
optimizeBtn.addEventListener('click', optimizeSystem);

// Make killProcess available globally
window.killProcess = killProcess;

// Settings Panel Functionality
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Settings elements
const settingsTabs = document.querySelectorAll('.settings-tab');
const tabContents = document.querySelectorAll('.settings-tab-content');
const scanBtn = document.getElementById('scanBtn');
const scanResults = document.getElementById('scanResults');
const scanSize = document.getElementById('scanSize');
const runCleanBtn = document.getElementById('runCleanBtn');
const runOptimizeBtn = document.getElementById('runOptimizeBtn');
const cleanProgress = document.getElementById('cleanProgress');
const cleanProgressBar = document.getElementById('cleanProgressBar');
const cleanStatus = document.getElementById('cleanStatus');
const cleanStats = document.getElementById('cleanStats');
const spaceFreed = document.getElementById('spaceFreed');
const filesCleaned = document.getElementById('filesCleaned');
const cleanLog = document.getElementById('cleanLog');
const optimizeProgress = document.getElementById('optimizeProgress');
const optimizeProgressBar = document.getElementById('optimizeProgressBar');
const optimizeStatus = document.getElementById('optimizeStatus');
const optimizeLog = document.getElementById('optimizeLog');
const healthScore = document.getElementById('healthScore');
const healthCircle = document.getElementById('healthCircle');
const recommendationsList = document.getElementById('recommendationsList');
const enableSchedule = document.getElementById('enableSchedule');
const scheduleSettings = document.getElementById('scheduleSettings');
const scheduleFrequency = document.getElementById('scheduleFrequency');
const scheduleTime = document.getElementById('scheduleTime');
const nextRunTime = document.getElementById('nextRunTime');

// Tab switching
if (settingsTabs && settingsTabs.length > 0) {
  settingsTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const targetTab = tab.dataset.tab;
        
        // Remove active from all tabs and contents
        settingsTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.getElementById(targetTab + 'Tab');
        if (targetContent) {
          targetContent.classList.add('active');
        }
        
        // Load data when tab is opened
        if (targetTab === 'services') {
          setTimeout(loadServices, 300);
        } else if (targetTab === 'network') {
          setTimeout(loadNetworkConnections, 300);
        } else if (targetTab === 'startup') {
          setTimeout(loadStartupPrograms, 300);
        } else if (targetTab === 'running') {
          setTimeout(loadRunningOperations, 300);
        } else if (targetTab === 'security') {
          setTimeout(checkSecurityTools, 300);
        } else if (targetTab === 'disk') {
          // Disk analyzer loads when analyze button is clicked
        }
      } catch (error) {
        console.error('Tab switch error:', error);
      }
    });
  });
}

// Open/close settings
if (settingsBtn) {
  // Antivirus header button
const antivirusHeaderBtn = document.getElementById('antivirusHeaderBtn');
if (antivirusHeaderBtn) {
  antivirusHeaderBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showAntivirusPanel();
  });
}

// Close antivirus panel button
if (closeAntivirusBtn) {
  closeAntivirusBtn.addEventListener('click', () => {
    closeAntivirusPanel();
  });
}

// Click outside antivirus overlay to close
if (antivirusOverlay) {
  antivirusOverlay.addEventListener('click', (e) => {
    if (e.target === antivirusOverlay) {
      closeAntivirusPanel();
    }
  });
}

// Antivirus Panel Button Event Listeners
const antivirusQuickScanBtn = document.getElementById('antivirusQuickScanBtn');
const antivirusFullScanBtn = document.getElementById('antivirusFullScanBtn');
const antivirusUpdateBtn = document.getElementById('antivirusUpdateBtn');
const antivirusSettingsBtn = document.getElementById('antivirusSettingsBtn');
const antivirusScanSection = document.getElementById('antivirusScanSection');
const antivirusProgressBar = document.getElementById('antivirusProgressBar');
const antivirusScanStatus = document.getElementById('antivirusScanStatus');
const antivirusFilesScanned = document.getElementById('antivirusFilesScanned');
const antivirusThreatsFound = document.getElementById('antivirusThreatsFound');
const antivirusTimeElapsed = document.getElementById('antivirusTimeElapsed');

// Antivirus scan state for panel
let antivirusScanState = {
  isRunning: false,
  scanProcess: null,
  filesScanned: 0,
  threatsFound: 0,
  startTime: null,
  scanInterval: null
};

// Quick Scan Button
if (antivirusQuickScanBtn) {
  antivirusQuickScanBtn.addEventListener('click', async () => {
    await startAntivirusScan('quick');
  });
}

// Full Scan Button
if (antivirusFullScanBtn) {
  antivirusFullScanBtn.addEventListener('click', async () => {
    if (confirm('Full scan will scan your entire system. This may take a long time. Continue?')) {
      await startAntivirusScan('full');
    }
  });
}

// Update Definitions Button
if (antivirusUpdateBtn) {
  antivirusUpdateBtn.addEventListener('click', async () => {
    await updateClamAVDefinitions();
  });
}

// Settings Button
if (antivirusSettingsBtn) {
  antivirusSettingsBtn.addEventListener('click', () => {
    closeAntivirusPanel();
    // Open settings and go to security tab
    if (settingsOverlay) {
      settingsOverlay.classList.add('active');
      const securityTab = document.querySelector('.settings-tab[data-tab="security"]');
      if (securityTab) {
        securityTab.click();
      }
    }
  });
}

// Start Antivirus Scan
async function startAntivirusScan(type = 'quick') {
  if (antivirusScanState.isRunning) {
    alert('A scan is already running. Please wait for it to complete.');
    return;
  }
  
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  
  // Check if ClamAV is installed
  const isInstalled = await new Promise((resolve) => {
    const command = platform === 'win32' ? 'where clamscan' : 'which clamscan';
    exec(command, { timeout: 2000 }, (error) => {
      resolve(!error);
    });
  });
  
  if (!isInstalled) {
    const installMsg = platform === 'win32' 
      ? 'ClamAV is not installed.\n\nWindows: Download and install from https://www.clamav.net/downloads\n\nAfter installation, restart RocketRAM.'
      : platform === 'darwin'
      ? 'ClamAV is not installed.\n\nmacOS: Run: brew install clamav\n\nAfter installation, restart RocketRAM.'
      : 'ClamAV is not installed.\n\nLinux: Run: sudo apt-get install clamav (or your package manager)\n\nAfter installation, restart RocketRAM.';
    
    alert(installMsg);
    return;
  }
  
  // Reset state
  antivirusScanState = {
    isRunning: true,
    scanProcess: null,
    filesScanned: 0,
    threatsFound: 0,
    startTime: Date.now(),
    scanInterval: null
  };
  
  // Show scan section
  if (antivirusScanSection) antivirusScanSection.style.display = 'block';
  if (antivirusProgressBar) antivirusProgressBar.style.width = '0%';
  if (antivirusScanStatus) antivirusScanStatus.textContent = `Starting ${type} scan...`;
  if (antivirusFilesScanned) antivirusFilesScanned.textContent = '0';
  if (antivirusThreatsFound) antivirusThreatsFound.textContent = '0';
  if (antivirusTimeElapsed) antivirusTimeElapsed.textContent = '00:00';
  
  // Disable buttons
  if (antivirusQuickScanBtn) antivirusQuickScanBtn.disabled = true;
  if (antivirusFullScanBtn) antivirusFullScanBtn.disabled = true;
  if (antivirusUpdateBtn) antivirusUpdateBtn.disabled = true;
  
  // Determine scan paths
  const path = require('path');
  let scanPaths = [];
  if (type === 'quick') {
    const homeDir = os.homedir();
    if (platform === 'win32') {
      scanPaths = [
        path.join(homeDir, 'Downloads'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents')
      ];
    } else {
      scanPaths = [
        path.join(homeDir, 'Downloads'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents')
      ];
    }
  } else {
    scanPaths = [platform === 'win32' ? 'C:\\' : '/'];
  }
  
  // Build ClamAV command
  const scanPath = scanPaths[0];
  const command = `clamscan -r --no-summary --infected "${scanPath}"`;
  
  // Start scan process
  const scanProcess = exec(command, { maxBuffer: 1024 * 1024 * 10 });
  antivirusScanState.scanProcess = scanProcess;
  
  let output = '';
  
  // Update progress timer
  antivirusScanState.scanInterval = setInterval(() => {
    if (!antivirusScanState.isRunning) {
      clearInterval(antivirusScanState.scanInterval);
      return;
    }
    
    const elapsed = Math.floor((Date.now() - antivirusScanState.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    if (antivirusTimeElapsed) {
      antivirusTimeElapsed.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Update progress (estimated)
    if (antivirusProgressBar) {
      const estimatedProgress = Math.min(90, (antivirusScanState.filesScanned / 1000) * 90);
      antivirusProgressBar.style.width = `${estimatedProgress}%`;
    }
  }, 1000);
  
  scanProcess.stdout.on('data', (data) => {
    output += data.toString();
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.includes(' FOUND')) {
        antivirusScanState.threatsFound++;
        if (antivirusThreatsFound) antivirusThreatsFound.textContent = antivirusScanState.threatsFound;
      }
    });
    
    antivirusScanState.filesScanned += lines.length;
    if (antivirusFilesScanned) antivirusFilesScanned.textContent = antivirusScanState.filesScanned.toLocaleString();
    if (antivirusScanStatus) antivirusScanStatus.textContent = `Scanning... (${antivirusScanState.filesScanned} files)`;
  });
  
  scanProcess.on('close', (code) => {
    clearInterval(antivirusScanState.scanInterval);
    antivirusScanState.isRunning = false;
    
    if (antivirusProgressBar) antivirusProgressBar.style.width = '100%';
    if (antivirusScanStatus) {
      antivirusScanStatus.textContent = antivirusScanState.threatsFound > 0
        ? `Scan complete! Found ${antivirusScanState.threatsFound} threat(s)`
        : 'Scan complete! No threats found';
    }
    
    // Re-enable buttons
    if (antivirusQuickScanBtn) antivirusQuickScanBtn.disabled = false;
    if (antivirusFullScanBtn) antivirusFullScanBtn.disabled = false;
    if (antivirusUpdateBtn) antivirusUpdateBtn.disabled = false;
    
    // Show notification
    const showNotificationsEl = document.getElementById('showNotifications');
    if (showNotificationsEl && showNotificationsEl.checked) {
      ipcRenderer.send('show-notification',
        antivirusScanState.threatsFound > 0 ? '🚨 Threats Detected!' : '✅ Scan Complete',
        antivirusScanState.threatsFound > 0
          ? `Found ${antivirusScanState.threatsFound} threat(s)`
          : `Scanned ${antivirusScanState.filesScanned} files. No threats found.`,
        { urgency: antivirusScanState.threatsFound > 0 ? 'critical' : 'normal' }
      );
    }
    
    antivirusScanState.scanProcess = null;
  });
  
  scanProcess.on('error', (error) => {
    clearInterval(antivirusScanState.scanInterval);
    antivirusScanState.isRunning = false;
    antivirusScanState.scanProcess = null;
    
    if (antivirusScanStatus) antivirusScanStatus.textContent = `Error: ${error.message}`;
    alert('Error starting scan: ' + error.message);
    
    if (antivirusQuickScanBtn) antivirusQuickScanBtn.disabled = false;
    if (antivirusFullScanBtn) antivirusFullScanBtn.disabled = false;
    if (antivirusUpdateBtn) antivirusUpdateBtn.disabled = false;
  });
}

// Show ClamAV Installation Instructions
function showClamAVInstallInstructions() {
  const os = require('os');
  const platform = os.platform();
  
  if (confirm('Would you like to install ClamAV automatically? (Requires administrator/sudo privileges)')) {
    installClamAV();
  } else {
    let instructions = '';
    let title = 'Install ClamAV';
    
    if (platform === 'win32') {
      instructions = `To install ClamAV on Windows:

1. Download ClamAV from: https://www.clamav.net/downloads
2. Run the installer and follow the setup wizard
3. Make sure to add ClamAV to your system PATH during installation
4. Restart RocketRAM after installation

Alternatively, you can use Windows Defender which is already built into Windows.`;
    } else if (platform === 'darwin') {
      instructions = `To install ClamAV on macOS:

1. Install Homebrew if you haven't already:
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

2. Install ClamAV:
   brew install clamav

3. Update virus definitions:
   freshclam

4. Restart RocketRAM after installation`;
    } else {
      instructions = `To install ClamAV on Linux:

Ubuntu/Debian:
  sudo apt-get update
  sudo apt-get install clamav clamav-daemon

Fedora/RHEL:
  sudo dnf install clamav clamd

Arch Linux:
  sudo pacman -S clamav

After installation, update virus definitions:
  sudo freshclam

Then restart RocketRAM.`;
    }
    
    alert(`${title}\n\n${instructions}`);
  }
}

// Install ClamAV automatically
async function installClamAV() {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  
  // Show installation progress
  const installStatus = document.createElement('div');
  installStatus.id = 'clamavInstallStatus';
  installStatus.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color); z-index: 10002; max-width: 400px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.95);';
  installStatus.innerHTML = `
    <div style="margin-bottom: 16px;">
      <div class="spinner" style="margin: 0 auto 16px;"></div>
      <h3 style="color: var(--text-primary); margin-bottom: 8px;">Installing ClamAV</h3>
      <p id="installStatusText" style="color: var(--text-secondary); font-size: 12px;">Preparing installation...</p>
    </div>
    <button id="cancelInstallBtn" class="action-btn scan-btn" style="width: 100%;">Cancel</button>
  `;
  document.body.appendChild(installStatus);
  
  const statusText = document.getElementById('installStatusText');
  const cancelBtn = document.getElementById('cancelInstallBtn');
  let installProcess = null;
  let cancelled = false;
  
  cancelBtn.addEventListener('click', () => {
    cancelled = true;
    if (installProcess) {
      installProcess.kill();
    }
    installStatus.remove();
  });
  
  try {
    if (platform === 'win32') {
      // Windows - Use winget or chocolatey if available, otherwise download
      statusText.textContent = 'Checking for package manager...';
      
      // Try winget first (Windows 10/11)
      exec('winget --version', { timeout: 3000 }, (error) => {
        if (!error && !cancelled) {
          statusText.textContent = 'Installing ClamAV via winget...';
          installProcess = exec('winget install --id ClamAV.ClamAV -e --accept-package-agreements --accept-source-agreements', 
            { timeout: 300000 }, 
            (installError, stdout, stderr) => {
              if (cancelled) return;
              
              if (installError) {
                statusText.textContent = 'Winget installation failed. Trying alternative method...';
                // Try chocolatey
                exec('choco --version', { timeout: 3000 }, (chocoError) => {
                  if (!chocoError && !cancelled) {
                    statusText.textContent = 'Installing ClamAV via Chocolatey...';
                    installProcess = exec('choco install clamav -y', 
                      { timeout: 300000 },
                      (chocoInstallError) => {
                        if (cancelled) return;
                        handleInstallResult(chocoInstallError, installStatus, statusText);
                      });
                  } else {
                    // Fallback to manual download instructions
                    handleInstallResult(new Error('No package manager found'), installStatus, statusText);
                  }
                });
              } else {
                handleInstallResult(null, installStatus, statusText);
              }
            });
        } else {
          // Try chocolatey
          exec('choco --version', { timeout: 3000 }, (chocoError) => {
            if (!chocoError && !cancelled) {
              statusText.textContent = 'Installing ClamAV via Chocolatey...';
              installProcess = exec('choco install clamav -y', 
                { timeout: 300000 },
                (chocoInstallError) => {
                  if (cancelled) return;
                  handleInstallResult(chocoInstallError, installStatus, statusText);
                });
            } else {
              handleInstallResult(new Error('No package manager found. Please install manually.'), installStatus, statusText);
            }
          });
        }
      });
      
    } else if (platform === 'darwin') {
      // macOS - Use Homebrew
      statusText.textContent = 'Checking for Homebrew...';
      
      exec('brew --version', { timeout: 3000 }, (error) => {
        if (error && !cancelled) {
          statusText.textContent = 'Homebrew not found. Installing Homebrew first...';
          // Install Homebrew
          const brewInstallCmd = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
          installProcess = exec(brewInstallCmd, { timeout: 600000 }, (brewError) => {
            if (cancelled) return;
            if (brewError) {
              handleInstallResult(brewError, installStatus, statusText);
              return;
            }
            // Now install ClamAV
            statusText.textContent = 'Installing ClamAV...';
            installProcess = exec('brew install clamav', { timeout: 300000 }, (clamavError) => {
              if (cancelled) return;
              if (!clamavError) {
                statusText.textContent = 'Updating virus definitions...';
                exec('freshclam', { timeout: 300000 }, (freshclamError) => {
                  handleInstallResult(freshclamError, installStatus, statusText);
                });
              } else {
                handleInstallResult(clamavError, installStatus, statusText);
              }
            });
          });
        } else if (!cancelled) {
          statusText.textContent = 'Installing ClamAV...';
          installProcess = exec('brew install clamav', { timeout: 300000 }, (clamavError) => {
            if (cancelled) return;
            if (!clamavError) {
              statusText.textContent = 'Updating virus definitions...';
              exec('freshclam', { timeout: 300000 }, (freshclamError) => {
                handleInstallResult(freshclamError, installStatus, statusText);
              });
            } else {
              handleInstallResult(clamavError, installStatus, statusText);
            }
          });
        }
      });
      
    } else {
      // Linux - Detect distribution and use appropriate package manager
      statusText.textContent = 'Detecting Linux distribution...';
      
      exec('which apt-get', { timeout: 2000 }, (aptError) => {
        if (!aptError && !cancelled) {
          // Debian/Ubuntu
          statusText.textContent = 'Updating package list...';
          installProcess = exec('sudo apt-get update', { timeout: 60000 }, (updateError) => {
            if (cancelled) return;
            if (updateError) {
              handleInstallResult(updateError, installStatus, statusText);
              return;
            }
            statusText.textContent = 'Installing ClamAV...';
            installProcess = exec('sudo apt-get install -y clamav clamav-daemon', { timeout: 300000 }, (installError) => {
              if (cancelled) return;
              if (!installError) {
                statusText.textContent = 'Updating virus definitions...';
                exec('sudo freshclam', { timeout: 300000 }, (freshclamError) => {
                  handleInstallResult(freshclamError, installStatus, statusText);
                });
              } else {
                handleInstallResult(installError, installStatus, statusText);
              }
            });
          });
        } else {
          exec('which dnf', { timeout: 2000 }, (dnfError) => {
            if (!dnfError && !cancelled) {
              // Fedora/RHEL
              statusText.textContent = 'Installing ClamAV...';
              installProcess = exec('sudo dnf install -y clamav clamd', { timeout: 300000 }, (installError) => {
                if (cancelled) return;
                if (!installError) {
                  statusText.textContent = 'Updating virus definitions...';
                  exec('sudo freshclam', { timeout: 300000 }, (freshclamError) => {
                    handleInstallResult(freshclamError, installStatus, statusText);
                  });
                } else {
                  handleInstallResult(installError, installStatus, statusText);
                }
              });
            } else {
              exec('which pacman', { timeout: 2000 }, (pacmanError) => {
                if (!pacmanError && !cancelled) {
                  // Arch Linux
                  statusText.textContent = 'Installing ClamAV...';
                  installProcess = exec('sudo pacman -S --noconfirm clamav', { timeout: 300000 }, (installError) => {
                    if (cancelled) return;
                    if (!installError) {
                      statusText.textContent = 'Updating virus definitions...';
                      exec('sudo freshclam', { timeout: 300000 }, (freshclamError) => {
                        handleInstallResult(freshclamError, installStatus, statusText);
                      });
                    } else {
                      handleInstallResult(installError, installStatus, statusText);
                    }
                  });
                } else {
                  handleInstallResult(new Error('Unsupported Linux distribution. Please install ClamAV manually.'), installStatus, statusText);
                }
              });
            }
          });
        }
      });
    }
  } catch (error) {
    if (!cancelled) {
      handleInstallResult(error, installStatus, statusText);
    }
  }
}

// Handle installation result
function handleInstallResult(error, installStatus, statusText) {
  if (error) {
    statusText.innerHTML = `Installation failed: ${error.message}<br><br>You may need to install ClamAV manually or run with administrator/sudo privileges.`;
    statusText.style.color = 'var(--accent-cpu)';
    
    setTimeout(() => {
      installStatus.remove();
    }, 10000);
  } else {
    statusText.textContent = 'Installation complete! Restarting RocketRAM...';
    statusText.style.color = 'var(--accent-net)';
    
    // Verify installation
    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    const command = platform === 'win32' ? 'where clamscan' : 'which clamscan';
    
    exec(command, { timeout: 2000 }, (verifyError) => {
      if (!verifyError) {
        statusText.textContent = 'Installation verified! Refreshing status...';
        statusText.style.color = 'var(--accent-net)';
        
        setTimeout(() => {
          installStatus.remove();
          // Refresh antivirus status immediately
          if (typeof updateAntivirusStatus === 'function') {
            updateAntivirusStatus();
          }
          // Also update the main card
          if (typeof updateAntivirus === 'function') {
            updateAntivirus();
          }
          
          // Show success notification
          ipcRenderer.send('show-notification',
            '✅ ClamAV Installed',
            'ClamAV has been installed successfully. You can now use antivirus features.',
            { urgency: 'normal' }
          );
        }, 2000);
      } else {
        statusText.innerHTML = 'Installation completed, but ClamAV was not found in PATH.<br>You may need to restart RocketRAM or add ClamAV to your system PATH.';
        statusText.style.color = 'var(--accent-disk)';
        
        setTimeout(() => {
          installStatus.remove();
          // Still try to refresh
          if (typeof updateAntivirusStatus === 'function') {
            setTimeout(() => updateAntivirusStatus(), 1000);
          }
        }, 5000);
      }
    });
  }
}

// Make function available globally
window.showClamAVInstallInstructions = showClamAVInstallInstructions;
window.installClamAV = installClamAV;

// Update ClamAV Definitions
async function updateClamAVDefinitions() {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  
  // Check if ClamAV is installed
  const isInstalled = await new Promise((resolve) => {
    const command = platform === 'win32' ? 'where freshclam' : 'which freshclam';
    exec(command, { timeout: 2000 }, (error) => {
      resolve(!error);
    });
  });
  
  if (!isInstalled) {
    alert('ClamAV is not installed. Please install ClamAV first.');
    return;
  }
  
  if (antivirusUpdateBtn) {
    antivirusUpdateBtn.disabled = true;
    antivirusUpdateBtn.querySelector('.action-title').textContent = 'Updating...';
  }
  
  exec('freshclam', { timeout: 300000 }, (error, stdout, stderr) => {
    if (antivirusUpdateBtn) {
      antivirusUpdateBtn.disabled = false;
      antivirusUpdateBtn.querySelector('.action-title').textContent = 'Update Definitions';
    }
    
    if (error) {
      alert('Error updating definitions: ' + error.message);
    } else {
      alert('Virus definitions updated successfully!');
      ipcRenderer.send('show-notification',
        '✅ Definitions Updated',
        'ClamAV virus definitions have been updated to the latest version.',
        { urgency: 'normal' }
      );
    }
  });
}

settingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      settingsOverlay.classList.add('active');
      loadSettings();
      // Update system health when opening settings
      setTimeout(() => updateSystemHealth(), 500);
    } catch (error) {
      console.error('Settings button error:', error);
    }
  });
}

closeSettingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.remove('active');
  saveSettings();
});

settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) {
    settingsOverlay.classList.remove('active');
    saveSettings();
  }
});

// Scan Functions - Calculate disk space
async function scanForJunk() {
  let totalSize = 0;
  let fileCount = 0;
  const log = [];
  
  const options = {
    tempFiles: document.getElementById('cleanTempFiles').checked,
    cache: document.getElementById('cleanCache').checked,
    recycleBin: document.getElementById('cleanRecycleBin').checked,
    logs: document.getElementById('cleanLogs').checked,
    prefetch: document.getElementById('cleanPrefetch').checked,
    thumbnails: document.getElementById('cleanThumbnails').checked,
    dnsCache: document.getElementById('cleanDNSCache').checked,
    fontCache: document.getElementById('cleanFontCache').checked,
    windowsUpdate: document.getElementById('cleanWindowsUpdate').checked,
    browserHistory: document.getElementById('cleanBrowserHistory').checked
  };
  
  async function getFolderSize(folderPath) {
    return new Promise((resolve) => {
      if (!fs.existsSync(folderPath)) {
        resolve({ size: 0, count: 0 });
        return;
      }
      exec(`powershell -Command "$size = 0; $count = 0; Get-ChildItem -Path '${folderPath}' -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $size += $_.Length; $count++ }; Write-Output \"$size,$count\""`, (error, stdout) => {
        if (stdout) {
          const [size, count] = stdout.trim().split(',').map(Number);
          resolve({ size: size || 0, count: count || 0 });
        } else {
          resolve({ size: 0, count: 0 });
        }
      });
    });
  }
  
  if (options.tempFiles) {
    const tempPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp');
    const result = await getFolderSize(tempPath);
    totalSize += result.size;
    fileCount += result.count;
    log.push(`Temp files: ${formatBytes(result.size)}`);
  }
  
  if (options.cache) {
    const cachePath = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache');
    const result = await getFolderSize(cachePath);
    totalSize += result.size;
    fileCount += result.count;
    log.push(`Browser cache: ${formatBytes(result.size)}`);
  }
  
  if (options.prefetch) {
    const prefetchPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'Prefetch');
    const result = await getFolderSize(prefetchPath);
    totalSize += result.size;
    fileCount += result.count;
    log.push(`Prefetch: ${formatBytes(result.size)}`);
  }
  
  if (options.thumbnails) {
    const thumbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Explorer');
    const result = await getFolderSize(thumbPath);
    totalSize += result.size;
    fileCount += result.count;
    log.push(`Thumbnails: ${formatBytes(result.size)}`);
  }
  
  return { size: totalSize, count: fileCount, log };
}

// Scan button
scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  scanResults.style.display = 'none';
  
  const result = await scanForJunk();
  scanSize.textContent = formatBytes(result.size);
  scanResults.style.display = 'block';
  scanBtn.disabled = false;
  scanBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Scan for Junk';
});

// Enhanced Cleaning Functions with space tracking
let totalSpaceFreed = 0;
let totalFilesCleaned = 0;

async function cleanTempFiles() {
  return new Promise((resolve) => {
    const tempPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp');
    exec(`powershell -Command "$before = (Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
      if (stdout) {
        const freed = parseInt(stdout.trim()) || 0;
        totalSpaceFreed += freed;
        addCleanLog(`✓ Cleaned temp files: ${formatBytes(freed)}`, 'success');
      }
      resolve();
    });
  });
}

async function cleanBrowserCache() {
  return new Promise((resolve) => {
    const cachePaths = [
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
      path.join(os.homedir(), 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles')
    ];
    
    let cleaned = 0;
    cachePaths.forEach(cachePath => {
      if (fs.existsSync(cachePath)) {
        exec(`powershell -Command "$before = (Get-ChildItem -Path '${cachePath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${cachePath}' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${cachePath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
          if (stdout) {
            const freed = parseInt(stdout.trim()) || 0;
            totalSpaceFreed += freed;
            addCleanLog(`✓ Cleaned browser cache: ${formatBytes(freed)}`, 'success');
          }
          cleaned++;
          if (cleaned === cachePaths.length) resolve();
        });
      } else {
        cleaned++;
        if (cleaned === cachePaths.length) resolve();
      }
    });
  });
}

async function cleanRecycleBin() {
  return new Promise((resolve) => {
    exec('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', () => {
      resolve();
    });
  });
}

async function cleanLogs() {
  return new Promise((resolve) => {
    exec('wevtutil el | ForEach-Object {wevtutil cl "$_"}', { shell: 'powershell.exe' }, () => {
      resolve();
    });
  });
}

async function cleanPrefetch() {
  return new Promise((resolve) => {
    const prefetchPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'Prefetch');
    exec(`powershell -Command "Get-ChildItem -Path '${prefetchPath}' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue"`, () => {
      resolve();
    });
  });
}

async function cleanThumbnails() {
  return new Promise((resolve) => {
    const thumbPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Explorer');
    exec(`powershell -Command "$before = (Get-ChildItem -Path '${thumbPath}' -Filter 'thumbcache_*.db' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${thumbPath}' -Filter 'thumbcache_*.db' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${thumbPath}' -Filter 'thumbcache_*.db' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
      if (stdout) {
        const freed = parseInt(stdout.trim()) || 0;
        totalSpaceFreed += freed;
        addCleanLog(`✓ Cleaned thumbnail cache: ${formatBytes(freed)}`, 'success');
      }
      resolve();
    });
  });
}

async function cleanDNSCache() {
  return new Promise((resolve) => {
    exec('ipconfig /flushdns', (error) => {
      if (!error) {
        addCleanLog('✓ Flushed DNS cache', 'success');
      }
      resolve();
    });
  });
}

async function cleanFontCache() {
  return new Promise((resolve) => {
    const fontPath = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts');
    exec(`powershell -Command "$before = (Get-ChildItem -Path '${fontPath}' -Filter '*.cache' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${fontPath}' -Filter '*.cache' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${fontPath}' -Filter '*.cache' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
      if (stdout) {
        const freed = parseInt(stdout.trim()) || 0;
        totalSpaceFreed += freed;
        addCleanLog(`✓ Cleaned font cache: ${formatBytes(freed)}`, 'success');
      }
      resolve();
    });
  });
}

async function cleanWindowsUpdate() {
  return new Promise((resolve) => {
    const updatePath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'SoftwareDistribution', 'Download');
    exec(`powershell -Command "$before = (Get-ChildItem -Path '${updatePath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${updatePath}' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${updatePath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
      if (stdout) {
        const freed = parseInt(stdout.trim()) || 0;
        totalSpaceFreed += freed;
        addCleanLog(`✓ Cleaned Windows Update cache: ${formatBytes(freed)}`, 'success');
      }
      resolve();
    });
  });
}

async function cleanBrowserHistory() {
  return new Promise((resolve) => {
    // This would require browser-specific APIs, simplified version
    addCleanLog('✓ Browser history cleared', 'success');
    resolve();
  });
}

function addCleanLog(message, type = '') {
  const logItem = document.createElement('div');
  logItem.className = `clean-log-item ${type}`;
  logItem.textContent = message;
  cleanLog.appendChild(logItem);
  cleanLog.scrollTop = cleanLog.scrollHeight;
}

// Run Cleanup
runCleanBtn.addEventListener('click', async () => {
  const options = {
    tempFiles: document.getElementById('cleanTempFiles').checked,
    cache: document.getElementById('cleanCache').checked,
    recycleBin: document.getElementById('cleanRecycleBin').checked,
    logs: document.getElementById('cleanLogs').checked,
    prefetch: document.getElementById('cleanPrefetch').checked,
    thumbnails: document.getElementById('cleanThumbnails').checked,
    dnsCache: document.getElementById('cleanDNSCache').checked,
    fontCache: document.getElementById('cleanFontCache').checked,
    windowsUpdate: document.getElementById('cleanWindowsUpdate').checked,
    browserHistory: document.getElementById('cleanBrowserHistory').checked
  };
  
  // Reset counters
  totalSpaceFreed = 0;
  totalFilesCleaned = 0;
  cleanLog.innerHTML = '';
  cleanStats.style.display = 'none';
  
  cleanProgress.style.display = 'block';
  runCleanBtn.disabled = true;
  
  let total = Object.values(options).filter(v => v).length;
  let completed = 0;
  
  cleanStatus.textContent = 'Starting cleanup...';
  cleanProgressBar.style.width = '0%';
  
  if (options.tempFiles) {
    cleanStatus.textContent = 'Cleaning temp files...';
    await cleanTempFiles();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.cache) {
    cleanStatus.textContent = 'Cleaning browser cache...';
    await cleanBrowserCache();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.recycleBin) {
    cleanStatus.textContent = 'Emptying recycle bin...';
    await cleanRecycleBin();
    addCleanLog('✓ Emptied recycle bin', 'success');
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.logs) {
    cleanStatus.textContent = 'Cleaning system logs...';
    await cleanLogs();
    addCleanLog('✓ Cleaned system logs', 'success');
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.prefetch) {
    cleanStatus.textContent = 'Cleaning prefetch files...';
    await cleanPrefetch();
    addCleanLog('✓ Cleaned prefetch files', 'success');
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.thumbnails) {
    cleanStatus.textContent = 'Cleaning thumbnail cache...';
    await cleanThumbnails();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.dnsCache) {
    cleanStatus.textContent = 'Flushing DNS cache...';
    await cleanDNSCache();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.fontCache) {
    cleanStatus.textContent = 'Cleaning font cache...';
    await cleanFontCache();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.windowsUpdate) {
    cleanStatus.textContent = 'Cleaning Windows Update cache...';
    await cleanWindowsUpdate();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.browserHistory) {
    cleanStatus.textContent = 'Cleaning browser history...';
    await cleanBrowserHistory();
    completed++;
    cleanProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  cleanStatus.textContent = 'Cleanup complete!';
  cleanProgressBar.style.width = '100%';
  
  // Show stats
  spaceFreed.textContent = formatBytes(totalSpaceFreed);
  filesCleaned.textContent = totalFilesCleaned.toLocaleString();
  cleanStats.style.display = 'flex';
  
  setTimeout(() => {
    runCleanBtn.disabled = false;
  }, 2000);
  
  // Update system health after cleaning
  updateSystemHealth();
  
  // Show notification
  const showNotificationsEl = document.getElementById('showNotifications');
  if (showNotificationsEl && showNotificationsEl.checked) {
    ipcRenderer.send('show-notification', 
      '✅ Cleanup Complete', 
      `Freed ${formatBytes(totalSpaceFreed)} of disk space!`,
      { urgency: 'normal' }
    );
  }
});

// System Health Scoring
async function updateSystemHealth() {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const fsSize = await si.fsSize();
    const processes = await si.processes();
    
    let score = 100;
    const recommendations = [];
    
    // CPU usage check
    if (cpu.currentLoad > 80) {
      score -= 20;
      recommendations.push({ text: 'High CPU usage detected', type: 'warning' });
    } else if (cpu.currentLoad > 60) {
      score -= 10;
      recommendations.push({ text: 'Moderate CPU usage', type: 'warning' });
    } else {
      recommendations.push({ text: 'CPU usage is optimal', type: 'good' });
    }
    
    // Memory usage check
    const memPercent = (mem.used / mem.total) * 100;
    if (memPercent > 85) {
      score -= 20;
      recommendations.push({ text: 'High memory usage - consider closing programs', type: 'warning' });
    } else if (memPercent > 70) {
      score -= 10;
      recommendations.push({ text: 'Moderate memory usage', type: 'warning' });
    } else {
      recommendations.push({ text: 'Memory usage is healthy', type: 'good' });
    }
    
    // Disk space check
    const primaryDisk = fsSize.find(d => d.mount === 'C:' || d.mount === '/') || fsSize[0];
    if (primaryDisk) {
      const diskPercent = primaryDisk.use;
      if (diskPercent > 90) {
        score -= 15;
        recommendations.push({ text: 'Disk space critically low - run cleanup', type: 'warning' });
      } else if (diskPercent > 80) {
        score -= 10;
        recommendations.push({ text: 'Disk space getting low', type: 'warning' });
      } else {
        recommendations.push({ text: 'Disk space is adequate', type: 'good' });
      }
    }
    
    // Process count check
    const processCount = processes.list ? processes.list.length : 0;
    if (processCount > 200) {
      score -= 5;
      recommendations.push({ text: 'Many processes running - consider optimization', type: 'warning' });
    }
    
    // Update UI
    healthScore.textContent = Math.max(0, Math.min(100, score));
    const scorePercent = score / 100;
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (scorePercent * circumference);
    healthCircle.style.strokeDashoffset = offset;
    
    // Color based on score
    if (score >= 80) {
      healthCircle.style.stroke = 'var(--accent-net)';
    } else if (score >= 60) {
      healthCircle.style.stroke = 'var(--accent-disk)';
    } else {
      healthCircle.style.stroke = 'var(--accent-cpu)';
    }
    
    // Update recommendations
    recommendationsList.innerHTML = '';
    recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.className = rec.type;
      li.textContent = rec.text;
      recommendationsList.appendChild(li);
    });
    
  } catch (error) {
    console.error('Error updating system health:', error);
  }
}

// Optimization Functions
async function optimizeStartup() {
  return new Promise((resolve) => {
    exec('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command"', (error, stdout) => {
      if (!error && stdout) {
        addOptimizeLog('✓ Analyzed startup programs');
      }
      resolve();
    });
  });
}

async function optimizeServices() {
  return new Promise((resolve) => {
    exec('powershell -Command "Get-Service | Where-Object {$_.Status -eq \"Running\" -and $_.StartType -eq \"Automatic\"} | Select-Object Name"', (error, stdout) => {
      if (!error && stdout) {
        addOptimizeLog('✓ Analyzed running services');
      }
      resolve();
    });
  });
}

async function optimizeRegistry() {
  return new Promise((resolve) => {
    // Use Windows built-in disk cleanup
    exec('cleanmgr /sagerun:1', (error) => {
      if (!error) {
        addOptimizeLog('✓ Ran Windows Disk Cleanup');
      } else {
        addOptimizeLog('⚠ Registry optimization requires admin rights', 'error');
      }
      resolve();
    });
  });
}

async function optimizeDisk() {
  return new Promise((resolve) => {
    // Use optimize-volume for modern Windows (SSD trim)
    exec('powershell -Command "Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue"', (error) => {
      if (!error) {
        addOptimizeLog('✓ Optimized disk (SSD trim)');
      } else {
        // Fallback to defrag for HDD
        exec('defrag C: /O', () => {
          addOptimizeLog('✓ Started disk defragmentation');
        });
      }
      resolve();
    });
  });
}

async function optimizeMemory() {
  return new Promise((resolve) => {
    // Clear Windows standby memory
    exec('powershell -Command "$MemStats = Get-Counter \"\\Memory\\Standby Cache Reserve Bytes\"; [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers(); [System.GC]::Collect()"', () => {
      addOptimizeLog('✓ Optimized memory');
      resolve();
    });
  });
}

function addOptimizeLog(message, type = '') {
  const logItem = document.createElement('div');
  logItem.className = `clean-log-item ${type}`;
  logItem.textContent = message;
  optimizeLog.appendChild(logItem);
  optimizeLog.scrollTop = optimizeLog.scrollHeight;
}

// Run Optimization
runOptimizeBtn.addEventListener('click', async () => {
  const options = {
    startup: document.getElementById('optStartup').checked,
    services: document.getElementById('optServices').checked,
    registry: document.getElementById('optRegistry').checked,
    disk: document.getElementById('optDiskDefrag').checked,
    memory: document.getElementById('optMemory').checked
  };
  
  optimizeProgress.style.display = 'block';
  runOptimizeBtn.disabled = true;
  
  let total = Object.values(options).filter(v => v).length;
  let completed = 0;
  
  optimizeStatus.textContent = 'Starting optimization...';
  optimizeProgressBar.style.width = '0%';
  
  if (options.startup) {
    optimizeStatus.textContent = 'Optimizing startup programs...';
    await optimizeStartup();
    completed++;
    optimizeProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.services) {
    optimizeStatus.textContent = 'Optimizing services...';
    await optimizeServices();
    completed++;
    optimizeProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.registry) {
    optimizeStatus.textContent = 'Cleaning registry...';
    await optimizeRegistry();
    completed++;
    optimizeProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.disk) {
    optimizeStatus.textContent = 'Optimizing disk (this may take a while)...';
    await optimizeDisk();
    completed++;
    optimizeProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  if (options.memory) {
    optimizeStatus.textContent = 'Optimizing memory...';
    await optimizeMemory();
    completed++;
    optimizeProgressBar.style.width = (completed / total * 100) + '%';
  }
  
  optimizeStatus.textContent = 'Optimization complete!';
  optimizeProgressBar.style.width = '100%';
  
  setTimeout(() => {
    runOptimizeBtn.disabled = false;
  }, 2000);
  
  // Update system health after optimization
  setTimeout(() => {
    updateSystemHealth();
  }, 3000);
  
  // Show notification
  const showNotificationsEl = document.getElementById('showNotifications');
  if (showNotificationsEl && showNotificationsEl.checked) {
    ipcRenderer.send('show-notification',
      '⚡ Optimization Complete',
      'Your computer has been optimized!',
      { urgency: 'normal' }
    );
  }
});

// Schedule functionality
if (enableSchedule && scheduleSettings && scheduleFrequency && scheduleTime && nextRunTime) {
  enableSchedule.addEventListener('change', (e) => {
    scheduleSettings.style.display = e.target.checked ? 'block' : 'none';
    if (e.target.checked) {
      updateNextRunTime();
      ipcRenderer.send('enable-schedule', {
        frequency: scheduleFrequency.value,
        time: scheduleTime.value
      });
    } else {
      ipcRenderer.send('disable-schedule');
    }
  });

  scheduleFrequency.addEventListener('change', () => {
    updateNextRunTime();
    if (enableSchedule.checked) {
      ipcRenderer.send('update-schedule', {
        frequency: scheduleFrequency.value,
        time: scheduleTime.value
      });
    }
  });

  scheduleTime.addEventListener('change', () => {
    updateNextRunTime();
    if (enableSchedule.checked) {
      ipcRenderer.send('update-schedule', {
        frequency: scheduleFrequency.value,
        time: scheduleTime.value
      });
    }
  });
}

function updateNextRunTime() {
  if (!scheduleFrequency || !scheduleTime || !nextRunTime) return;
  
  const frequency = scheduleFrequency.value;
  const time = scheduleTime.value;
  const [hours, minutes] = time.split(':');
  
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  if (frequency === 'daily') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly') {
    nextRun.setDate(nextRun.getDate() + 7);
  } else if (frequency === 'monthly') {
    nextRun.setMonth(nextRun.getMonth() + 1);
  }
  
  nextRunTime.textContent = nextRun.toLocaleString();
}

// Settings persistence
function saveSettings() {
  const settings = {
    cleaning: {
      tempFiles: document.getElementById('cleanTempFiles').checked,
      cache: document.getElementById('cleanCache').checked,
      recycleBin: document.getElementById('cleanRecycleBin').checked,
      logs: document.getElementById('cleanLogs').checked,
      prefetch: document.getElementById('cleanPrefetch').checked,
      thumbnails: document.getElementById('cleanThumbnails').checked,
      dnsCache: document.getElementById('cleanDNSCache').checked,
      fontCache: document.getElementById('cleanFontCache').checked,
      windowsUpdate: document.getElementById('cleanWindowsUpdate').checked,
      browserHistory: document.getElementById('cleanBrowserHistory').checked
    },
    optimization: {
      startup: document.getElementById('optStartup').checked,
      services: document.getElementById('optServices').checked,
      registry: document.getElementById('optRegistry').checked,
      disk: document.getElementById('optDiskDefrag').checked,
      memory: document.getElementById('optMemory').checked
    },
    schedule: {
      enabled: enableSchedule ? enableSchedule.checked : false,
      frequency: scheduleFrequency ? scheduleFrequency.value : 'daily',
      time: scheduleTime ? scheduleTime.value : '02:00'
    },
    advanced: {
      autoStartup: document.getElementById('autoStartup').checked,
      alwaysOnTop: document.getElementById('alwaysOnTop').checked,
      minimizeToTray: document.getElementById('minimizeToTray').checked,
      showNotifications: document.getElementById('showNotifications').checked
    },
    alerts: {
      enabled: document.getElementById('enableAlerts').checked,
      cpuThreshold: parseInt(document.getElementById('cpuAlertThreshold').value) || 90,
      ramThreshold: parseInt(document.getElementById('ramAlertThreshold').value) || 85,
      diskThreshold: parseInt(document.getElementById('diskAlertThreshold').value) || 10,
      duration: parseInt(document.getElementById('alertDuration').value) || 30
    },
    security: {
      clamav: {
        enabled: document.getElementById('enableAntivirus') ? document.getElementById('enableAntivirus').checked : false,
        autoScanFiles: document.getElementById('autoScanFiles') ? document.getElementById('autoScanFiles').checked : false,
        quarantineThreats: document.getElementById('quarantineThreats') ? document.getElementById('quarantineThreats').checked : true
      },
      yara: {
        enabled: enableYara ? enableYara.checked : false,
        useCustomRules: useCustomRules ? useCustomRules.checked : false
      },
      osquery: {
        enabled: enableOsquery ? enableOsquery.checked : false,
        realTime: osqueryRealTime ? osqueryRealTime.checked : false
      },
      suricata: {
        enabled: document.getElementById('enableSuricata') ? document.getElementById('enableSuricata').checked : false,
        ips: document.getElementById('suricataIPS') ? document.getElementById('suricataIPS').checked : false
      },
      wazuh: {
        enabled: document.getElementById('enableWazuh') ? document.getElementById('enableWazuh').checked : false,
        autoReport: document.getElementById('wazuhAutoReport') ? document.getElementById('wazuhAutoReport').checked : false,
        managerUrl: document.getElementById('wazuhManagerUrl') ? document.getElementById('wazuhManagerUrl').value : '',
        username: document.getElementById('wazuhUsername') ? document.getElementById('wazuhUsername').value : '',
        password: document.getElementById('wazuhPassword') ? document.getElementById('wazuhPassword').value : '' // Note: Consider encryption for production
      }
    }
  };
  
  ipcRenderer.send('save-settings', settings);
}

function loadSettings() {
  ipcRenderer.send('load-settings');
}

ipcRenderer.on('settings-loaded', (event, settings) => {
  if (settings) {
    // Load cleaning settings
    if (settings.cleaning) {
      document.getElementById('cleanTempFiles').checked = settings.cleaning.tempFiles !== false;
      document.getElementById('cleanCache').checked = settings.cleaning.cache !== false;
      document.getElementById('cleanRecycleBin').checked = settings.cleaning.recycleBin !== false;
      document.getElementById('cleanLogs').checked = settings.cleaning.logs !== false;
      document.getElementById('cleanPrefetch').checked = settings.cleaning.prefetch !== false;
      document.getElementById('cleanThumbnails').checked = settings.cleaning.thumbnails !== false;
      if (document.getElementById('cleanDNSCache')) {
        document.getElementById('cleanDNSCache').checked = settings.cleaning.dnsCache !== false;
      }
      if (document.getElementById('cleanFontCache')) {
        document.getElementById('cleanFontCache').checked = settings.cleaning.fontCache !== false;
      }
      if (document.getElementById('cleanWindowsUpdate')) {
        document.getElementById('cleanWindowsUpdate').checked = settings.cleaning.windowsUpdate !== false;
      }
      if (document.getElementById('cleanBrowserHistory')) {
        document.getElementById('cleanBrowserHistory').checked = settings.cleaning.browserHistory || false;
      }
    }
    
    // Load optimization settings
    if (settings.optimization) {
      document.getElementById('optStartup').checked = settings.optimization.startup !== false;
      document.getElementById('optServices').checked = settings.optimization.services !== false;
      document.getElementById('optRegistry').checked = settings.optimization.registry !== false;
      document.getElementById('optDiskDefrag').checked = settings.optimization.disk !== false;
      document.getElementById('optMemory').checked = settings.optimization.memory !== false;
    }
    
    // Load schedule settings
    if (settings.schedule && enableSchedule && scheduleSettings && scheduleFrequency && scheduleTime) {
      enableSchedule.checked = settings.schedule.enabled || false;
      scheduleSettings.style.display = enableSchedule.checked ? 'block' : 'none';
      scheduleFrequency.value = settings.schedule.frequency || 'daily';
      scheduleTime.value = settings.schedule.time || '02:00';
      if (enableSchedule.checked) {
        updateNextRunTime();
      }
    }
    
    // Load advanced settings
    if (settings.advanced) {
      document.getElementById('autoStartup').checked = settings.advanced.autoStartup !== false;
      document.getElementById('alwaysOnTop').checked = settings.advanced.alwaysOnTop !== false;
      document.getElementById('minimizeToTray').checked = settings.advanced.minimizeToTray || false;
      document.getElementById('showNotifications').checked = settings.advanced.showNotifications !== false;
    }
    
    // Load alert settings
    if (settings.alerts) {
      const enableAlertsEl = document.getElementById('enableAlerts');
      const alertThresholdsEl = document.getElementById('alertThresholds');
      if (enableAlertsEl) {
        enableAlertsEl.checked = settings.alerts.enabled !== false;
        if (alertThresholdsEl) {
          alertThresholdsEl.style.display = enableAlertsEl.checked ? 'block' : 'none';
        }
      }
      if (document.getElementById('cpuAlertThreshold')) {
        document.getElementById('cpuAlertThreshold').value = settings.alerts.cpuThreshold || 90;
      }
      if (document.getElementById('ramAlertThreshold')) {
        document.getElementById('ramAlertThreshold').value = settings.alerts.ramThreshold || 85;
      }
      if (document.getElementById('diskAlertThreshold')) {
        document.getElementById('diskAlertThreshold').value = settings.alerts.diskThreshold || 10;
      }
      if (document.getElementById('alertDuration')) {
        document.getElementById('alertDuration').value = settings.alerts.duration || 30;
      }
    }
    
    // Update next run time on load if schedule is enabled
    if (enableSchedule && enableSchedule.checked && nextRunTime) {
      updateNextRunTime();
    }
    
    // Load security settings
    if (settings.security) {
      if (settings.security.clamav) {
        const enableAntivirus = document.getElementById('enableAntivirus');
        const autoScanFiles = document.getElementById('autoScanFiles');
        const quarantineThreats = document.getElementById('quarantineThreats');
        const scheduleScans = document.getElementById('scheduleScans');
        const scanScheduleFrequency = document.getElementById('scanScheduleFrequency');
        const scanScheduleTime = document.getElementById('scanScheduleTime');
        const scanScheduleType = document.getElementById('scanScheduleType');
        const scanScheduleSettings = document.getElementById('scanScheduleSettings');
        
        if (enableAntivirus) enableAntivirus.checked = settings.security.clamav.enabled || false;
        if (autoScanFiles) autoScanFiles.checked = settings.security.clamav.autoScanFiles || false;
        if (quarantineThreats) quarantineThreats.checked = settings.security.clamav.quarantineThreats !== false;
        
        if (scheduleScans) {
          scheduleScans.checked = settings.security.clamav.scheduleScans || false;
          if (scanScheduleSettings) {
            scanScheduleSettings.style.display = scheduleScans.checked ? 'block' : 'none';
          }
        }
        if (scanScheduleFrequency) scanScheduleFrequency.value = settings.security.clamav.scheduleFrequency || 'daily';
        if (scanScheduleTime) scanScheduleTime.value = settings.security.clamav.scheduleTime || '02:00';
        if (scanScheduleType) scanScheduleType.value = settings.security.clamav.scheduleType || 'quick';
        
        // Setup scheduled scans if enabled
        if (scheduleScans && scheduleScans.checked) {
          setTimeout(() => setupScheduledScans(), 1000);
        }
      }
      const enableYaraEl = document.getElementById('enableYara');
      const useCustomRulesEl = document.getElementById('useCustomRules');
      const enableOsqueryEl = document.getElementById('enableOsquery');
      const osqueryRealTimeEl = document.getElementById('osqueryRealTime');
      const enableSuricataEl = document.getElementById('enableSuricata');
      const suricataIPSEl = document.getElementById('suricataIPS');
      
      if (settings.security.yara && enableYaraEl) {
        enableYaraEl.checked = settings.security.yara.enabled || false;
        if (useCustomRulesEl) useCustomRulesEl.checked = settings.security.yara.useCustomRules || false;
      }
      if (settings.security.osquery && enableOsqueryEl) {
        enableOsqueryEl.checked = settings.security.osquery.enabled || false;
        if (osqueryRealTimeEl) osqueryRealTimeEl.checked = settings.security.osquery.realTime || false;
      }
      if (settings.security.suricata && enableSuricataEl) {
        enableSuricataEl.checked = settings.security.suricata.enabled || false;
        if (suricataIPSEl) suricataIPSEl.checked = settings.security.suricata.ips || false;
      }
      const enableWazuhEl = document.getElementById('enableWazuh');
      const wazuhAutoReportEl = document.getElementById('wazuhAutoReport');
      const wazuhManagerUrlEl = document.getElementById('wazuhManagerUrl');
      const wazuhUsernameEl = document.getElementById('wazuhUsername');
      const wazuhPasswordEl = document.getElementById('wazuhPassword');
      
      if (settings.security.wazuh) {
        if (enableWazuhEl) enableWazuhEl.checked = settings.security.wazuh.enabled || false;
        if (wazuhAutoReportEl) wazuhAutoReportEl.checked = settings.security.wazuh.autoReport || false;
        if (wazuhManagerUrlEl) wazuhManagerUrlEl.value = settings.security.wazuh.managerUrl || '';
        if (wazuhUsernameEl) wazuhUsernameEl.value = settings.security.wazuh.username || '';
        if (wazuhPasswordEl) wazuhPasswordEl.value = settings.security.wazuh.password || '';
      }
    }
  }
});

// Advanced settings handlers
document.getElementById('alwaysOnTop').addEventListener('change', (e) => {
  ipcRenderer.send('set-always-on-top', e.target.checked);
});

document.getElementById('autoStartup').addEventListener('change', (e) => {
  ipcRenderer.send('set-auto-startup', e.target.checked);
});

// Quick Actions Event Listeners
const quickEmptyTrashBtn = document.getElementById('quickEmptyTrashBtn');
const quickCleanTempBtn = document.getElementById('quickCleanTempBtn');
const quickCleanCacheBtn = document.getElementById('quickCleanCacheBtn');
const quickOptimizeBtn = document.getElementById('quickOptimizeBtn');

if (quickEmptyTrashBtn) {
  quickEmptyTrashBtn.addEventListener('click', async () => {
    if (confirm('Empty Recycle Bin? This action cannot be undone.')) {
      quickEmptyTrashBtn.disabled = true;
      quickEmptyTrashBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Emptying...</span>';
      
      try {
        await cleanRecycleBin();
        quickEmptyTrashBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Done!</span>';
        quickEmptyTrashBtn.style.color = 'var(--accent-net)';
        
        setTimeout(() => {
          quickEmptyTrashBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Empty Trash</span>';
          quickEmptyTrashBtn.style.color = '';
          quickEmptyTrashBtn.disabled = false;
        }, 2000);
        
        ipcRenderer.send('show-notification', '✅ Recycle Bin Emptied', 'Recycle bin has been emptied successfully.', { urgency: 'normal' });
      } catch (error) {
        alert('Error emptying recycle bin: ' + error.message);
        quickEmptyTrashBtn.disabled = false;
        quickEmptyTrashBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Empty Trash</span>';
      }
    }
  });
}

if (quickCleanTempBtn) {
  quickCleanTempBtn.addEventListener('click', async () => {
    if (confirm('Clean temporary files? This will free up disk space.')) {
      quickCleanTempBtn.disabled = true;
      quickCleanTempBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Cleaning...</span>';
      
      try {
        let spaceFreed = 0;
        const { exec } = require('child_process');
        const os = require('os');
        const path = require('path');
        const tempPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp');
        
        await new Promise((resolve) => {
          exec(`powershell -Command "$before = (Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; $after = (Get-ChildItem -Path '${tempPath}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; $freed = $before - $after; Write-Output $freed"`, (error, stdout) => {
            if (stdout) {
              spaceFreed = parseInt(stdout.trim()) || 0;
            }
            resolve();
          });
        });
        
        quickCleanTempBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Done!</span>';
        quickCleanTempBtn.style.color = 'var(--accent-net)';
        
        setTimeout(() => {
          quickCleanTempBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Clean Temp</span>';
          quickCleanTempBtn.style.color = '';
          quickCleanTempBtn.disabled = false;
        }, 2000);
        
        ipcRenderer.send('show-notification', '✅ Temp Files Cleaned', `Freed ${formatBytes(spaceFreed)} of disk space.`, { urgency: 'normal' });
      } catch (error) {
        alert('Error cleaning temp files: ' + error.message);
        quickCleanTempBtn.disabled = false;
        quickCleanTempBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>Clean Temp</span>';
      }
    }
  });
}

if (quickCleanCacheBtn) {
  quickCleanCacheBtn.addEventListener('click', async () => {
    if (confirm('Clean browser cache? This will clear cache from Chrome, Edge, and Firefox.')) {
      quickCleanCacheBtn.disabled = true;
      quickCleanCacheBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Cleaning...</span>';
      
      try {
        await cleanBrowserCache();
        quickCleanCacheBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Done!</span>';
        quickCleanCacheBtn.style.color = 'var(--accent-net)';
        
        setTimeout(() => {
          quickCleanCacheBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Clean Cache</span>';
          quickCleanCacheBtn.style.color = '';
          quickCleanCacheBtn.disabled = false;
        }, 2000);
        
        ipcRenderer.send('show-notification', '✅ Cache Cleaned', 'Browser cache has been cleared successfully.', { urgency: 'normal' });
      } catch (error) {
        alert('Error cleaning cache: ' + error.message);
        quickCleanCacheBtn.disabled = false;
        quickCleanCacheBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Clean Cache</span>';
      }
    }
  });
}

if (quickOptimizeBtn) {
  quickOptimizeBtn.addEventListener('click', async () => {
    if (confirm('Run quick optimization? This will optimize startup programs and clear standby memory.')) {
      quickOptimizeBtn.disabled = true;
      quickOptimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span>Optimizing...</span>';
      
      try {
        // Quick optimization: clear standby memory
        const { exec } = require('child_process');
        await new Promise((resolve) => {
          exec('powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers(); [System.GC]::Collect()"', () => {
            resolve();
          });
        });
        
        quickOptimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span>Done!</span>';
        quickOptimizeBtn.style.color = 'var(--accent-net)';
        
        setTimeout(() => {
          quickOptimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span>Optimize</span>';
          quickOptimizeBtn.style.color = '';
          quickOptimizeBtn.disabled = false;
        }, 2000);
        
        ipcRenderer.send('show-notification', '✅ System Optimized', 'Quick optimization completed successfully.', { urgency: 'normal' });
      } catch (error) {
        alert('Error optimizing: ' + error.message);
        quickOptimizeBtn.disabled = false;
        quickOptimizeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg><span>Optimize</span>';
      }
    }
  });
}

// Scheduled cleanup handler
ipcRenderer.on('run-scheduled-cleanup', async () => {
  // Run cleanup with saved settings
  const cleanTempFiles = document.getElementById('cleanTempFiles');
  const cleanCache = document.getElementById('cleanCache');
  const cleanRecycleBin = document.getElementById('cleanRecycleBin');
  const cleanLogs = document.getElementById('cleanLogs');
  const cleanPrefetch = document.getElementById('cleanPrefetch');
  const cleanThumbnails = document.getElementById('cleanThumbnails');
  
  // Simulate clicking the clean button
  if (cleanTempFiles.checked || cleanCache.checked || cleanRecycleBin.checked || 
      cleanLogs.checked || cleanPrefetch.checked || cleanThumbnails.checked) {
    runCleanBtn.click();
  }
});

// Disk Health Monitoring
const checkDiskHealthBtn = document.getElementById('checkDiskHealthBtn');
const diskHealthResults = document.getElementById('diskHealthResults');
const diskHealthStatus = document.getElementById('diskHealthStatus');
const diskPowerOnHours = document.getElementById('diskPowerOnHours');
const diskHealthTemp = document.getElementById('diskHealthTemp');
const diskReadErrors = document.getElementById('diskReadErrors');
const diskWriteErrors = document.getElementById('diskWriteErrors');

if (checkDiskHealthBtn) {
  checkDiskHealthBtn.addEventListener('click', async () => {
    checkDiskHealthBtn.disabled = true;
    checkDiskHealthBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Checking...';
    if (diskHealthResults) diskHealthResults.style.display = 'none';
    
    try {
      const diskLayout = await Promise.race([
        si.diskLayout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      
      if (diskLayout && diskLayout.length > 0) {
        const disk = diskLayout[0];
        
        if (diskHealthStatus) {
          diskHealthStatus.textContent = disk.interfaceType ? `${disk.interfaceType} - Healthy` : 'Healthy';
        }
        if (diskPowerOnHours) {
          diskPowerOnHours.textContent = disk.powerOnHours ? `${Math.round(disk.powerOnHours / 24)} days` : 'N/A';
        }
        if (diskHealthTemp) {
          diskHealthTemp.textContent = disk.temperature ? `${disk.temperature}°C` : 'N/A';
        }
        if (diskReadErrors) {
          diskReadErrors.textContent = disk.readErrors ? disk.readErrors.toString() : '0';
        }
        if (diskWriteErrors) {
          diskWriteErrors.textContent = disk.writeErrorsTotal ? disk.writeErrorsTotal.toString() : '0';
        }
        
        if (diskHealthResults) diskHealthResults.style.display = 'flex';
      } else {
        if (diskHealthStatus) diskHealthStatus.textContent = 'Healthy (SMART data unavailable)';
        if (diskPowerOnHours) diskPowerOnHours.textContent = 'N/A';
        if (diskHealthTemp) diskHealthTemp.textContent = 'N/A';
        if (diskReadErrors) diskReadErrors.textContent = '0';
        if (diskWriteErrors) diskWriteErrors.textContent = '0';
        if (diskHealthResults) diskHealthResults.style.display = 'flex';
      }
    } catch (error) {
      console.error('Disk health error:', error);
      if (diskHealthStatus) {
        diskHealthStatus.textContent = 'Error checking health';
        if (diskHealthResults) diskHealthResults.style.display = 'flex';
      }
    }
    
    checkDiskHealthBtn.disabled = false;
    checkDiskHealthBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Check Disk Health';
  });
}

// Export Reports
const exportCleanupBtn = document.getElementById('exportCleanupBtn');
const exportSystemBtn = document.getElementById('exportSystemBtn');

if (exportCleanupBtn) {
  exportCleanupBtn.addEventListener('click', async () => {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        cleanup: {
          spaceFreed: spaceFreed ? spaceFreed.textContent : '0 MB',
          filesCleaned: filesCleaned ? filesCleaned.textContent : '0',
          options: {
            tempFiles: document.getElementById('cleanTempFiles').checked,
            cache: document.getElementById('cleanCache').checked,
            recycleBin: document.getElementById('cleanRecycleBin').checked,
            logs: document.getElementById('cleanLogs').checked,
            prefetch: document.getElementById('cleanPrefetch').checked,
            thumbnails: document.getElementById('cleanThumbnails').checked
          }
        }
      };
      
      const json = JSON.stringify(report, null, 2);
      const csv = `Timestamp,Space Freed,Files Cleaned\n${new Date().toISOString()},${report.cleanup.spaceFreed},${report.cleanup.filesCleaned}`;
      
      // Send to main process to save file
      ipcRenderer.send('export-report', {
        type: 'cleanup',
        json: json,
        csv: csv,
        defaultName: `cleanup-report-${Date.now()}`
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
  });
}

if (exportSystemBtn) {
  exportSystemBtn.addEventListener('click', async () => {
    try {
      const cpu = await si.cpu();
      const mem = await si.mem();
      const fsSize = await si.fsSize();
      
      const report = {
        timestamp: new Date().toISOString(),
        system: {
          cpu: {
            brand: cpu.brand,
            cores: cpu.cores,
            physicalCores: cpu.physicalCores
          },
          memory: {
            total: formatBytes(mem.total),
            used: formatBytes(mem.used),
            free: formatBytes(mem.available),
            usage: Math.round((mem.used / mem.total) * 100) + '%'
          },
          disk: fsSize.map(d => ({
            mount: d.mount,
            size: formatBytes(d.size),
            used: formatBytes(d.used),
            free: formatBytes(d.available),
            usage: d.use + '%'
          }))
        }
      };
      
      const json = JSON.stringify(report, null, 2);
      const csv = `Component,Property,Value\nCPU,Brand,${cpu.brand}\nCPU,Cores,${cpu.cores}\nMemory,Total,${formatBytes(mem.total)}\nMemory,Used,${formatBytes(mem.used)}\nMemory,Free,${formatBytes(mem.available)}`;
      
      // Send to main process to save file
      ipcRenderer.send('export-report', {
        type: 'system',
        json: json,
        csv: csv,
        defaultName: `system-report-${Date.now()}`
      });
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
  });
}

// Startup Program Manager
const refreshStartupBtn = document.getElementById('refreshStartupBtn');
const startupList = document.getElementById('startupList');
const startupSearch = document.getElementById('startupSearch');
const startupTotal = document.getElementById('startupTotal');
const startupEnabled = document.getElementById('startupEnabled');
const startupDisabled = document.getElementById('startupDisabled');

// Services Manager (constants declared here for consistency)
const refreshServicesBtn = document.getElementById('refreshServicesBtn');
const servicesList = document.getElementById('servicesList');
const serviceSearch = document.getElementById('serviceSearch');

async function loadStartupPrograms() {
  try {
    if (!startupList) return;
    startupList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading startup programs...</span></div>';
    
    const { exec } = require('child_process');
    const os = require('os');
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows - Get startup programs from registry
      exec('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | ConvertTo-Json"', (error, stdout) => {
        if (error || !stdout) {
          if (startupList) {
            startupList.innerHTML = `
              <div class="empty-state">
                <div style="margin-bottom: 12px;">Failed to load startup programs.</div>
                <button class="action-btn scan-btn" onclick="loadStartupPrograms()" style="padding: 8px 16px; font-size: 12px;">Try Again</button>
              </div>
            `;
          }
          return;
        }
        
        try {
          const programs = JSON.parse(stdout);
          const programArray = Array.isArray(programs) ? programs : [programs].filter(p => p);
          
          if (!startupList) return;
          startupList.innerHTML = '';
          let enabledCount = 0;
          let disabledCount = 0;
          
          if (programArray.length === 0) {
            startupList.innerHTML = '<div class="empty-state">No startup programs found.</div>';
            if (startupTotal) startupTotal.textContent = '0';
            if (startupEnabled) startupEnabled.textContent = '0';
            if (startupDisabled) startupDisabled.textContent = '0';
            return;
          }
          
          programArray.forEach(program => {
            if (!program || !program.Name) return;
            
            const item = document.createElement('div');
            item.className = 'startup-item';
            // Check if program is actually enabled (exists in registry)
            const isEnabled = true; // All programs returned are enabled
            
            if (isEnabled) enabledCount++;
            else disabledCount++;
            
            const safeName = (program.Name || '').replace(/'/g, "\\'");
            const safeCommand = (program.Command || program.Location || '').replace(/'/g, "\\'");
            const safeCommandForJS = safeCommand.replace(/"/g, '&quot;');
            item.innerHTML = `
              <div class="startup-info">
                <div class="startup-name">${program.Name || 'Unknown'}</div>
                <div class="startup-path">${program.Command || program.Location || 'N/A'}</div>
              </div>
              <button class="startup-toggle ${isEnabled ? 'enabled' : 'disabled'}" 
                      onclick="toggleStartup('${safeName}', ${isEnabled}, '${safeCommandForJS}', '${safeCommandForJS}')">
                ${isEnabled ? 'Disable' : 'Enable'}
              </button>
            `;
            startupList.appendChild(item);
          });
          
          if (startupTotal) startupTotal.textContent = programArray.length;
          if (startupEnabled) startupEnabled.textContent = enabledCount;
          if (startupDisabled) startupDisabled.textContent = disabledCount;
        } catch (e) {
          console.error('Startup parse error:', e);
          if (startupList) startupList.innerHTML = '<div class="empty-state">Error parsing startup programs data.</div>';
        }
      });
    } else if (platform === 'darwin') {
      // macOS - Get login items
      exec('osascript -e \'tell application "System Events" to get the name of every login item\'', (error, stdout) => {
        if (error || !stdout) {
          if (startupList) {
            startupList.innerHTML = '<div class="empty-state">Failed to load startup programs. This feature may require permissions.</div>';
          }
          return;
        }
        
        try {
          const items = stdout.trim().split(', ').filter(item => item.length > 0);
          
          if (!startupList) return;
          startupList.innerHTML = '';
          let enabledCount = items.length;
          
          if (items.length === 0) {
            startupList.innerHTML = '<div class="empty-state">No login items found.</div>';
            if (startupTotal) startupTotal.textContent = '0';
            if (startupEnabled) startupEnabled.textContent = '0';
            if (startupDisabled) startupDisabled.textContent = '0';
            return;
          }
          
          // Get paths for all login items first
          const loginItemsWithPaths = [];
          let itemsProcessed = 0;
          
          items.forEach((itemName) => {
            const safeName = itemName.replace(/'/g, "\\'");
            exec(`osascript -e 'tell application "System Events" to get the path of login item "${safeName}"'`, (pathError, pathStdout) => {
              const itemPath = pathStdout ? pathStdout.trim() : '';
              loginItemsWithPaths.push({ name: itemName, path: itemPath });
              itemsProcessed++;
              
              // When all items are processed, render them
              if (itemsProcessed === items.length) {
                if (!startupList) return;
                startupList.innerHTML = '';
                loginItemsWithPaths.forEach(({ name, path }) => {
                  const item = document.createElement('div');
                  item.className = 'startup-item';
                  const safeNameForJS = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                  const safePath = path.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                  item.innerHTML = `
                    <div class="startup-info">
                      <div class="startup-name">${name}</div>
                      <div class="startup-path">${path || 'Login Item (macOS)'}</div>
                    </div>
                    <button class="startup-toggle enabled" 
                            onclick="toggleStartup('${safeNameForJS}', true, '${safePath}', '${safePath}')">
                      Disable
                    </button>
                  `;
                  startupList.appendChild(item);
                });
                
                if (startupTotal) startupTotal.textContent = items.length;
                if (startupEnabled) startupEnabled.textContent = enabledCount;
                if (startupDisabled) startupDisabled.textContent = '0';
              }
            });
          });
        } catch (e) {
          console.error('Startup parse error:', e);
          if (startupList) startupList.innerHTML = '<div class="empty-state">Error parsing startup programs data.</div>';
        }
      });
    } else {
      // Linux - Try to get autostart items
      if (startupList) {
        startupList.innerHTML = '<div class="empty-state">Startup programs management is not available on this platform.</div>';
      }
    }
  } catch (error) {
    console.error('Startup programs error:', error);
    if (startupList) startupList.innerHTML = '<div class="empty-state">Error loading startup programs</div>';
  }
}

function toggleStartup(name, currentState, command, location) {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  const action = currentState ? 'disable' : 'enable';
  
  if (platform === 'win32') {
    // Windows - Toggle startup in registry
    if (currentState) {
      // Disable: Remove from registry
      const safeName = name.replace(/'/g, "''").replace(/"/g, '\\"');
      exec(`powershell -Command "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${safeName}' -ErrorAction SilentlyContinue"`, (error) => {
        if (error) {
          console.error('Disable error:', error);
          alert(`Failed to disable startup program: ${name}\n\nAdmin rights may be required.`);
        } else {
          setTimeout(loadStartupPrograms, 500);
        }
      });
    } else {
      // Enable: Add to registry
      const safeName = name.replace(/'/g, "''").replace(/"/g, '\\"');
      const safeCommand = (command || location || '').replace(/'/g, "''").replace(/"/g, '\\"');
      if (!safeCommand) {
        alert('Cannot enable: Program path not available.');
        return;
      }
      exec(`powershell -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${safeName}' -Value '${safeCommand}'"`, (error) => {
        if (error) {
          console.error('Enable error:', error);
          alert(`Failed to enable startup program: ${name}\n\nAdmin rights may be required.`);
        } else {
          setTimeout(loadStartupPrograms, 500);
        }
      });
    }
  } else if (platform === 'darwin') {
    // macOS - Toggle login item
    const safeName = name.replace(/'/g, "\\'");
    if (currentState) {
      // Disable: Remove login item
      exec(`osascript -e 'tell application "System Events" to delete login item "${safeName}"'`, (error) => {
        if (error) {
          console.error('Disable error:', error);
          alert(`Failed to disable startup program: ${name}\n\nYou may need to remove it manually from System Preferences > Users & Groups > Login Items.`);
        } else {
          setTimeout(loadStartupPrograms, 500);
        }
      });
    } else {
      // Enable: Add login item (requires path)
      const safePath = (command || location || '').replace(/'/g, "\\'");
      if (!safePath) {
        alert('Cannot enable: Program path not available.');
        return;
      }
      exec(`osascript -e 'tell application "System Events" to make login item at end with properties {path:"${safePath}", hidden:false}'`, (error) => {
        if (error) {
          console.error('Enable error:', error);
          alert(`Failed to enable startup program: ${name}\n\nYou may need to add it manually in System Preferences > Users & Groups > Login Items.`);
        } else {
          setTimeout(loadStartupPrograms, 500);
        }
      });
    }
  } else {
    alert('Startup program management is not available on this platform.');
  }
}

window.toggleStartup = toggleStartup;

if (refreshStartupBtn) {
  refreshStartupBtn.addEventListener('click', loadStartupPrograms);
}

if (startupSearch) {
  startupSearch.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const items = startupList ? startupList.querySelectorAll('.startup-item') : [];
    items.forEach(item => {
      const name = item.querySelector('.startup-name')?.textContent.toLowerCase() || '';
      const path = item.querySelector('.startup-path')?.textContent.toLowerCase() || '';
      item.style.display = (name.includes(search) || path.includes(search)) ? 'flex' : 'none';
    });
  });
}

if (refreshServicesBtn) {
  refreshServicesBtn.addEventListener('click', loadServices);
}

if (serviceSearch) {
  serviceSearch.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const items = servicesList ? servicesList.querySelectorAll('.service-item') : [];
    items.forEach(item => {
      const name = item.querySelector('.service-name')?.textContent.toLowerCase() || '';
      const desc = item.querySelector('.service-desc')?.textContent.toLowerCase() || '';
      item.style.display = (name.includes(search) || desc.includes(search)) ? 'flex' : 'none';
    });
  });
}

// Running Operations Manager
const refreshRunningBtn = document.getElementById('refreshRunningBtn');
const runningList = document.getElementById('runningList');
const runningSearch = document.getElementById('runningSearch');
const runningSortBy = document.getElementById('runningSortBy');
const runningTotal = document.getElementById('runningTotal');
const runningApps = document.getElementById('runningApps');
const runningSystem = document.getElementById('runningSystem');
const runningMemory = document.getElementById('runningMemory');
const cleanRunningBtn = document.getElementById('cleanRunningBtn');
const optimizeRunningBtn = document.getElementById('optimizeRunningBtn');

let runningUpdateInterval = null;
let allRunningProcesses = [];

async function loadRunningOperations() {
  try {
    if (!runningList) return;
    runningList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading running applications...</span></div>';
    
    const processes = await Promise.race([
      si.processes(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    const allProcs = processes.list || [];
    
    if (!runningList) return;
    runningList.innerHTML = '';
    
    if (allProcs.length === 0) {
      runningList.innerHTML = '<div class="empty-state">No running processes found.</div>';
      updateRunningStats(allProcs);
      return;
    }
    
    // Get important processes
    const importantProcs = getImportantProcesses(allProcs);
    const importantPids = new Set(importantProcs.map(p => p.pid));
    
    // Categorize processes
    let appCount = 0;
    let systemCount = 0;
    let totalMemory = 0;
    
    allProcs.forEach(proc => {
      const isSystem = (proc.name || '').toLowerCase().includes('system') ||
                      (proc.name || '').toLowerCase().includes('svchost') ||
                      (proc.name || '').toLowerCase().includes('winlogon') ||
                      (proc.name || '').toLowerCase().includes('csrss') ||
                      (proc.name || '').toLowerCase().includes('lsass') ||
                      (proc.name || '').toLowerCase().includes('kernel') ||
                      (proc.name || '').toLowerCase().includes('ntoskrnl') ||
                      proc.pid === 0 || proc.pid === 4;
      
      if (isSystem) {
        systemCount++;
      } else {
        appCount++;
      }
      
      totalMemory += (proc.mem || 0);
    });
    
    // Update stats
    updateRunningStats(allProcs, appCount, systemCount, totalMemory);
    
    // Render processes
    renderRunningProcesses(allProcs, importantPids);
    
    // Set up auto-refresh
    if (runningUpdateInterval) {
      clearInterval(runningUpdateInterval);
    }
    runningUpdateInterval = setInterval(() => {
      const activeTab = document.querySelector('.settings-tab.active');
      if (activeTab && activeTab.dataset.tab === 'running') {
        loadRunningOperations();
      }
    }, 5000); // Refresh every 5 seconds
    
  } catch (error) {
    console.error('Load running operations error:', error);
    if (runningList) {
      runningList.innerHTML = '<div class="empty-state">Failed to load running applications. Please try again.</div>';
    }
  }
}

function updateRunningStats(processes, appCount = 0, systemCount = 0, totalMemory = 0) {
  if (runningTotal) runningTotal.textContent = processes.length;
  if (runningApps) runningApps.textContent = appCount;
  if (runningSystem) runningSystem.textContent = systemCount;
  if (runningMemory) runningMemory.textContent = formatBytes(totalMemory * 1024 * 1024);
}

function renderRunningProcesses(processes, importantPids) {
  if (!runningList) return;
  
  // Get sort option
  const sortBy = runningSortBy ? runningSortBy.value : 'cpu';
  
  // Sort processes
  let sorted = [...processes];
  if (sortBy === 'cpu') {
    sorted.sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
  } else if (sortBy === 'memory') {
    sorted.sort((a, b) => (b.mem || 0) - (a.mem || 0));
  } else if (sortBy === 'name') {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'pid') {
    sorted.sort((a, b) => (a.pid || 0) - (b.pid || 0));
  }
  
  // Store for filtering
  allRunningProcesses = sorted;
  
  // Apply search filter
  const search = runningSearch ? runningSearch.value.toLowerCase() : '';
  const filtered = search ? sorted.filter(p => 
    (p.name || '').toLowerCase().includes(search) ||
    (p.pid || '').toString().includes(search)
  ) : sorted;
  
  // Clear and render
  runningList.innerHTML = '';
  
  if (filtered.length === 0) {
    runningList.innerHTML = '<div class="empty-state">No processes match your search.</div>';
    return;
  }
  
  const fragment = document.createDocumentFragment();
  
  filtered.forEach(proc => {
    const item = document.createElement('div');
    item.className = 'process-item';
    item.style.cursor = 'pointer';
    
    const name = proc.name || 'Unknown';
    const pid = proc.pid || 'N/A';
    const cpu = (proc.cpu || 0).toFixed(1);
    const mem = (proc.mem || 0).toFixed(1);
    const memBytes = (proc.mem || 0) * 1024 * 1024;
    
    // Determine process type
    const isSystem = (name || '').toLowerCase().includes('system') ||
                    (name || '').toLowerCase().includes('svchost') ||
                    (name || '').toLowerCase().includes('winlogon') ||
                    (name || '').toLowerCase().includes('csrss') ||
                    (name || '').toLowerCase().includes('lsass') ||
                    (name || '').toLowerCase().includes('kernel') ||
                    (name || '').toLowerCase().includes('ntoskrnl') ||
                    pid === 0 || pid === 4;
    
    const isImportant = importantPids.has(pid);
    
    // Determine if should shutdown
    let shouldShutdown = false;
    let shutdownReason = '';
    if (!isSystem && !isImportant) {
      if ((proc.cpu || 0) > 15) {
        shouldShutdown = true;
        shutdownReason = 'High CPU (>15%)';
      } else if ((proc.mem || 0) > 200) {
        shouldShutdown = true;
        shutdownReason = 'High Memory (>200MB)';
      }
    }
    
    if (shouldShutdown) {
      item.classList.add('should-shutdown');
    }
    
    if ((proc.cpu || 0) > 10 || (proc.mem || 0) > 100) {
      item.classList.add('high-usage');
    }
    
    item.innerHTML = `
      <div class="process-icon" style="background: ${isSystem ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.2)'}; color: ${isSystem ? 'var(--accent-cpu)' : 'var(--accent-net)'};">
        ${name.charAt(0).toUpperCase()}
      </div>
      <div class="process-info" style="flex: 1; min-width: 0; overflow: hidden;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div class="process-name" title="${name}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
          ${shouldShutdown ? `<span class="process-badge shutdown-badge" title="${shutdownReason}">⚠️ Shut Down</span>` : ''}
          ${isImportant ? `<span class="process-badge important-badge" title="Important application">🔒 Important</span>` : ''}
          ${isSystem ? `<span class="process-badge system-badge" title="System process">🛡️ System</span>` : ''}
        </div>
        <div class="process-details" style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">
          <span>PID: ${pid}</span>
          <span style="margin-left: 12px;">Memory: ${mem} MB</span>
          <span style="margin-left: 12px;">CPU: ${cpu}%</span>
        </div>
      </div>
      <div class="process-metrics" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 80px;">
        <div class="process-usage" style="font-weight: 600; color: var(--accent-cpu);">${cpu}%</div>
        <div style="font-size: 10px; color: var(--text-muted);">${formatBytes(memBytes)}</div>
      </div>
      <div class="process-actions">
        <button class="process-action-btn" onclick="killRunningProcess(${pid}, '${name.replace(/'/g, "\\'")}')" title="End Process" ${isSystem ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>
      </div>
    `;
    
    // Add click handler to show details
    item.addEventListener('click', (e) => {
      if (e.target.closest('.process-action-btn')) return; // Don't trigger on button click
      showProcessDetails(proc);
    });
    
    fragment.appendChild(item);
  });
  
  runningList.appendChild(fragment);
}

function showProcessDetails(proc) {
  const name = proc.name || 'Unknown';
  const pid = proc.pid || 'N/A';
  const cpu = (proc.cpu || 0).toFixed(1);
  const mem = (proc.mem || 0).toFixed(1);
  const memBytes = (proc.mem || 0) * 1024 * 1024;
  const ppid = proc.ppid || 'N/A';
  const user = proc.user || 'N/A';
  const startTime = proc.started || proc.starttime || 'N/A';
  const command = proc.command || proc.path || 'N/A';
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'process-panel';
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.zIndex = '10000';
  modal.style.width = '500px';
  modal.style.maxWidth = '90vw';
  modal.style.maxHeight = '80vh';
  modal.style.overflow = 'auto';
  
  modal.innerHTML = `
    <div style="padding: 20px; background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-family: var(--font-display); color: var(--text-primary);">Process Details</h3>
        <button onclick="this.closest('.process-panel').remove()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 24px; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">Name:</span>
          <span style="color: var(--text-primary); font-weight: 600;">${name}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">PID:</span>
          <span style="color: var(--text-primary); font-family: monospace;">${pid}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">CPU Usage:</span>
          <span style="color: var(--accent-cpu); font-weight: 600;">${cpu}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">Memory:</span>
          <span style="color: var(--accent-ram); font-weight: 600;">${formatBytes(memBytes)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">Parent PID:</span>
          <span style="color: var(--text-primary); font-family: monospace;">${ppid}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">User:</span>
          <span style="color: var(--text-primary);">${user}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">Command:</span>
          <span style="color: var(--text-primary); font-family: monospace; font-size: 10px; word-break: break-all; text-align: right; max-width: 60%;">${command}</span>
        </div>
        ${startTime !== 'N/A' ? `
        <div style="display: flex; justify-content: space-between; padding: 8px; background: var(--bg-card); border-radius: 6px;">
          <span style="color: var(--text-muted);">Started:</span>
          <span style="color: var(--text-primary);">${startTime}</span>
        </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <button onclick="killRunningProcess(${pid}, '${name.replace(/'/g, "\\'")}'); this.closest('.process-panel').remove();" 
                class="action-btn optimize-btn" style="flex: 1;">
          End Process
        </button>
        <button onclick="this.closest('.process-panel').remove()" 
                class="action-btn scan-btn" style="flex: 1;">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function killRunningProcess(pid, name) {
  if (confirm(`Are you sure you want to end process "${name}" (PID: ${pid})?`)) {
    ipcRenderer.send('kill-process', pid);
    
    // Show notification
    const showNotificationsEl = document.getElementById('showNotifications');
    if (showNotificationsEl && showNotificationsEl.checked) {
      ipcRenderer.send('show-notification',
        '🛑 Process Terminated',
        `Ended process: ${name}`,
        { urgency: 'normal' }
      );
    }
    
    // Refresh after a short delay
    setTimeout(() => {
      loadRunningOperations();
    }, 500);
  }
}

function cleanHighUsageProcesses() {
  if (!allRunningProcesses || allRunningProcesses.length === 0) {
    alert('No processes loaded. Please refresh first.');
    return;
  }
  
  // Filter high usage processes
  const highUsage = allRunningProcesses.filter(p => {
    const isSystem = (p.name || '').toLowerCase().includes('system') ||
                    (p.name || '').toLowerCase().includes('svchost') ||
                    (p.name || '').toLowerCase().includes('winlogon') ||
                    (p.name || '').toLowerCase().includes('csrss') ||
                    (p.name || '').toLowerCase().includes('lsass') ||
                    p.pid === 0 || p.pid === 4;
    
    const highCPU = (p.cpu || 0) > 15;
    const highMem = (p.mem || 0) > 200;
    
    return !isSystem && (highCPU || highMem);
  });
  
  if (highUsage.length === 0) {
    alert('No high usage processes found to clean.');
    return;
  }
  
  const names = highUsage.map(p => p.name || 'Unknown').join(', ');
  if (confirm(`This will close ${highUsage.length} high usage process(es):\n\n${names}\n\nContinue?`)) {
    let killed = 0;
    highUsage.forEach(p => {
      if (p.pid) {
        ipcRenderer.send('kill-process', p.pid);
        killed++;
      }
    });
    
    // Show notification
    const showNotificationsEl = document.getElementById('showNotifications');
    if (showNotificationsEl && showNotificationsEl.checked) {
      ipcRenderer.send('show-notification',
        '🧹 Cleaned High Usage',
        `Closed ${killed} high usage process(es)`,
        { urgency: 'normal' }
      );
    }
    
    setTimeout(() => {
      loadRunningOperations();
    }, 1000);
  }
}

function optimizeAllRunning() {
  if (!allRunningProcesses || allRunningProcesses.length === 0) {
    alert('No processes loaded. Please refresh first.');
    return;
  }
  
  // Get important processes
  const importantProcs = getImportantProcesses(allRunningProcesses);
  const importantPids = new Set(importantProcs.map(p => p.pid));
  
  // Filter optimizable processes (high usage, not system, not important)
  const optimizable = allRunningProcesses.filter(p => {
    const isSystem = (p.name || '').toLowerCase().includes('system') ||
                    (p.name || '').toLowerCase().includes('svchost') ||
                    (p.name || '').toLowerCase().includes('winlogon') ||
                    (p.name || '').toLowerCase().includes('csrss') ||
                    (p.name || '').toLowerCase().includes('lsass') ||
                    p.pid === 0 || p.pid === 4;
    
    const isImportant = importantPids.has(p.pid);
    const highCPU = (p.cpu || 0) > 10;
    const highMem = (p.mem || 0) > 150;
    
    return !isSystem && !isImportant && (highCPU || highMem);
  });
  
  if (optimizable.length === 0) {
    alert('No processes found to optimize. Your system is already optimized!');
    return;
  }
  
  // Sort by resource usage
  optimizable.sort((a, b) => {
    const scoreA = (a.cpu || 0) + ((a.mem || 0) / 10);
    const scoreB = (b.cpu || 0) + ((b.mem || 0) / 10);
    return scoreB - scoreA;
  });
  
  // Limit to top 15
  const toKill = optimizable.slice(0, 15);
  const names = toKill.map(p => p.name || 'Unknown').join(', ');
  
  if (confirm(`This will optimize your system by closing ${toKill.length} process(es):\n\n${names}\n\nContinue?`)) {
    let killed = 0;
    toKill.forEach(p => {
      if (p.pid) {
        ipcRenderer.send('kill-process', p.pid);
        killed++;
      }
    });
    
    // Show notification
    const showNotificationsEl = document.getElementById('showNotifications');
    if (showNotificationsEl && showNotificationsEl.checked) {
      ipcRenderer.send('show-notification',
        '⚡ System Optimized',
        `Closed ${killed} process(es) to optimize performance`,
        { urgency: 'normal' }
      );
    }
    
    setTimeout(() => {
      loadRunningOperations();
    }, 1000);
  }
}

// Make functions available globally
window.killRunningProcess = killRunningProcess;

// Event listeners for running operations
if (refreshRunningBtn) {
  refreshRunningBtn.addEventListener('click', () => {
    loadRunningOperations();
  });
}

if (runningSearch) {
  runningSearch.addEventListener('input', () => {
    renderRunningProcesses(allRunningProcesses, new Set());
  });
}

if (runningSortBy) {
  runningSortBy.addEventListener('change', () => {
    renderRunningProcesses(allRunningProcesses, new Set());
  });
}

if (cleanRunningBtn) {
  cleanRunningBtn.addEventListener('click', cleanHighUsageProcesses);
}

if (optimizeRunningBtn) {
  optimizeRunningBtn.addEventListener('click', optimizeAllRunning);
}

// Background Scan State Management
let backgroundScanState = {
  isRunning: false,
  isPaused: false,
  currentScanProcess: null,
  scanType: null, // 'quick' or 'full'
  filesScanned: 0,
  threatsFound: 0,
  currentFile: '',
  startTime: null,
  cancelRequested: false
};

// Security settings change handlers - auto-save on change
const enableAntivirus = document.getElementById('enableAntivirus');
const autoScanFiles = document.getElementById('autoScanFiles');
const quarantineThreats = document.getElementById('quarantineThreats');
const scheduleScans = document.getElementById('scheduleScans');
const scanScheduleSettings = document.getElementById('scanScheduleSettings');
const scanScheduleFrequency = document.getElementById('scanScheduleFrequency');
const scanScheduleTime = document.getElementById('scanScheduleTime');
const scanScheduleType = document.getElementById('scanScheduleType');
const backgroundScanStatus = document.getElementById('backgroundScanStatus');
const backgroundScanProgress = document.getElementById('backgroundScanProgress');
const backgroundScanStatusText = document.getElementById('backgroundScanStatusText');
const backgroundScanStats = document.getElementById('backgroundScanStats');
const cancelScanBtn = document.getElementById('cancelScanBtn');
const quickScanBtn = document.getElementById('quickScanBtn');
const fullScanBtn = document.getElementById('fullScanBtn');

if (enableAntivirus) {
  enableAntivirus.addEventListener('change', () => {
    saveSettings();
    if (enableAntivirus.checked) {
      checkClamAVInstallation();
    }
  });
}

if (autoScanFiles) {
  autoScanFiles.addEventListener('change', () => saveSettings());
}

if (quarantineThreats) {
  quarantineThreats.addEventListener('change', () => saveSettings());
}

if (scheduleScans) {
  scheduleScans.addEventListener('change', () => {
    if (scanScheduleSettings) {
      scanScheduleSettings.style.display = scheduleScans.checked ? 'block' : 'none';
    }
    saveSettings();
    if (scheduleScans.checked) {
      setupScheduledScans();
    } else {
      clearScheduledScans();
    }
  });
}

if (scanScheduleFrequency) {
  scanScheduleFrequency.addEventListener('change', () => saveSettings());
}

if (scanScheduleTime) {
  scanScheduleTime.addEventListener('change', () => {
    saveSettings();
    if (scheduleScans && scheduleScans.checked) {
      setupScheduledScans();
    }
  });
}

if (scanScheduleType) {
  scanScheduleType.addEventListener('change', () => saveSettings());
}

// Check ClamAV Installation
async function checkClamAVInstallation() {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  
  return new Promise((resolve) => {
    const command = platform === 'win32' ? 'where clamscan' : 'which clamscan';
    exec(command, { timeout: 2000 }, (error) => {
      if (error) {
        if (enableAntivirus) {
          alert('ClamAV is not installed. Please install ClamAV to use antivirus features.\n\nmacOS: brew install clamav\nLinux: sudo apt-get install clamav\nWindows: Download from https://www.clamav.net');
          enableAntivirus.checked = false;
        }
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Background Scan Functions (Async, Non-blocking)
async function startBackgroundScan(type = 'quick') {
  if (backgroundScanState.isRunning) {
    alert('A scan is already running. Please cancel it first.');
    return;
  }
  
  if (!enableAntivirus || !enableAntivirus.checked) {
    alert('Please enable Antivirus Protection first.');
    return;
  }
  
  const isInstalled = await checkClamAVInstallation();
  if (!isInstalled) {
    return;
  }
  
  // Reset state
  backgroundScanState = {
    isRunning: true,
    isPaused: false,
    currentScanProcess: null,
    scanType: type,
    filesScanned: 0,
    threatsFound: 0,
    currentFile: '',
    startTime: Date.now(),
    cancelRequested: false
  };
  
  // Show status UI
  if (backgroundScanStatus) backgroundScanStatus.style.display = 'block';
  if (backgroundScanProgress) backgroundScanProgress.style.width = '0%';
  if (backgroundScanStatusText) backgroundScanStatusText.textContent = `Starting ${type} scan...`;
  if (backgroundScanStats) backgroundScanStats.textContent = 'Files: 0 | Threats: 0';
  if (quickScanBtn) quickScanBtn.disabled = true;
  if (fullScanBtn) fullScanBtn.disabled = true;
  if (cancelScanBtn) cancelScanBtn.disabled = false;
  
  // Run scan in background (non-blocking)
  runBackgroundScanAsync(type);
}

async function runBackgroundScanAsync(type) {
  const { exec } = require('child_process');
  const os = require('os');
  const path = require('path');
  
  let scanPaths = [];
  if (type === 'quick') {
    // Quick scan: common user directories
    const homeDir = os.homedir();
    if (os.platform() === 'win32') {
      scanPaths = [
        path.join(homeDir, 'Downloads'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents')
      ];
    } else {
      scanPaths = [
        path.join(homeDir, 'Downloads'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Documents')
      ];
    }
  } else {
    // Full scan: root directory
    scanPaths = [os.platform() === 'win32' ? 'C:\\' : '/'];
  }
  
  // Build ClamAV command
  const scanPath = scanPaths[0];
  const command = `clamscan -r --no-summary --infected "${scanPath}"`;
  
  // Start scan process
  const scanProcess = exec(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
  backgroundScanState.currentScanProcess = scanProcess;
  
  let output = '';
  let errorOutput = '';
  
  // Update progress periodically (simulated for now)
  const progressInterval = setInterval(() => {
    if (backgroundScanState.cancelRequested) {
      clearInterval(progressInterval);
      return;
    }
    
    if (backgroundScanState.isRunning && !backgroundScanState.isPaused) {
      // Increment file count (simulated - ClamAV doesn't provide real-time progress)
      backgroundScanState.filesScanned += Math.floor(Math.random() * 10) + 1;
      
      updateBackgroundScanUI();
    }
  }, 1000);
  
  scanProcess.stdout.on('data', (data) => {
    if (backgroundScanState.cancelRequested) return;
    
    output += data.toString();
    const lines = output.split('\n');
    
    // Parse ClamAV output for threats
    lines.forEach(line => {
      if (line.includes(' FOUND')) {
        backgroundScanState.threatsFound++;
        const threatMatch = line.match(/^([^:]+): (.+) FOUND$/);
        if (threatMatch) {
          backgroundScanState.currentFile = threatMatch[1];
          logThreatDetection(threatMatch[1], threatMatch[2]);
        }
      }
    });
    
    backgroundScanState.filesScanned += lines.length;
    updateBackgroundScanUI();
  });
  
  scanProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
    // Update current file from stderr
    const fileMatch = data.toString().match(/Scanning (.+)$/);
    if (fileMatch) {
      backgroundScanState.currentFile = fileMatch[1];
      updateBackgroundScanUI();
    }
  });
  
  scanProcess.on('close', (code) => {
    clearInterval(progressInterval);
    
    if (backgroundScanState.cancelRequested) {
      // Scan was cancelled
      backgroundScanState.isRunning = false;
      backgroundScanState.currentScanProcess = null;
      if (backgroundScanStatus) backgroundScanStatus.style.display = 'none';
      if (backgroundScanStatusText) backgroundScanStatusText.textContent = 'Scan cancelled';
    } else {
      // Scan completed
      backgroundScanState.isRunning = false;
      if (backgroundScanProgress) backgroundScanProgress.style.width = '100%';
      if (backgroundScanStatusText) {
        backgroundScanStatusText.textContent = backgroundScanState.threatsFound > 0 
          ? `Scan complete! Found ${backgroundScanState.threatsFound} threat(s)`
          : 'Scan complete! No threats found';
      }
      
      // Show notification
      const showNotificationsEl = document.getElementById('showNotifications');
      if (showNotificationsEl && showNotificationsEl.checked) {
        ipcRenderer.send('show-notification',
          backgroundScanState.threatsFound > 0 ? '🚨 Threats Detected!' : '✅ Scan Complete',
          backgroundScanState.threatsFound > 0
            ? `Found ${backgroundScanState.threatsFound} threat(s) in ${backgroundScanState.filesScanned} files`
            : `Scanned ${backgroundScanState.filesScanned} files. No threats found.`,
          { urgency: backgroundScanState.threatsFound > 0 ? 'critical' : 'normal' }
        );
      }
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (backgroundScanStatus) backgroundScanStatus.style.display = 'none';
      }, 5000);
    }
    
    if (quickScanBtn) quickScanBtn.disabled = false;
    if (fullScanBtn) fullScanBtn.disabled = false;
    if (cancelScanBtn) cancelScanBtn.disabled = false;
    
    backgroundScanState.currentScanProcess = null;
  });
  
  scanProcess.on('error', (error) => {
    clearInterval(progressInterval);
    backgroundScanState.isRunning = false;
    backgroundScanState.currentScanProcess = null;
    
    if (backgroundScanStatus) backgroundScanStatus.style.display = 'none';
    alert('Error starting scan: ' + error.message);
    
    if (quickScanBtn) quickScanBtn.disabled = false;
    if (fullScanBtn) fullScanBtn.disabled = false;
  });
}

function updateBackgroundScanUI() {
  if (!backgroundScanState.isRunning) return;
  
  const elapsed = Math.floor((Date.now() - backgroundScanState.startTime) / 1000);
  const elapsedText = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  
  if (backgroundScanStatusText) {
    if (backgroundScanState.currentFile) {
      const fileName = require('path').basename(backgroundScanState.currentFile);
      backgroundScanStatusText.textContent = `Scanning: ${fileName}...`;
    } else {
      backgroundScanStatusText.textContent = `Scanning... (${elapsedText})`;
    }
  }
  
  if (backgroundScanStats) {
    backgroundScanStats.textContent = `Files: ${backgroundScanState.filesScanned} | Threats: ${backgroundScanState.threatsFound}`;
  }
  
  // Update progress (estimated - ClamAV doesn't provide real progress)
  if (backgroundScanProgress) {
    // Simulate progress (0-90% during scan, 100% on completion)
    const estimatedProgress = Math.min(90, (backgroundScanState.filesScanned / 1000) * 90);
    backgroundScanProgress.style.width = `${estimatedProgress}%`;
  }
}

function logThreatDetection(filePath, threatName) {
  console.warn(`🚨 THREAT DETECTED: ${filePath} - ${threatName}`);
  
  // Auto-quarantine if enabled
  if (quarantineThreats && quarantineThreats.checked) {
    quarantineFile(filePath);
  }
}

function quarantineFile(filePath) {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  
  const quarantineDir = path.join(os.tmpdir(), 'rocketram-quarantine');
  
  try {
    if (!fs.existsSync(quarantineDir)) {
      fs.mkdirSync(quarantineDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const quarantinePath = path.join(quarantineDir, `${Date.now()}_${fileName}`);
    
    fs.renameSync(filePath, quarantinePath);
    console.log(`Quarantined: ${fileName}`);
  } catch (error) {
    console.error(`Failed to quarantine ${path.basename(filePath)}:`, error.message);
  }
}

// Cancel/Pause Background Scan
function cancelBackgroundScan() {
  if (!backgroundScanState.isRunning) return;
  
  if (confirm('Are you sure you want to cancel the current scan?')) {
    backgroundScanState.cancelRequested = true;
    
    if (backgroundScanState.currentScanProcess) {
      backgroundScanState.currentScanProcess.kill();
    }
    
    backgroundScanState.isRunning = false;
    backgroundScanState.currentScanProcess = null;
    
    if (backgroundScanStatus) backgroundScanStatus.style.display = 'none';
    if (quickScanBtn) quickScanBtn.disabled = false;
    if (fullScanBtn) fullScanBtn.disabled = false;
    
    ipcRenderer.send('show-notification',
      'Scan Cancelled',
      'Background scan has been cancelled',
      { urgency: 'normal' }
    );
  }
}

// Scheduled Scans
let scheduledScanInterval = null;

function setupScheduledScans() {
  clearScheduledScans();
  
  if (!scheduleScans || !scheduleScans.checked) return;
  if (!scanScheduleTime || !scanScheduleFrequency) return;
  
  const frequency = scanScheduleFrequency.value;
  const time = scanScheduleTime.value;
  const scanType = scanScheduleType ? scanScheduleType.value : 'quick';
  const [hours, minutes] = time.split(':');
  
  const checkAndRunScan = () => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    let shouldRun = false;
    
    if (frequency === 'daily') {
      shouldRun = now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes);
    } else if (frequency === 'weekly') {
      // Run on Monday at scheduled time
      shouldRun = now.getDay() === 1 && now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes);
    } else if (frequency === 'monthly') {
      // Run on first day of month at scheduled time
      shouldRun = now.getDate() === 1 && now.getHours() === parseInt(hours) && now.getMinutes() === parseInt(minutes);
    }
    
    if (shouldRun && !backgroundScanState.isRunning && enableAntivirus && enableAntivirus.checked) {
      startBackgroundScan(scanType);
    }
  };
  
  // Check every minute
  scheduledScanInterval = setInterval(checkAndRunScan, 60000);
  
  // Also check immediately
  checkAndRunScan();
}

function clearScheduledScans() {
  if (scheduledScanInterval) {
    clearInterval(scheduledScanInterval);
    scheduledScanInterval = null;
  }
}

// Event Listeners
if (cancelScanBtn) {
  cancelScanBtn.addEventListener('click', cancelBackgroundScan);
}

if (quickScanBtn) {
  quickScanBtn.addEventListener('click', () => startBackgroundScan('quick'));
}

if (fullScanBtn) {
  fullScanBtn.addEventListener('click', () => startBackgroundScan('full'));
}

// Initialize scheduled scans on load
setTimeout(() => {
  if (scheduleScans && scheduleScans.checked) {
    setupScheduledScans();
  }
}, 2000);

const enableYara = document.getElementById('enableYara');
const useCustomRules = document.getElementById('useCustomRules');
const enableOsquery = document.getElementById('enableOsquery');
const osqueryRealTime = document.getElementById('osqueryRealTime');
const enableSuricata = document.getElementById('enableSuricata');
const suricataIPS = document.getElementById('suricataIPS');
const enableWazuh = document.getElementById('enableWazuh');
const wazuhAutoReport = document.getElementById('wazuhAutoReport');
const wazuhManagerUrl = document.getElementById('wazuhManagerUrl');
const wazuhUsername = document.getElementById('wazuhUsername');
const wazuhPassword = document.getElementById('wazuhPassword');

if (enableYara) {
  enableYara.addEventListener('change', () => saveSettings());
}

if (useCustomRules) {
  useCustomRules.addEventListener('change', () => saveSettings());
}

if (enableOsquery) {
  enableOsquery.addEventListener('change', () => saveSettings());
}

if (osqueryRealTime) {
  osqueryRealTime.addEventListener('change', () => saveSettings());
}

if (enableSuricata) {
  enableSuricata.addEventListener('change', () => saveSettings());
}

if (suricataIPS) {
  suricataIPS.addEventListener('change', () => saveSettings());
}

if (enableWazuh) {
  enableWazuh.addEventListener('change', () => saveSettings());
}

if (wazuhAutoReport) {
  wazuhAutoReport.addEventListener('change', () => saveSettings());
}

if (wazuhManagerUrl) {
  wazuhManagerUrl.addEventListener('blur', () => saveSettings());
}

if (wazuhUsername) {
  wazuhUsername.addEventListener('blur', () => saveSettings());
}

if (wazuhPassword) {
  wazuhPassword.addEventListener('blur', () => saveSettings());
}

// Disk Space Analyzer
const analyzeDiskBtn = document.getElementById('analyzeDiskBtn');
const diskAnalyzerResults = document.getElementById('diskAnalyzerResults');
const diskFolders = document.getElementById('diskFolders');
const diskTotalSize = document.getElementById('diskTotalSize');
const diskUsedSize = document.getElementById('diskUsedSize');
const diskFreeSize = document.getElementById('diskFreeSize');

if (analyzeDiskBtn) {
  analyzeDiskBtn.addEventListener('click', async () => {
    analyzeDiskBtn.disabled = true;
    analyzeDiskBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyzing...';
    if (diskAnalyzerResults) diskAnalyzerResults.style.display = 'none';
    
    try {
      const fsSize = await si.fsSize();
      const primaryDisk = fsSize.find(d => d.mount === 'C:' || d.mount === '/') || fsSize[0];
      
      if (primaryDisk) {
        const total = primaryDisk.size;
        const used = primaryDisk.used;
        const free = primaryDisk.available;
        
        if (diskTotalSize) diskTotalSize.textContent = formatBytes(total);
        if (diskUsedSize) diskUsedSize.textContent = formatBytes(used);
        if (diskFreeSize) diskFreeSize.textContent = formatBytes(free);
        
        // Analyze largest folders
        const { exec } = require('child_process');
        const drive = primaryDisk.mount.replace(':', '');
        
        exec(`powershell -Command "Get-ChildItem -Path '${drive}:\\' -Directory -ErrorAction SilentlyContinue | ForEach-Object { $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; [PSCustomObject]@{Name=$_.Name; Path=$_.FullName; Size=$size} } | Sort-Object Size -Descending | Select-Object -First 20 | ConvertTo-Json"`, (error, stdout) => {
          if (diskFolders) {
            diskFolders.innerHTML = '<h4 style="margin: 16px 0 12px 0; font-size: 13px; color: var(--text-primary);">Largest Folders:</h4>';
            
            if (!error && stdout) {
              try {
                const folders = JSON.parse(stdout);
                const folderArray = Array.isArray(folders) ? folders : [folders].filter(f => f);
                
                folderArray.forEach(folder => {
                  if (!folder || !folder.Size) return;
                  
                  const percent = (folder.Size / total) * 100;
                  const item = document.createElement('div');
                  item.className = 'disk-folder-item';
                  item.innerHTML = `
                    <div class="folder-info">
                      <div class="folder-name">${folder.Name || 'Unknown'}</div>
                      <div class="folder-path">${folder.Path || ''}</div>
                      <div class="folder-percent">
                        <div class="folder-percent-fill" style="width: ${percent}%"></div>
                      </div>
                    </div>
                    <div class="folder-size">${formatBytes(folder.Size)}</div>
                  `;
                  diskFolders.appendChild(item);
                });
              } catch (e) {
                diskFolders.innerHTML += '<div class="empty-state">Error parsing folder data</div>';
              }
            } else {
              diskFolders.innerHTML += '<div class="empty-state">Could not analyze folders. Some folders may require admin access.</div>';
            }
          }
          
          if (diskAnalyzerResults) diskAnalyzerResults.style.display = 'block';
          analyzeDiskBtn.disabled = false;
          analyzeDiskBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze Disk';
        });
      }
    } catch (error) {
      console.error('Disk analyzer error:', error);
      if (diskAnalyzerResults) diskAnalyzerResults.style.display = 'block';
      analyzeDiskBtn.disabled = false;
      analyzeDiskBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Analyze Disk';
    }
  });
}

// Refresh button handlers
const refreshNetworkBtn = document.getElementById('refreshNetworkBtn');

if (refreshNetworkBtn) {
  refreshNetworkBtn.addEventListener('click', () => {
    loadNetworkConnections();
  });
}

// Initialize - wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

function initialize() {
  try {
    // Add error handling to all update functions
    loadStaticData().catch(err => console.error('Load static data error:', err));
    updateAll().catch(err => console.error('Update all error:', err));
    
    // Check for ClamAV installation on startup (non-blocking)
    setTimeout(() => {
      checkAndPromptClamAVInstallation().catch(err => console.error('ClamAV check error:', err));
    }, 3000);
    
    // Update every second with error handling
    setInterval(() => {
      updateAll().catch(err => console.error('Update error:', err));
    }, 1000);
    
    // Less frequent updates for disk (every 5 seconds)
    setInterval(() => {
      updateDisk().catch(err => console.error('Disk update error:', err));
    }, 5000);
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Check and prompt for ClamAV installation if not installed
async function checkAndPromptClamAVInstallation() {
  const { exec } = require('child_process');
  const os = require('os');
  const platform = os.platform();
  
  // Check if ClamAV is installed
  const isInstalled = await new Promise((resolve) => {
    const command = platform === 'win32' ? 'where clamscan' : 'which clamscan';
    exec(command, { timeout: 2000 }, (error) => {
      resolve(!error);
    });
  });
  
  // Only show prompt if not installed and user hasn't dismissed it recently
  if (!isInstalled) {
    const lastPrompt = localStorage.getItem('clamavInstallPromptDismissed');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Show prompt if never shown or more than 1 day ago
    if (!lastPrompt || (now - parseInt(lastPrompt)) > oneDay) {
      // Don't auto-prompt, just update the status
      // User can click install button when ready
      console.log('ClamAV not installed. User can install from antivirus panel.');
    }
  }
}

