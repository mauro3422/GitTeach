/**
 * AISlotManager - Centralized concurrency controller for AI calls
 * 
 * Features:
 * - Priority queue (URGENT > NORMAL > BACKGROUND)
 * - Reserved slot for URGENT calls (Chat/Intent never waits for Workers)
 * - Soft preemption: URGENT calls get next available slot
 */
import { AISlotPriorities } from './AISlotPriorities.js';
import { logManager } from '../../utils/logManager.js';
export { AISlotPriorities };

export class AISlotManager {
    constructor(maxSlots = 5, reservedForUrgent = 1) {
        this.maxSlots = maxSlots;
        this.reservedForUrgent = reservedForUrgent; // Slots reserved for URGENT priority
        this.activeCalls = 0;
        this.activeUrgent = 0; // Track urgent calls separately
        this.queue = [];
        this.logger = logManager.child({ component: 'SlotManager' });
    }

    /**
     * Acquire a slot for an AI call
     * @param {number} priority - From AISlotPriorities
     * @returns {Promise<void>}
     * 
     * Slot allocation strategy:
     * - URGENT: Can use ANY slot (including reserved)
     * - NORMAL/BACKGROUND: Can only use (maxSlots - reservedForUrgent) slots
     * 
     * This ensures Chat/Intent always has a slot available.
     */
    async acquire(priority = AISlotPriorities.NORMAL) {
        const isUrgent = priority === AISlotPriorities.URGENT;

        // Calculate available slots for this priority level
        const effectiveMax = isUrgent
            ? this.maxSlots  // Urgent can use all slots
            : this.maxSlots - this.reservedForUrgent; // Others leave room for urgent

        // Check if we can acquire immediately
        const nonUrgentActive = this.activeCalls - this.activeUrgent;
        const canAcquire = isUrgent
            ? this.activeCalls < this.maxSlots
            : nonUrgentActive < effectiveMax;

        if (canAcquire) {
            this.activeCalls++;
            if (isUrgent) this.activeUrgent++;
            this.logger.debug(`Slot acquired [${this._priorityName(priority)}]: ${this.activeCalls}/${this.maxSlots} (urgent: ${this.activeUrgent})`);
            return;
        }

        // Queue the request with priority
        return new Promise((resolve) => {
            this.queue.push({ priority, resolve, isUrgent });
            // Sort queue by priority (lower number = higher priority)
            this.queue.sort((a, b) => a.priority - b.priority);
            this.logger.debug(`Queued [${this._priorityName(priority)}]: ${this.queue.length} waiting`);
        });
    }

    /**
     * Release an acquired slot
     * @param {boolean} wasUrgent - Whether this was an urgent call
     */
    release(wasUrgent = false) {
        this.activeCalls--;
        if (wasUrgent) this.activeUrgent--;
        this._dispatchNext();
    }

    _dispatchNext() {
        if (this.queue.length === 0) return;

        // Try to dispatch the highest priority item that can fit
        for (let i = 0; i < this.queue.length; i++) {
            const item = this.queue[i];
            const isUrgent = item.priority === AISlotPriorities.URGENT;

            const effectiveMax = isUrgent
                ? this.maxSlots
                : this.maxSlots - this.reservedForUrgent;

            const nonUrgentActive = this.activeCalls - this.activeUrgent;
            const canDispatch = isUrgent
                ? this.activeCalls < this.maxSlots
                : nonUrgentActive < effectiveMax;

            if (canDispatch) {
                this.queue.splice(i, 1); // Remove from queue
                this.activeCalls++;
                if (isUrgent) this.activeUrgent++;
                this.logger.debug(`Dispatched [${this._priorityName(item.priority)}]: ${this.activeCalls}/${this.maxSlots}`);
                item.resolve();
                return;
            }
        }
    }

    _priorityName(priority) {
        switch (priority) {
            case AISlotPriorities.URGENT: return 'URGENT';
            case AISlotPriorities.NORMAL: return 'NORMAL';
            case AISlotPriorities.BACKGROUND: return 'BACKGROUND';
            default: return 'UNKNOWN';
        }
    }

    get activeCount() {
        return this.activeCalls;
    }

    get waitingCount() {
        return this.queue.length;
    }

    get urgentCount() {
        return this.activeUrgent;
    }

    getStats() {
        return {
            active: this.activeCalls,
            activeUrgent: this.activeUrgent,
            waiting: this.queue.length,
            maxSlots: this.maxSlots,
            reservedForUrgent: this.reservedForUrgent
        };
    }
}

// GPU Slot Manager: 4 total, 1 reserved for Chat/Intent
export const aiSlotManager = new AISlotManager(4, 1);