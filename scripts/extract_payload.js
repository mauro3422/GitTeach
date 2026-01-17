import fs from 'fs';
import path from 'path';

const logPath = 'c:\\Users\\mauro\\OneDrive\\Escritorio\\Giteach\\logs\\sessions\\SESSION_2026-01-17T21-24-21-971Z\\workers\\worker_3.jsonl';

function extract() {
    const rawContent = fs.readFileSync(logPath, 'utf8');
    const lines = rawContent.split('\n');
    console.log(`Log File: ${logPath}`);
    console.log(`Total lines read: ${lines.length}`);

    let targetItem = null;
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.input && data.input.path === 'ROADMAP_HOSPITAL.md') {
                targetItem = data;
                break;
            }
        } catch (e) {
            console.error(`Error parsing line: ${line.substring(0, 50)}...`, e.message);
        }
    }

    if (!targetItem) {
        console.error("ROADMAP_HOSPITAL.md entry not found in logs!");
        return;
    }

    const payload = {
        systemPrompt: targetItem.prompt,
        userMessage: targetItem.input.content
    };

    fs.writeFileSync('scripts/roadmap_test_payload.json', JSON.stringify(payload, null, 2));
    console.log("SUCCESS: Extracted payload to scripts/roadmap_test_payload.json");
    console.log("Content Length:", payload.userMessage.length);
    console.log("System Prompt Length:", payload.systemPrompt.length);
}

extract();
