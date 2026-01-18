/**
 * EvolutionState - Manages evolution ticks and status tracking
 * Extracted from StreamingHandler to comply with SRP
 *
 * SOLID Principles:
 * - S: Only manages evolution state and status
 * - O: Extensible to new evolution metrics
 * - L: N/A
 * - I: Clean interface for evolution tracking
 * - D: No external dependencies
 */

export class EvolutionState {
    constructor() {
        this.evolutionTicks = 0;
        this.lastEvolutionStatus = 'idle';
        this.evolutionMetrics = {
            totalFindings: 0,
            processedBatches: 0,
            streamingUpdates: 0
        };
    }

    /**
     * Increment evolution tick
     */
    tick() {
        this.evolutionTicks++;
        this.lastEvolutionStatus = 'active';
        return this.evolutionTicks;
    }

    /**
     * Reset evolution state
     */
    reset() {
        this.evolutionTicks = 0;
        this.lastEvolutionStatus = 'idle';
        this.evolutionMetrics = {
            totalFindings: 0,
            processedBatches: 0,
            streamingUpdates: 0
        };
    }

    /**
     * Update evolution metrics
     */
    updateMetrics(metrics) {
        this.evolutionMetrics = { ...this.evolutionMetrics, ...metrics };
    }

    /**
     * Get current evolution status
     */
    getStatus() {
        return {
            ticks: this.evolutionTicks,
            status: this.lastEvolutionStatus,
            metrics: this.evolutionMetrics
        };
    }

    /**
     * Check if evolution is active
     */
    isActive() {
        return this.lastEvolutionStatus === 'active';
    }

    /**
     * Mark evolution as complete
     */
    markComplete() {
        this.lastEvolutionStatus = 'complete';
    }

    /**
     * Mark evolution as idle
     */
    markIdle() {
        this.lastEvolutionStatus = 'idle';
    }
}
