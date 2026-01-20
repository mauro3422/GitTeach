import AppLogger from './system/AppLogger.js';

/**
 * SlotManager - Logic for mapping server telemetry to unified slot states (idle, processing, testing).
 */
export class SlotManager {
    constructor() {
        this.context = 'SlotManager';
        this.fleetState = {};
        this.limits = {
            8000: 4, // Default Brain
            8001: 2, // Default Vectors
            8002: 4  // Default Mappers
        };

        // Initialize state for all ports
        this.ports = [8000, 8001, 8002];
        this.ports.forEach(port => {
            this.fleetState[port] = { online: false, slots: [], total_slots: 0 };
        });
    }

    /**
     * Update port limits dynamically
     * @param {Object} newLimits - { port: max_slots }
     */
    setLimits(newLimits) {
        AppLogger.info(this.context, 'Updating limits:', newLimits);
        this.limits = { ...this.limits, ...newLimits };
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
     * Update slot state for a port and return if state changed
     */
    updateSlotState(port, newState) {
        const oldState = this.fleetState[port];

        // REAL-TIME: No sticky delay - slots reflect actual server state
        if (oldState && oldState.online && newState.online) {
            newState.slots.forEach((newSlot, i) => {
                // Just track processing time for metrics, no artificial extension
                if (newSlot.state === 'processing') {
                    newSlot.lastProcessingTime = Date.now();
                }
            });
        }

        if (this.didStateChange(oldState, newState)) {
            this.fleetState[port] = newState;
            return true;
        }

        return false;
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
     * Handle pipeline activity events for real-time slot updates
     */
    onPipelineActivity(event) {
        const { port, type } = event.payload || {};
        if (!port) return;

        const state = this.fleetState[port];
        if (!state) return;

        // Determinar si es inicio o fin
        const isStart = event.event.endsWith(':start');
        const isEnd = event.event.endsWith(':end');

        if (isStart) {
            // Marcar un slot como processing
            const idleSlot = state.slots.find(s => s.state === 'idle');
            if (idleSlot) {
                idleSlot.state = 'processing';
                idleSlot.lastProcessingTime = Date.now();
                idleSlot.eventSource = event.event;
            }
        } else if (isEnd) {
            // REAL-TIME: Immediately mark slot as idle when operation ends
            const busySlot = state.slots.find(s =>
                s.state === 'processing' && s.eventSource === event.event.replace(':end', ':start')
            );
            if (busySlot) {
                busySlot.state = 'idle';
                busySlot.eventSource = null;
                busySlot.lastProcessingTime = 0;
            }
        }

        return true; // State changed
    }

    /**
     * Clean stale event tracking (orphaned eventSource without matching end)
     * This handles edge cases where an :end event was missed
     */
    cleanStaleEventTracking() {
        const now = Date.now();
        const STALE_THRESHOLD = 30000; // 30 seconds max for any operation

        this.ports.forEach(port => {
            const state = this.fleetState[port];
            if (!state || !state.slots) return;

            state.slots.forEach(slot => {
                // If a slot has been "processing" for too long without an end event, reset it
                if (slot.state === 'processing' && slot.lastProcessingTime) {
                    if (now - slot.lastProcessingTime > STALE_THRESHOLD) {
                        AppLogger.warn(this.context, `Stale slot detected on port ${port}, resetting.`);
                        slot.state = 'idle';
                        slot.eventSource = null;
                        slot.lastProcessingTime = 0;
                    }
                }
            });
        });
    }

    /**
     * Force 'testing' state for all currently known slots (for health checks)
     */
    setTestingState() {
        this.ports.forEach(port => {
            const state = this.fleetState[port];
            if (state && state.slots) {
                state.slots.forEach(slot => slot.state = 'testing');
            }
        });
    }

    /**
     * Get the current cached fleet state
     */
    getFleetState() {
        return this.fleetState;
    }

    getLimits() {
        return { ...this.limits };
    }
}
