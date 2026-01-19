// src/main/services/AIFleetService.js
import { BrowserWindow } from 'electron';

class AIFleetService {
    constructor() {
        this.ports = [8000, 8001, 8002];
        this.fleetState = {};
        this.intervalId = null;
        this.isPolling = false;

        // Initial state
        this.ports.forEach(port => {
            this.fleetState[port] = { online: false, slots: [], total_slots: 0 };
        });

        // Dynamic Configuration Settings
        this.limits = {
            8000: 4, // Default Brain
            8001: 2, // Default Vectors
            8002: 4  // Default Mappers
        };
    }

    /**
     * Update port limits dynamically
     * @param {Object} newLimits - { port: max_slots }
     */
    setLimits(newLimits) {
        console.log('[AIFleetService] Updating limits:', newLimits);
        this.limits = { ...this.limits, ...newLimits };
        this.pollFleet(); // Immediate refresh with new limits
    }

    /**
     * Start the fleet monitoring loop
     */
    start() {
        if (this.intervalId) return;
        console.log(`[AIFleetService] Starting fleet monitor (Split Frequency: 200ms/500ms)...`);

        // Use a recursive timeout for better control over per-port frequencies
        this.isPolling = true;
        this.runMonitoringLoop();
    }

    async runMonitoringLoop() {
        if (!this.isPolling) return;

        const now = Date.now();
        const promises = this.ports.map(async port => {
            const lastPoll = this.lastPollTimes?.[port] || 0;
            const threshold = port === 8001 ? 200 : 500;

            if (now - lastPoll >= threshold) {
                if (!this.lastPollTimes) this.lastPollTimes = {};
                this.lastPollTimes[port] = now;
                return this.pollServer(port);
            }
            return null; // Skip this port for now
        });

        const results = await Promise.all(promises);

        let hasChanged = false;
        results.forEach((res, index) => {
            if (!res) return; // Port was skipped

            const port = this.ports[index];
            const oldState = this.fleetState[port];

            // STICKY PROCESSING: If a slot was processing recently, keep it for 3s to show in UI
            if (oldState && oldState.online && res.online) {
                res.slots.forEach((newSlot, i) => {
                    const oldSlot = oldState.slots[i];
                    if (oldSlot && oldSlot.state === 'processing' && newSlot.state === 'idle') {
                        const lastTime = oldSlot.lastProcessingTime || Date.now();
                        // Keep 'processing' for 3000ms (to catch fast embedding/mapper pings)
                        if (Date.now() - lastTime < 3000) {
                            newSlot.state = 'processing';
                            newSlot.lastProcessingTime = lastTime;
                        }
                    } else if (newSlot.state === 'processing') {
                        newSlot.lastProcessingTime = Date.now();
                    }
                });
            }

            if (this.didStateChange(oldState, res)) {
                this.fleetState[port] = res;
                hasChanged = true;
            }
        });

        if (hasChanged) {
            this.broadcastFleetState();
        }

        // Schedule next check in 100ms (min granularity)
        setTimeout(() => this.runMonitoringLoop(), 100);
    }

    /**
     * Stop the fleet monitoring loop
     */
    stop() {
        this.isPolling = false;
        console.log('[AIFleetService] Fleet monitor stopping.');
    }

    /**
     * Poll a single server for props and real slot activity
     * NO TRAMPA: We query the real /slots endpoint from llama.cpp
     */
    async pollServer(port) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600);

            // 1. Get Props
            const propsUrl = `http://127.0.0.1:${port}/props`;
            const propsRes = await fetch(propsUrl, { signal: controller.signal });
            if (!propsRes.ok) throw new Error(`Status ${propsRes.status}`);
            const propsData = await propsRes.json();
            clearTimeout(timeoutId);

            // 2. Get Real Slots (NO TRAMPA: Real activity from server)
            const slotsUrl = `http://127.0.0.1:${port}/slots`;
            const slotsRes = await fetch(slotsUrl).catch(() => null);
            let rawSlots = [];
            if (slotsRes && slotsRes.ok) {
                const slotsData = await slotsRes.json();
                rawSlots = Array.isArray(slotsData) ? slotsData : (slotsData.slots || []);
            }

            // Extract total slots
            let targetSlotCount = propsData.total_slots ||
                (propsData.default_generation_settings?.params?.n_parallel) ||
                (rawSlots.length > 0 ? rawSlots.length : (port === 8001 ? 2 : 4));

            if (this.limits[port]) {
                targetSlotCount = this.limits[port];
            }

            // Map slots based on ACTUAL server telemetry
            const mappedSlots = rawSlots.slice(0, targetSlotCount).map(s => {
                const isBusy = s.is_processing || s.state === 'processing' || (s.n_remain > 0);
                return {
                    id: s.id,
                    state: isBusy ? 'processing' : 'idle',
                    n_remain: s.n_remain || 0,
                    lastProcessingTime: isBusy ? Date.now() : 0
                };
            });

            // Fill missing slots if array is smaller
            while (mappedSlots.length < targetSlotCount) {
                mappedSlots.push({ id: mappedSlots.length, state: 'idle', lastProcessingTime: 0 });
            }

            return {
                online: true,
                total_slots: targetSlotCount,
                slots: mappedSlots
            };

        } catch (e) {
            return { online: false, total_slots: 0, slots: [], error: e.message };
        }
    }

    /**
     * Check if the new state differs significantly from the old one
     */
    didStateChange(oldState, newState) {
        if (oldState.online !== newState.online) return true;
        if (oldState.total_slots !== newState.total_slots) return true;
        if (oldState.slots.length !== newState.slots.length) return true;

        // Deep check for slot state changes
        for (let i = 0; i < newState.slots.length; i++) {
            if (oldState.slots[i]?.state !== newState.slots[i]?.state) return true;
            if (oldState.slots[i]?.n_remain !== newState.slots[i]?.n_remain) return true;
            if (oldState.slots[i]?.lastProcessingTime !== newState.slots[i]?.lastProcessingTime) return true;
        }

        return false;
    }

    /**
     * Send the current fleet state to all open windows
     */
    broadcastFleetState() {
        const windows = BrowserWindow.getAllWindows();
        windows.forEach(win => {
            if (!win.isDestroyed()) {
                win.webContents.send('fleet:status-update', this.fleetState);
            }
        });
    }

    /**
     * Proactive Health Check: Ping all slots and show 'testing' lights
     * @returns {Promise<Object>} Results per port
     */
    async verifyFleet() {
        console.log('[AIFleetService] Initiating Proactive Health Check...');

        // 1. Force 'testing' state for all currently known slots
        this.ports.forEach(port => {
            const state = this.fleetState[port];
            if (state && state.slots) {
                state.slots.forEach(slot => slot.state = 'testing');
            }
        });
        this.broadcastFleetState();

        // Small delay to let the user see the amber lights
        await new Promise(r => setTimeout(r, 800));

        // 2. Perform real poll for each port
        await Promise.all(this.ports.map(p => this.pollServer(p)));

        console.log('[AIFleetService] Fleet Verification Complete.');
        return this.fleetState;
    }

    /**
     * Get the current cached fleet state
     */
    getFleetState() {
        return this.fleetState;
    }
}

export const aiFleetService = new AIFleetService();
export default aiFleetService;
