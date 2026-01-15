// src/main/services/aiMonitorService.js
// Service: Monitors the local AI server (llama.cpp) health status.

const { BrowserWindow } = require('electron');

let lastAIStatus = false;
let intervalId = null;

/**
 * Performs a single health check against the local AI server.
 * If the status changes, broadcasts an 'ai:status-change' event to all windows.
 * @returns {Promise<boolean>} True if server is online, false otherwise.
 */
async function performHealthCheck() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const res = await fetch('http://localhost:8000/v1/models', {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        const isOnline = res.ok;
        if (isOnline !== lastAIStatus) {
            lastAIStatus = isOnline;
            broadcastStatus(isOnline);
        }
        return isOnline;
    } catch (e) {
        if (lastAIStatus !== false) {
            lastAIStatus = false;
            broadcastStatus(false);
        }
        return false;
    }
}

/**
 * Broadcasts the AI status to all open BrowserWindows.
 * @param {boolean} status - The current AI server status.
 */
function broadcastStatus(status) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => win.webContents.send('ai:status-change', status));
}

/**
 * Starts the periodic health check monitor.
 * @param {number} intervalMs - The interval in milliseconds. Default: 8000.
 */
function startMonitor(intervalMs = 8000) {
    if (intervalId) return; // Already running
    console.log('[AIMonitor] Starting periodic health check...');
    intervalId = setInterval(performHealthCheck, intervalMs);
}

/**
 * Stops the periodic health check monitor.
 */
function stopMonitor() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[AIMonitor] Monitor stopped.');
    }
}

module.exports = {
    performHealthCheck,
    startMonitor,
    stopMonitor
};
