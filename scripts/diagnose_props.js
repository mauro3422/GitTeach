// scripts/diagnose_props.js
const ports = [8000, 8001, 8002];

async function diagnose() {
    console.log("--- AI SERVER PROPS DIAGNOSTIC ---");
    for (const port of ports) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/props`);
            const data = await res.json();
            console.log(`Port ${port}: total_slots=${data.total_slots}, n_parallel=${data.default_generation_settings?.params?.n_parallel}`);
        } catch (e) {
            console.log(`Port ${port}: Error (${e.message})`);
        }
    }
}
diagnose();
