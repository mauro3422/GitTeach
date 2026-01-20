/**
 * TracerStateManager.js
 * Responsabilidad única: Gestionar transiciones de estado
 */

export const TracerStateManager = {
    state: 'IDLE',

    // Estados válidos: IDLE → VERIFYING → READY → RUNNING → STOPPING → IDLE
    transitions: {
        'IDLE': ['VERIFYING'],
        'VERIFYING': ['READY', 'IDLE'],
        'READY': ['RUNNING', 'IDLE'],
        'RUNNING': ['STOPPING'],
        'STOPPING': ['IDLE']
    },

    /**
     * Get current state
     */
    getState() {
        return this.state;
    },

    /**
     * Check if can transition to new state
     */
    canTransitionTo(newState) {
        return this.transitions[this.state]?.includes(newState) || false;
    },

    /**
     * Transition to new state if valid
     */
    transitionTo(newState) {
        if (this.canTransitionTo(newState)) {
            this.state = newState;
            return true;
        }
        return false;
    },

    /**
     * Check if ready for analysis
     */
    isReadyForAnalysis() {
        return this.state === 'READY';
    },

    /**
     * Check if currently running
     */
    isRunning() {
        return this.state === 'RUNNING';
    },

    /**
     * Check if idle
     */
    isIdle() {
        return this.state === 'IDLE';
    },

    /**
     * Reset to idle state
     */
    reset() {
        this.state = 'IDLE';
    }
};
