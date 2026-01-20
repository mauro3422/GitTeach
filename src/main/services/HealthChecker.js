/**
 * HealthChecker - Proactive verification logic (amber lights test).
 */
export class HealthChecker {
    constructor(slotManager, fleetBroadcaster) {
        this.slotManager = slotManager;
        this.fleetBroadcaster = fleetBroadcaster;
    }

    /**
     * Proactive Health Check: Ping all slots and show 'testing' lights
     * @returns {Promise<Object>} Results per port
     */
    async verifyFleet() {
        console.log('[HealthChecker] Initiating Proactive Health Check...');

        // 1. Force 'testing' state for all currently known slots
        this.slotManager.setTestingState();
        this.fleetBroadcaster.broadcastFleetState();

        // Small delay to let the user see the amber lights
        await new Promise(r => setTimeout(r, 800));

        // 2. Perform real poll for each port
        const ports = [8000, 8001, 8002];
        await Promise.all(ports.map(p => this.slotManager.pollServer(p)));

        console.log('[HealthChecker] Fleet Verification Complete.');
        return this.slotManager.getFleetState();
    }

    /**
     * Check if fleet is healthy (all servers online)
     */
    isFleetHealthy() {
        const fleetState = this.slotManager.getFleetState();
        const ports = [8000, 8001, 8002];

        return ports.every(port => {
            const state = fleetState[port];
            return state && state.online === true;
        });
    }

    /**
     * Get health summary for all ports
     */
    getHealthSummary() {
        const fleetState = this.slotManager.getFleetState();
        const ports = [8000, 8001, 8002];
        const summary = {};

        ports.forEach(port => {
            const state = fleetState[port];
            summary[port] = {
                online: state?.online || false,
                total_slots: state?.total_slots || 0,
                active_slots: state?.slots?.filter(s => s.state === 'processing').length || 0,
                idle_slots: state?.slots?.filter(s => s.state === 'idle').length || 0,
                error: state?.error || null
            };
        });

        return summary;
    }

    /**
     * Test individual port health
     */
    async testPortHealth(port) {
        try {
            const result = await this.slotManager.pollServer(port);
            return {
                port,
                online: result.online,
                response_time: result.online ? Date.now() : null,
                error: result.error || null
            };
        } catch (error) {
            return {
                port,
                online: false,
                response_time: null,
                error: error.message
            };
        }
    }
}
