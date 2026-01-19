// scripts/diagnose_slots.js
const ports = [8000, 8001, 8002];

async function callAI(port) {
    console.log(`[${port}] Triggering AI call...`);
    try {
        const res = await fetch(`http://127.0.0.1:${port}/completion`, {
            method: 'POST',
            body: JSON.stringify({
                prompt: "Say 'TEST SUCCESSFUL' in exactly 3 words.",
                n_predict: 5
            })
        });
        const data = await res.json();
        console.log(`[${port}] AI Response: ${data.content}`);
    } catch (e) {
        console.log(`[${port}] AI Call failed: ${e.message}`);
    }
}

async function diagnose() {
    console.log("--- AI SLOT LIVE TEST ---");

    // 1. Kick off an AI call on Port 8000 in background
    const aiCall = callAI(8000);

    // 2. Poll immediately multiple times to catch it "busy"
    for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 200));
        try {
            const slotsUrl = `http://127.0.0.1:8000/slots`;
            const slotsRes = await fetch(slotsUrl);
            const slotsData = await slotsRes.json();
            const rawSlots = Array.isArray(slotsData) ? slotsData : (slotsData.slots || []);

            const active = rawSlots.filter(s => s.is_processing === true || (s.id_task > -1));
            console.log(`[T+${i * 200}ms] Active Slots: ${active.length} / ${rawSlots.length}`);
            if (active.length > 0) {
                console.log(`  -> Slot 0: is_processing=${active[0].is_processing}, id_task=${active[0].id_task}, state=${active[0].state}`);
            }
        } catch (e) {
            console.log(`[T+${i * 200}ms] Poll Error: ${e.message}`);
        }
    }

    await aiCall;
}

diagnose();
