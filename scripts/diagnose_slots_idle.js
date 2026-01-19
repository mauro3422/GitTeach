// scripts/diagnose_slots_idle.js
async function diagnose() {
    console.log("--- AI SLOT IDLE BASELINE ---");
    try {
        const slotsRes = await fetch(`http://127.0.0.1:8000/slots`);
        const rawSlots = await slotsRes.json();
        console.log(`Slots Data (Raw):`, JSON.stringify(rawSlots, null, 2));
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}
diagnose();
