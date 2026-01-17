import fs from 'fs';
import path from 'path';

const logPath = 'c:\\Users\\mauro\\OneDrive\\Escritorio\\Giteach\\logs\\sessions\\SESSION_2026-01-17T21-24-21-971Z\\workers\\worker_3.jsonl';
const ENDPOINT = 'http://localhost:8000/v1/chat/completions';

async function runBenchmark() {
    console.log("--- ISOLATED LATENCY BENCHMARK: ROADMAP_HOSPITAL.md ---");

    // 1. Load exact data from worker logs
    const rawContent = fs.readFileSync(logPath, 'utf8');
    const lines = rawContent.split('\n');
    let targetData = null;

    for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        if (data.input && data.input.path === 'ROADMAP_HOSPITAL.md') {
            targetData = data;
            break;
        }
    }

    if (!targetData) {
        console.error("Could not find ROADMAP_HOSPITAL.md in logs.");
        return;
    }

    const payload = {
        model: "lfm2.5",
        messages: [
            { role: "system", content: targetData.prompt },
            { role: "user", content: `Repository: HospitalComunicaccion\n<target_file PATH="ROADMAP_HOSPITAL.md">\n${targetData.input.content}\n</target_file>\nTell me what it demonstrates about the developer using the Evidence-First protocol:` }
        ],
        temperature: 0.2, // Match actual worker temp
        n_predict: 4096
    };

    console.log(`Payload size: ${JSON.stringify(payload).length} chars`);
    console.log("Sending request to AI server...");

    const start = Date.now();
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        const duration = Date.now() - start;

        console.log("\n✅ RESPONSE RECEIVED");
        console.log(`Duration: ${duration}ms`);

        fs.writeFileSync('benchmark_result.txt', `Duration: ${duration}ms\nOutput Length: ${result.choices[0].message.content.length}`);

        console.log(`Output Length: ${result.choices[0].message.content.length} chars`);
        console.log("\n--- Preview ---");
        console.log(result.choices[0].message.content.substring(0, 500));

    } catch (e) {
        console.error("❌ Benchmark failed:", e.message);
    }
}

runBenchmark();
