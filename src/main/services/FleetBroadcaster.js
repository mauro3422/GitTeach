/**
 * FleetBroadcaster - Simple IPC service to send updates to all BrowserWindow instances.
 */
import { BrowserWindow } from 'electron';

export class FleetBroadcaster {
    constructor(slotManager) {
        this.slotManager = slotManager;
    }

    /**
     * Send the current fleet state to all open windows
     */
    broadcastFleetState() {
        const fleetState = this.slotManager.getFleetState();
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('fleet:status-update', fleetState);
            }
        });
    }

    /**
     * Send a specific message to all windows
     */
    broadcastMessage(channel, data) {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        });
    }

    /**
     * Send a message to a specific window
     */
    sendToWindow(windowId, channel, data) {
        const windows = BrowserWindow.getAllWindows();
        const targetWindow = windows.find(win => win.id === windowId);

        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send(channel, data);
        }
    }

    /**
     * Get count of active windows
     */
    getActiveWindowCount() {
        return BrowserWindow.getAllWindows().filter(win => !win.isDestroyed()).length;
    }

    /**
     * Broadcast fleet health status
     */
    broadcastHealthStatus() {
        const fleetState = this.slotManager.getFleetState();
        const healthData = {
            timestamp: Date.now(),
            ports: [8000, 8001, 8002],
            status: {}
        };

        healthData.ports.forEach(port => {
            const state = fleetState[port];
            healthData.status[port] = {
                online: state?.online || false,
                total_slots: state?.total_slots || 0,
                active_slots: state?.slots?.filter(s => s.state === 'processing').length || 0
            };
        });

        this.broadcastMessage('fleet:health-update', healthData);
    }
}
