import fs from 'fs';

const LOG_PATH = 'c:\\Users\\mauro\\OneDrive\\Escritorio\\Giteach\\logs\\sessions\\SESSION_2026-01-17T21-24-21-971Z\\workers\\worker_3.jsonl';
const ENDPOINT = 'http://localhost:8000/v1/chat/completions';
const CONCURRENCY = 4;

async function runParallelTest() {
    console.log(`🔥 Starting Parallel Stress Test (Concurrency: ${CONCURRENCY})`);

    // 1. Load payload from logs (proven method)
    const rawContent = fs.readFileSync(LOG_PATH, 'utf8');
    let targetData = null;
    for (const line of rawContent.split('\n')) {
        if (!line.trim()) continue;
        const d = JSON.parse(line);
        if (d.input && d.input.path === 'ROADMAP_HOSPITAL.md') {
            targetData = d;
            break;
        }
    }

    if (!targetData) {
        console.error("❌ Could not find content in logs");
        return;
    }

    const requestBody = {
        model: "lfm2.5",
        messages: [
            { role: "system", content: targetData.prompt },
            { role: "user", content: `Repository: HospitalComunicaccion\n<target_file PATH="ROADMAP_HOSPITAL.md">\n${targetData.input.content}\n</target_file>\nTell me what it demonstrates about the developer using the Evidence-First protocol:` }
        ],
        temperature: 0.2,
        n_predict: 4096
    };

    const requests = [];
    const startTime = Date.now();

    for (let i = 0; i < CONCURRENCY; i++) {
        // Stagger requests slightly to avoid 'thundering herd' on API parser
        await new Promise(r => setTimeout(r, 250));
        requests.push(makeRequest(i + 1, requestBody));
    }

    await Promise.all(requests);
    const totalDuration = Date.now() - startTime;

    console.log("\n==================================");
    console.log(`✅ TEST COMPLETE`);
    console.log(`Total Wall Time: ${totalDuration}ms`);

    fs.writeFileSync('parallel_test_result.txt', `Total Wall Time: ${totalDuration}ms\nConcurrency: ${CONCURRENCY}\nTheoretical Serialized: ${theoreticalSerialized}ms`);

    console.log("==================================");

    // Simple analysis
    const theoreticalSerialized = 16000 * CONCURRENCY; // ~16s per req
    if (totalDuration < theoreticalSerialized * 0.7) {
        console.log("🚀 PARALLELISM CONFIRMED: Time is significantly less than serialized sum.");
    } else {
        console.log("⚠️ SERIALIZATION DETECTED: Time is close to serialized sum.");
    }
}

async function makeRequest(id, body) {
    const start = Date.now();
    console.log(`[Req ${id}] 🚀 Sending...`);

    try {
        if (id === 1) fs.writeFileSync('debug_payload.json', JSON.stringify(body, null, 2));

        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000) // 2m timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const duration = Date.now() - start;
        const len = data.choices?.[0]?.message?.content?.length || 0;

        console.log(`[Req ${id}] ✅ Finished in ${duration}ms (Chars: ${len})`);
        return { id, duration };
    } catch (e) {
        console.error(`[Req ${id}] ❌ Failed:`, e.message);
        fs.appendFileSync('parallel_errors.log', `[Req ${id}] ${e.message}\n`);
        return { id, duration: 0 };
    }
}

runParallelTest();
