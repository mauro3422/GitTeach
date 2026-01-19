/**
 * PipelineController.js
 * Controls pipeline execution flow with Play/Pause/Step functionality.
 * SOLID: Single Responsibility - only manages execution state.
 */

class PipelineController {
    constructor() {
        // Execution state
        this.state = 'IDLE'; // IDLE, RUNNING, PAUSED, STEPPING

        // Step mode: only process one item then pause
        this.stepPending = false;

        // Subscribers for state changes
        this.listeners = new Set();

        // Reference to resolve when stepping completes
        this.stepResolver = null;

        console.log('[PipelineController] Initialized in IDLE state');
    }

    /**
     * Get current state
     */
    getState() {
        return this.state;
    }

    /**
     * Check if processing should proceed
     * @returns {boolean} true if can dispatch next item
     */
    canProceed() {
        if (this.state === 'RUNNING') return true;
        if (this.state === 'STEPPING' && this.stepPending) {
            this.stepPending = false;
            return true;
        }
        return false;
    }

    /**
     * Start or resume pipeline execution
     */
    play() {
        if (this.state === 'IDLE' || this.state === 'PAUSED') {
            this.state = 'RUNNING';
            this._notifyListeners();
            console.log('[PipelineController] ▶ RUNNING');
        }
    }

    /**
     * Pause pipeline execution
     * Current operations finish, but no new items dispatched
     */
    pause() {
        if (this.state === 'RUNNING' || this.state === 'STEPPING') {
            this.state = 'PAUSED';
            this.stepPending = false;
            this._notifyListeners();
            console.log('[PipelineController] ⏸ PAUSED');
        }
    }

    /**
     * Execute exactly one step then pause
     * @returns {Promise} resolves when step completes
     */
    step() {
        return new Promise((resolve) => {
            if (this.state !== 'PAUSED' && this.state !== 'IDLE') {
                resolve(false);
                return;
            }

            this.state = 'STEPPING';
            this.stepPending = true;
            this.stepResolver = resolve;
            this._notifyListeners();
            console.log('[PipelineController] ⏭ STEP (waiting for dispatch)');
        });
    }

    /**
     * Called when a step operation completes
     */
    stepComplete() {
        if (this.state === 'STEPPING') {
            this.state = 'PAUSED';
            this._notifyListeners();
            if (this.stepResolver) {
                this.stepResolver(true);
                this.stepResolver = null;
            }
            console.log('[PipelineController] ⏸ Step complete, PAUSED');
        }
    }

    /**
     * Stop pipeline completely
     */
    stop() {
        this.state = 'IDLE';
        this.stepPending = false;
        this._notifyListeners();
        console.log('[PipelineController] ⏹ STOPPED');
    }

    /**
     * Check if paused (for UI)
     */
    isPaused() {
        return this.state === 'PAUSED';
    }

    /**
     * Check if running (for UI)
     */
    isRunning() {
        return this.state === 'RUNNING';
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - (state) => void
     * @returns {Function} unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all subscribers of state change
     * @private
     */
    _notifyListeners() {
        const state = this.state;
        this.listeners.forEach(cb => {
            try {
                cb(state);
            } catch (e) {
                console.error('[PipelineController] Listener error:', e);
            }
        });
    }
}

// Singleton instance
export const pipelineController = new PipelineController();
export default pipelineController;
