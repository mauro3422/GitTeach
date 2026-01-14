
/**
 * AUDITORÍA TÉCNICA DE WIDGETS v2.0
 * Engine: Node Native Fetch
 * Propósito: Verificar conectividad y compatibilidad de dominios externos.
 */

const username = 'mauro3422';
const widgets = [
    { id: 'github_stats', url: `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true` },
    { id: 'top_langs', url: `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_title=true` },
    { id: 'github_trophies', url: `https://github-profile-trophy.vercel.app/?username=${username}&theme=tokyonight&margin-w=5` },
    { id: 'streak_stats', url: `https://github-readme-streak-stats.herokuapp.com/?user=${username}&theme=tokyonight&hide_border=true` },
    { id: 'activity_graph', url: `https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=tokyonight&hide_border=true&area=true` },
    { id: 'welcome_header', url: `https://capsule-render.vercel.app/render?type=wave&color=auto&height=120&section=header&text=GitTeach&fontSize=50` }
];

async function audit() {
    console.log(`\n--- 🕵️‍♂️ INICIANDO AUDITORÍA TÉCNICA (Giteach QA) ---`);
    console.log(`Usuario: ${username}\n`);

    for (const w of widgets) {
        console.log(`[Testing] ${w.id}...`);

        // 1. Direct Test
        try {
            const res = await fetch(w.url);
            const status = res.status;
            const type = res.headers.get('content-type');
            console.log(`   🔸 Direct: Status ${status} | Type: ${type}`);
        } catch (e) {
            console.log(`   ❌ Direct: ${e.message}`);
        }

        // 2. Proxy Test (Weserv)
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(w.url)}&nps=1`;
        try {
            const res = await fetch(proxyUrl);
            const status = res.status;
            const type = res.headers.get('content-type');
            console.log(`   🔹 Proxy:  Status ${status} | Type: ${type}`);
        } catch (e) {
            console.log(`   ❌ Proxy:  ${e.message}`);
        }
        console.log('--------------------------------------------------');
    }
    console.log(`\n--- ✅ AUDITORÍA FINALIZADA ---`);
}

audit();
