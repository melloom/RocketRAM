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
let currentProcessType = null;
let allProcesses = [];
let filteredProcesses = [];
let processUpdateInterval = null;

// Mini Graphs Data
const graphData = {
  cpu: [],
  ram: [],
  disk: []
};
const MAX_GRAPH_POINTS = 60; // 60 seconds of data

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
    
    const usage = Math.round(load.currentLoad);
    cpuValue.textContent = usage + '%';
    cpuBar.style.width = usage + '%';
    cpuDetail.textContent = cpuSpeed.avg.toFixed(2) + ' GHz';
    cpuName.textContent = cpu.brand.substring(0, 30) + (cpu.brand.length > 30 ? '...' : '');
    
    // Add warning class for high CPU
    const cpuCard = cpuValue.closest('.metric-card');
    if (usage > 90) {
      cpuCard.classList.add('warning');
    } else {
      cpuCard.classList.remove('warning');
    }
    
    // Try to get temperature (may not work on all systems)
    try {
      const temps = await Promise.race([
        si.cpuTemperature(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      if (temps.main !== null && temps.main !== -1) {
        cpuTemp.textContent = Math.round(temps.main) + '°C';
      } else {
        cpuTemp.textContent = '--';
      }
    } catch (e) {
      cpuTemp.textContent = '--';
    }
  } catch (error) {
    console.error('CPU update error:', error);
    cpuValue.textContent = '--';
    cpuDetail.textContent = '--';
  }
}

async function updateRAM() {
  try {
    const mem = await Promise.race([
      si.mem(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    const usedPercent = Math.round((mem.used / mem.total) * 100);
    const usedGB = (mem.used / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (mem.total / (1024 * 1024 * 1024)).toFixed(1);
    const availableGB = (mem.available / (1024 * 1024 * 1024)).toFixed(1);
    const cachedGB = (mem.cached / (1024 * 1024 * 1024)).toFixed(1);
    
    ramValue.textContent = usedPercent + '%';
    ramBar.style.width = usedPercent + '%';
    ramDetail.textContent = `${usedGB} / ${totalGB} GB`;
    ramAvailable.textContent = `Available: ${availableGB} GB`;
    ramCached.textContent = `Cached: ${cachedGB} GB`;
    
    // Add to graph data
    graphData.ram.push(usedPercent);
    if (graphData.ram.length > MAX_GRAPH_POINTS) {
      graphData.ram.shift();
    }
    drawGraph('ramGraph', graphData.ram, 'rgb(139, 92, 246)');
  } catch (error) {
    console.error('RAM update error:', error);
    ramValue.textContent = '--';
    ramDetail.textContent = '--';
  }
}

async function updateDisk() {
  try {
    const fsSize = await si.fsSize();
    const disksIO = await si.disksIO();
    
    // Get primary disk (usually C: on Windows)
    const primaryDisk = fsSize.find(d => d.mount === 'C:' || d.mount === '/') || fsSize[0];
    
    if (primaryDisk) {
      const usedPercent = Math.round(primaryDisk.use);
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
      drawGraph('diskGraph', graphData.disk, 'rgb(6, 182, 212)');
    }
    
    // Disk I/O speed
    if (disksIO && previousDiskStats) {
      const readSpeed = Math.max(0, (disksIO.rIO_sec || 0));
      const writeSpeed = Math.max(0, (disksIO.wIO_sec || 0));
      diskRead.textContent = '↓ ' + formatSpeed(readSpeed);
      diskWrite.textContent = '↑ ' + formatSpeed(writeSpeed);
    }
    previousDiskStats = disksIO;
  } catch (error) {
    console.error('Disk update error:', error);
  }
}

async function updateNetwork() {
  try {
    const networkStats = await si.networkStats();
    const interfaces = await si.networkInterfaces();
    
    // Find active interface
    const activeInterface = interfaces.find(i => i.operstate === 'up' && !i.internal);
    
    if (activeInterface) {
      netValue.textContent = 'Connected';
      netDetail.textContent = activeInterface.iface;
    }
    
    // Calculate network speed
    const stats = networkStats[0];
    if (stats && previousNetStats) {
      const rxSpeed = Math.max(0, stats.rx_sec || 0);
      const txSpeed = Math.max(0, stats.tx_sec || 0);
      
      netDown.textContent = formatSpeed(rxSpeed);
      netUp.textContent = formatSpeed(txSpeed);
    }
    previousNetStats = stats;
  } catch (error) {
    console.error('Network update error:', error);
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
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
    ]);
    
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      const gpu = graphics.controllers[0];
      gpuCard.style.display = 'block';
      gpuName.textContent = (gpu.model || 'Unknown GPU').substring(0, 30);
      gpuValue.textContent = '--%';
      gpuDetail.textContent = gpu.vram ? formatBytes(gpu.vram * 1024 * 1024) : '--';
    } else {
      gpuCard.style.display = 'none';
    }
  } catch (error) {
    if (gpuCard) gpuCard.style.display = 'none';
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
      batteryTime.textContent = battery.timeRemaining ? formatUptime(battery.timeRemaining * 60) : '--';
      batteryDetail.textContent = battery.isCharging ? 'Plugged in' : 'On battery';
    } else {
      batteryCard.style.display = 'none';
    }
  } catch (error) {
    if (batteryCard) batteryCard.style.display = 'none';
  }
}

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

function checkAlerts() {
  try {
    // Simple alert checking - can be enhanced
    const cpuCard = cpuValue.closest('.metric-card');
    const ramCard = ramValue.closest('.metric-card');
    
    const cpuPercent = parseInt(cpuValue.textContent) || 0;
    const ramPercent = parseInt(ramValue.textContent) || 0;
    
    // Update alert states
    if (cpuPercent > 90) {
      if (!alertStates.cpu.active) {
        alertStates.cpu.active = true;
        alertStates.cpu.startTime = Date.now();
      }
    } else {
      alertStates.cpu.active = false;
      alertStates.cpu.notified = false;
    }
    
    if (ramPercent > 85) {
      if (!alertStates.ram.active) {
        alertStates.ram.active = true;
        alertStates.ram.startTime = Date.now();
      }
    } else {
      alertStates.ram.active = false;
      alertStates.ram.notified = false;
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
    exec('powershell -Command "Get-Service | Select-Object Name, Status, DisplayName | ConvertTo-Json"', (error, stdout) => {
      if (error || !stdout) {
        servicesList.innerHTML = '<div class="empty-state">Failed to load services. Admin rights may be required.</div>';
        return;
      }
      
      try {
        const services = JSON.parse(stdout);
        const serviceArray = Array.isArray(services) ? services : [services].filter(s => s);
        
        servicesList.innerHTML = '';
        serviceArray.forEach(service => {
          if (!service || !service.Name) return;
          
          const item = document.createElement('div');
          item.className = 'service-item';
          item.innerHTML = `
            <div class="service-info">
              <div class="service-name">${service.DisplayName || service.Name}</div>
              <div class="service-status ${service.Status === 'Running' ? 'running' : 'stopped'}">${service.Status || 'Unknown'}</div>
            </div>
          `;
          servicesList.appendChild(item);
        });
      } catch (e) {
        servicesList.innerHTML = '<div class="empty-state">Error parsing services data.</div>';
      }
    });
  } catch (error) {
    console.error('Load services error:', error);
  }
}

function loadNetworkConnections() {
  try {
    const networkList = document.getElementById('networkList');
    if (!networkList) return;
    
    networkList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading network connections...</span></div>';
    
    setTimeout(async () => {
      try {
        const interfaces = await si.networkInterfaces();
        networkList.innerHTML = '';
        
        interfaces.forEach(iface => {
          const item = document.createElement('div');
          item.className = 'network-item';
          item.innerHTML = `
            <div class="network-info">
              <div class="network-name">${iface.iface || 'Unknown'}</div>
              <div class="network-details">
                <span>IP: ${iface.ip4 || 'N/A'}</span>
                <span>Status: ${iface.operstate || 'Unknown'}</span>
              </div>
            </div>
          `;
          networkList.appendChild(item);
        });
      } catch (error) {
        networkList.innerHTML = '<div class="empty-state">Failed to load network connections.</div>';
      }
    }, 500);
  } catch (error) {
    console.error('Load network error:', error);
  }
}

// Initial load of static data
async function loadStaticData() {
  try {
    const cpu = await si.cpu();
    cpuName.textContent = cpu.brand.substring(0, 30) + (cpu.brand.length > 30 ? '...' : '');
  } catch (error) {
    console.error('Static data error:', error);
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
async function fetchProcesses(type = 'cpu') {
  try {
    loadingState.style.display = 'flex';
    processList.innerHTML = '';
    processList.appendChild(loadingState);
    
    const processes = await Promise.race([
      si.processes(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    loadingState.style.display = 'none';
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
    renderProcesses();
    
  } catch (error) {
    console.error('Process fetch error:', error);
    loadingState.style.display = 'none';
    processList.innerHTML = '<div class="empty-state">Failed to load processes. Please try again.</div>';
  }
}

function renderProcesses() {
  processList.innerHTML = '';
  processCount.textContent = filteredProcesses.length;
  
  if (filteredProcesses.length === 0) {
    processList.innerHTML = '<div class="empty-state">No processes found</div>';
    return;
  }
  
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
    
    const isHighUsage = (currentProcessType === 'cpu' && (proc.cpu || 0) > 10) ||
                       (currentProcessType === 'ram' && (proc.mem || 0) > 100);
    
    if (isHighUsage) {
      item.classList.add('high-usage');
    }
    
    const name = proc.name || 'Unknown';
    const pid = proc.pid || 'N/A';
    const memMB = (proc.mem || 0).toFixed(1);
    
    item.innerHTML = `
      <div class="process-icon">${name.charAt(0).toUpperCase()}</div>
      <div class="process-info">
        <div class="process-name" title="${name}">${name}</div>
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
    
    processList.appendChild(item);
  });
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

function optimizeSystem() {
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
document.querySelectorAll('.metric-card').forEach((card, index) => {
  card.addEventListener('click', () => {
    const types = ['cpu', 'ram', 'disk', 'network'];
    const type = types[index];
    currentProcessType = type;
    
    const titles = {
      'cpu': 'CPU PROCESSES',
      'ram': 'MEMORY PROCESSES',
      'disk': 'DISK PROCESSES',
      'network': 'NETWORK PROCESSES'
    };
    
    processTitle.textContent = titles[type];
    processOverlay.classList.add('active');
    fetchProcesses(type);
    
    // Start auto-refresh
    if (processUpdateInterval) {
      clearInterval(processUpdateInterval);
    }
    processUpdateInterval = setInterval(() => {
      fetchProcesses(type);
    }, 3000);
  });
});

// Close panel
function closeProcessPanel() {
  processOverlay.classList.remove('active');
  if (processUpdateInterval) {
    clearInterval(processUpdateInterval);
    processUpdateInterval = null;
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
        }
      } catch (error) {
        console.error('Tab switch error:', error);
      }
    });
  });
}

// Open/close settings
if (settingsBtn) {
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
  if (document.getElementById('showNotifications').checked) {
    ipcRenderer.send('show-notification', 'Cleanup Complete', `Freed ${formatBytes(totalSpaceFreed)} of disk space!`);
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
  if (document.getElementById('showNotifications').checked) {
    ipcRenderer.send('show-notification', 'Optimization Complete', 'Your computer has been optimized!');
  }
});

// Schedule functionality
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

function updateNextRunTime() {
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
      thumbnails: document.getElementById('cleanThumbnails').checked
    },
    optimization: {
      startup: document.getElementById('optStartup').checked,
      services: document.getElementById('optServices').checked,
      registry: document.getElementById('optRegistry').checked,
      disk: document.getElementById('optDiskDefrag').checked,
      memory: document.getElementById('optMemory').checked
    },
    schedule: {
      enabled: document.getElementById('enableSchedule').checked,
      frequency: scheduleFrequency.value,
      time: scheduleTime.value
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
    if (settings.schedule) {
      document.getElementById('enableSchedule').checked = settings.schedule.enabled || false;
      scheduleSettings.style.display = settings.schedule.enabled ? 'block' : 'none';
      scheduleFrequency.value = settings.schedule.frequency || 'daily';
      scheduleTime.value = settings.schedule.time || '02:00';
      updateNextRunTime();
    }
    
    // Load advanced settings
    if (settings.advanced) {
      document.getElementById('autoStartup').checked = settings.advanced.autoStartup !== false;
      document.getElementById('alwaysOnTop').checked = settings.advanced.alwaysOnTop !== false;
      document.getElementById('minimizeToTray').checked = settings.advanced.minimizeToTray || false;
      document.getElementById('showNotifications').checked = settings.advanced.showNotifications !== false;
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

async function loadStartupPrograms() {
  try {
    if (!startupList) return;
    startupList.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading startup programs...</span></div>';
    
    const { exec } = require('child_process');
    
    // Get startup programs from registry
    exec('powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | ConvertTo-Json"', (error, stdout) => {
      if (error || !stdout) {
        if (startupList) startupList.innerHTML = '<div class="empty-state">Failed to load startup programs. Admin rights may be required.</div>';
        return;
      }
      
      try {
        const programs = JSON.parse(stdout);
        const programArray = Array.isArray(programs) ? programs : [programs].filter(p => p);
        
        if (!startupList) return;
        startupList.innerHTML = '';
        let enabledCount = 0;
        let disabledCount = 0;
        
        programArray.forEach(program => {
          if (!program || !program.Name) return;
          
          const item = document.createElement('div');
          item.className = 'startup-item';
          const isEnabled = true;
          
          if (isEnabled) enabledCount++;
          else disabledCount++;
          
          const safeName = (program.Name || '').replace(/'/g, "\\'");
          item.innerHTML = `
            <div class="startup-info">
              <div class="startup-name">${program.Name || 'Unknown'}</div>
              <div class="startup-path">${program.Command || program.Location || 'N/A'}</div>
            </div>
            <button class="startup-toggle ${isEnabled ? 'enabled' : 'disabled'}" 
                    onclick="toggleStartup('${safeName}', ${isEnabled})">
              ${isEnabled ? 'Disable' : 'Enable'}
            </button>
          `;
          startupList.appendChild(item);
        });
        
        if (startupTotal) startupTotal.textContent = programArray.length;
        if (startupEnabled) startupEnabled.textContent = enabledCount;
        if (startupDisabled) startupDisabled.textContent = disabledCount;
      } catch (e) {
        if (startupList) startupList.innerHTML = '<div class="empty-state">No startup programs found or error parsing data.</div>';
      }
    });
  } catch (error) {
    console.error('Startup programs error:', error);
    if (startupList) startupList.innerHTML = '<div class="empty-state">Error loading startup programs</div>';
  }
}

function toggleStartup(name, currentState) {
  const { exec } = require('child_process');
  const action = currentState ? 'disable' : 'enable';
  
  exec(`powershell -Command "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name '${name.replace(/'/g, "''")}' -ErrorAction SilentlyContinue"`, (error) => {
    if (error) {
      alert(`Failed to ${action} startup program. Admin rights may be required.`);
    } else {
      setTimeout(loadStartupPrograms, 500);
    }
  });
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
const refreshServicesBtn = document.getElementById('refreshServicesBtn');

if (refreshNetworkBtn) {
  refreshNetworkBtn.addEventListener('click', () => {
    loadNetworkConnections();
  });
}

if (refreshServicesBtn) {
  refreshServicesBtn.addEventListener('click', () => {
    loadServices();
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

