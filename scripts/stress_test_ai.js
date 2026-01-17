// Native fetch used in modern Node

const ENDPOINT = 'http://localhost:8000/v1/chat/completions';

const samplePayload = {
    model: "lfm2.5",
    messages: [
        { role: "system", content: "Respond short." },
        { role: "user", content: "Tell me a joke about coding." }
    ],
    temperature: 0.7,
    n_predict: 100
};

async function testLatency(id) {
    const start = Date.now();
    try {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(samplePayload)
        });
        const data = await res.json();
        const duration = Date.now() - start;
        console.log(`[Test ${id}] Response: ${data.choices[0].message.content.substring(0, 30)}... | Duration: ${duration}ms`);
        return duration;
    } catch (e) {
        console.error(`[Test ${id}] Error:`, e.message);
        return -1;
    }
}

async function run() {
    console.log("--- AI STRESS TEST START ---");

    console.log("\n1. Sequential Latency (3 tests):");
    for (let i = 1; i <= 3; i++) {
        await testLatency(i);
    }

    console.log("\n2. Parallel Latency (4 concurrent tests):");
    const parallelTests = [4, 5, 6, 7].map(id => testLatency(id));
    await Promise.all(parallelTests);

    console.log("\n--- TEST COMPLETE ---");
}

run();
