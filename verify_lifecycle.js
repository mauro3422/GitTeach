
import { PipelineSimulation } from './src/renderer/js/views/pipeline/PipelineSimulation.js';

const sim = new PipelineSimulation();
sim.init();

console.log('--- Testing without mount ---');
let eventCalled = false;
sim.simulateTaskInSlot(1, () => { eventCalled = true; });

// Wait a bit to see if setTimeout fires (it shouldn't because of the mount guard)
setTimeout(() => {
    console.log('Event called without mount:', eventCalled);

    console.log('--- Testing with mount ---');
    sim.mount();
    sim.simulateTaskInSlot(1, (e) => {
        console.log('Event received after mount:', e.type, e.payload.status);
    });

    setTimeout(() => {
        console.log('--- Testing after unmount ---');
        sim.unmount();
        let eventCalledAfter = false;
        sim.simulateTaskInSlot(1, () => { eventCalledAfter = true; });

        setTimeout(() => {
            console.log('Event called after unmount:', eventCalledAfter);
            process.exit(0);
        }, 2000);
    }, 5000);
}, 2000);
