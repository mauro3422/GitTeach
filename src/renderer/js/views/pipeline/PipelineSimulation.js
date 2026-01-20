/**
 * PipelineSimulation.js
 * Tools for simulating pipeline activity and debugging visual flow.
 */

export const PipelineSimulation = {
    /**
     * Simulate a full task lifecycle in a specific worker slot
     */
    simulateTaskInSlot(slotNum, handleEvent) {
        const slotId = `worker_${slotNum}`;
        const repo = 'simulation-repo';
        const file = 'refactor_solid.js';

        console.log(`[Simulation] Starting sequence for ${slotId}`);

        // 1. START: Processing
        handleEvent({
            type: slotId,
            payload: { status: 'start', repo, file }
        });

        // 2. DISPATCHING
        setTimeout(() => {
            handleEvent({
                type: slotId,
                payload: { status: 'dispatching', repo, file }
            });

            // 3. RECEIVING
            setTimeout(() => {
                handleEvent({
                    type: slotId,
                    payload: { status: 'receiving', repo, file }
                });

                // 4. END: Pending result
                setTimeout(() => {
                    handleEvent({
                        type: slotId,
                        payload: { status: 'end', repo, file }
                    });

                    // 5. HANDOVER: Successor pick-up
                    setTimeout(() => {
                        handleEvent({
                            type: 'streaming:batch',
                            payload: { status: 'start' }
                        });
                    }, 2000);
                }, 2000);
            }, 1500);
        }, 1000);
    }
};

export default PipelineSimulation;
