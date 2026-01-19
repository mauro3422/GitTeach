import fetch from 'node-fetch';

async function checkSlots(port) {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/slots`);
        const data = await res.json();
        const slots = data.slots || data;

        console.log(`\n[TELEMETRY] Port ${port} Data:`);
        if (Array.isArray(slots)) {
            slots.forEach(s => {
                const isBusy = s.is_processing || s.state === 'processing' || s.n_remain > 0;
                console.log(` - Slot ${s.id}: ${isBusy ? '🔥 BUSY' : '😴 IDLE'} (is_processing=${s.is_processing}, n_remain=${s.n_remain})`);
            });
        } else {
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log(`[TELEMETRY] Port ${port} unreachable or error: ${e.message}`);
    }
}

async function testFleet() {
    console.log('🚀 Starting Fleet Deep Telemetry Audit (Aggressive Polling)...');

    // 1. Test Vectors (Port 8001) - Send Batch to keep it busy longer
    console.log('\n[TEST 1] Sending BATCH Embedding request to Port 8001...');
    const texts = new Array(20).fill('This is a test sentence to keep the embedding server busy for telemetry audit.');
    const embPromise = fetch('http://127.0.0.1:8001/v1/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'nomic-embed-text-v1.5',
            input: texts
        })
    });

    // Aggressive Polling for 500ms
    for (let i = 0; i < 10; i++) {
        await checkSlots(8001);
        await new Promise(r => setTimeout(r, 50));
    }

    await embPromise;
    console.log('✅ Port 8001: Success.');

    // 2. Test Mappers (Port 8002)
    console.log('\n[TEST 2] Sending Chat request to Port 8002...');
    const chatPromise = fetch('http://127.0.0.1:8002/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'lfm2.5',
            messages: [{ role: 'user', content: 'Explain technical debt in 3 paragraphs.' }],
            temperature: 0.1,
            n_predict: 300
        })
    });

    // Capture telemetry WHILE processing
    for (let i = 0; i < 5; i++) {
        await checkSlots(8002);
        await new Promise(r => setTimeout(r, 500));
    }

    await chatPromise;
    console.log('✅ Port 8002: Success.');

    console.log('\n🏁 Audit complete.');
}

testFleet().catch(err => console.error('FATAL:', err));
