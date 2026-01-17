/**
 * monitoring.js
 * Handles the logic for the standalone monitoring dashboard using BroadcastChannel.
 */

// Initialize channel
const channel = new BroadcastChannel('giteach-monitoring');

// UI Elements
const els = {
    workersGrid: document.getElementById('workers-grid'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    queueText: document.getElementById('queue-text'),
    uptime: document.getElementById('uptime'),
    memUsage: document.getElementById('mem-usage'),
    logStream: document.getElementById('log-stream')
};

// State
let lastWorkerCount = 0;

// Listen for messages
channel.onmessage = (event) => {
    const data = event.data;
    if (data.type === 'STATUS_UPDATE') {
        updateDashboard(data);
    }
};

/**
 * Updates the entire dashboard UI based on the payload
 * @param {Object} data - The status payload from WorkerHealthMonitor
 */
function updateDashboard(data) {
    updateSystemStats(data.system);
    updateQueueStats(data.queue);
    updateWorkers(data.workers);
    updateLogs(data.logs);
}

function updateSystemStats(system) {
    // Uptime
    const seconds = Math.floor(system.uptime / 1000);
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    els.uptime.textContent = `UPTIME: ${h}:${m}:${s}`;

    // Memory
    const usedMB = Math.round(system.memory.used / 1024 / 1024);
    const totalMB = Math.round(system.memory.total / 1024 / 1024);
    els.memUsage.textContent = `RAM: ${usedMB}MB / ${totalMB}MB`;
}

function updateQueueStats(queue) {
    els.progressFill.style.width = `${queue.percent}%`;
    els.progressText.textContent = `${queue.percent}%`;
    els.queueText.textContent = `${queue.processed}/${queue.total} items`;
}

function updateWorkers(workers) {
    // Ensure we have correct number of cards
    // Note: We avoid clearing innerHTML to prevent flickering

    // First, sync the number of cards
    const currentCards = els.workersGrid.children;

    // If we have fewer cards than workers, add more
    for (let i = currentCards.length; i < workers.length; i++) {
        const div = document.createElement('div');
        div.className = 'worker-card idle';
        div.id = `worker-${workers[i].id}`;
        div.innerHTML = `
            <span class="worker-id">W-${workers[i].id}</span>
            <span class="worker-status">IDLE</span>
            <span class="worker-file">--</span>
        `;
        els.workersGrid.appendChild(div);
    }

    // Now update each card
    workers.forEach((worker, index) => {
        const card = els.workersGrid.children[index];
        if (!card) return;

        // Update classes based on status
        card.className = 'worker-card';
        if (worker.status === 'PROCESSING') card.classList.add('processing');
        else if (worker.status === 'ERROR') card.classList.add('error');
        else card.classList.add('idle');

        // Update Content
        const statusSpan = card.querySelector('.worker-status');
        const fileSpan = card.querySelector('.worker-file');

        statusSpan.textContent = worker.status;
        fileSpan.textContent = worker.file || '--';

        // Add duration if processing
        if (worker.status === 'PROCESSING' && worker.duration) {
            statusSpan.textContent += ` (${(worker.duration / 1000).toFixed(1)}s)`;
        }
    });
}

function updateLogs(logs) {
    // Prepend new logs
    // In a real scenario, we might want to check timestamps to avoid duplicates,
    // but for now we'll just take the latest batch and hope the interval matches nicely,
    // or better: just clear and render last 50 for simplicity in this version, 
    // OR: The monitor sends the *last 5 logs*. We should just display them.
    // To make it look like a stream, we can check if they are new.

    // Simple approach: Clear and refill for now to ensure sync, 
    // but better user experience is appending.

    // Let's just render the 'last N logs' provided by the payload
    els.logStream.innerHTML = '';

    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-entry ${log.level.toLowerCase()}`;
        div.textContent = `[${log.time}] [${log.level}] ${log.msg}`;
        els.logStream.appendChild(div);
    });
}
