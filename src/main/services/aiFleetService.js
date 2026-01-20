// src/main/services/AIFleetService.js
import { FleetMonitor } from './FleetMonitor.js';
import { SlotManager } from './SlotManager.js';
import { HealthChecker } from './HealthChecker.js';
import { FleetBroadcaster } from './FleetBroadcaster.js';

/**
 * AIFleetService - Thin facade managing initialization and delegating to specialized managers.
 */
class AIFleetService {
    constructor() {
        // Initialize specialized managers
        this.slotManager = new SlotManager();
        this.fleetBroadcaster = new FleetBroadcaster(this.slotManager);
        this.fleetMonitor = new FleetMonitor(this.slotManager, this.fleetBroadcaster);
        this.healthChecker = new HealthChecker(this.slotManager, this.fleetBroadcaster);
    }

    /**
     * Update port limits dynamically
     * @param {Object} newLimits - { port: max_slots }
     */
    setLimits(newLimits) {
        this.slotManager.setLimits(newLimits);
    }

    /**
     * Start the fleet monitoring loop
     */
    start() {
        this.fleetMonitor.start();
    }

    /**
     * Stop the fleet monitoring loop
     */
    stop() {
        this.fleetMonitor.stop();
    }

    /**
     * Poll a single server for props and real slot activity
     */
    async pollServer(port) {
        return this.slotManager.pollServer(port);
    }

    /**
     * Send the current fleet state to all open windows
     */
    broadcastFleetState() {
        this.fleetBroadcaster.broadcastFleetState();
    }

    /**
     * Proactive Health Check: Ping all slots and show 'testing' lights
     * @returns {Promise<Object>} Results per port
     */
    async verifyFleet() {
        return this.healthChecker.verifyFleet();
    }

    /**
     * Handle pipeline activity events for real-time slot updates
     */
    onPipelineActivity(event) {
        const stateChanged = this.slotManager.onPipelineActivity(event);
        if (stateChanged) {
            this.fleetBroadcaster.broadcastFleetState();
        }
    }

    /**
     * Get the current cached fleet state
     */
    getFleetState() {
        return this.slotManager.getFleetState();
    }

    /**
     * Get fleet health summary
     */
    getHealthSummary() {
        return this.healthChecker.getHealthSummary();
    }

    /**
     * Check if fleet is healthy
     */
    isFleetHealthy() {
        return this.healthChecker.isFleetHealthy();
    }
}

export const aiFleetService = new AIFleetService();
export default aiFleetService;
