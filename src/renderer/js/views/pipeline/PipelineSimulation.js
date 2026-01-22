/**
 * PipelineSimulation.js
 * Tools for simulating pipeline activity and debugging visual flow.
 * Lifecycle-managed class that extends BaseController for automatic cleanup.
 */

import { BaseController } from '../../core/BaseController.js';

export class PipelineSimulation extends BaseController {
    constructor() {
        super();
        this.activeSequences = new Set();
    }

    /**
     * Simulate a full task lifecycle in a specific worker slot
     */
    simulateTaskInSlot(slotNum, handleEvent) {
        if (!this.isMounted) return; // Guard

        const sequenceId = Symbol('seq');
        this.activeSequences.add(sequenceId);

        const slotId = `worker_${slotNum}`;
        const repo = 'simulation-repo';
        const file = 'refactor_solid.js';

        console.log(`[Simulation] Starting sequence for ${slotId}`);

        // 1. START: Processing
        if (!this.activeSequences.has(sequenceId)) return;
        handleEvent({
            type: slotId,
            payload: { status: 'start', repo, file }
        });

        // 2. DISPATCHING
        this.setTimeout(() => {
            if (!this.activeSequences.has(sequenceId)) return;
            handleEvent({
                type: slotId,
                payload: { status: 'dispatching', repo, file }
            });

            // 3. RECEIVING
            this.setTimeout(() => {
                if (!this.activeSequences.has(sequenceId)) return;
                handleEvent({
                    type: slotId,
                    payload: { status: 'receiving', repo, file }
                });

                // 4. END: Pending result
                this.setTimeout(() => {
                    if (!this.activeSequences.has(sequenceId)) return;
                    handleEvent({
                        type: slotId,
                        payload: { status: 'end', repo, file }
                    });

                    // 5. HANDOVER: Successor pick-up
                    this.setTimeout(() => {
                        if (!this.activeSequences.has(sequenceId)) return;
                        handleEvent({
                            type: 'streaming:batch',
                            payload: { status: 'start' }
                        });
                    }, 2000);
                }, 2000);
            }, 1500);
        }, 1000);
    }

    /**
     * Unmount logic - clear active sequences
     */
    unmount() {
        this.activeSequences.clear();
        super.unmount(); // This clears all this.timeouts automatically
    }
}

export default PipelineSimulation;
