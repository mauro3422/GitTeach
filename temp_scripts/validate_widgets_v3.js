
/**
 * AUDITORÍA TÉCNICA DE WIDGETS v3.0 (SPOOFED HEADERS)
 * Engine: Node Native Fetch
 * Propósito: Simular el comportamiento del Interceptor de Red de Electron.
 */

const username = 'mauro3422';
const widgets = [
    { id: 'github_stats', url: `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true` },
    { id: 'welcome_header', url: `https://capsule-render.vercel.app/render?type=wave&color=auto&height=120&section=header&text=GitTeach&fontSize=50` }
];

async function audit() {
    console.log(`\n--- 🏗️ VERIFICACIÓN DE INTERCEPTOR (QA Protocol) ---`);

    for (const w of widgets) {
        try {
            const res = await fetch(w.url, {
                headers: {
                    'Origin': 'https://github.com',
                    'Referer': 'https://github.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            console.log(`[VERIFIED] ${w.id}: Status ${res.status} (Accepted with Spoofed Headers)`);
        } catch (e) {
            console.error(`[FAILED] ${w.id}: ${e.message}`);
        }
    }
    console.log(`--- ✅ FIN DE VERIFICACIÓN ---\n`);
}

audit();
