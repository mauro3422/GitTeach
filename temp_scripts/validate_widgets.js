
const axios = require('axios');

const username = 'mauro3422';
const widgets = [
    { id: 'github_stats', url: `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true` },
    { id: 'top_langs', url: `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_title=true` },
    { id: 'github_trophies', url: `https://github-profile-trophy.vercel.app/?username=${username}&theme=tokyonight&margin-w=5` },
    { id: 'streak_stats', url: `https://github-readme-streak-stats.herokuapp.com/?user=${username}&theme=tokyonight&hide_border=true` },
    { id: 'activity_graph', url: `https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=tokyonight&hide_border=true&area=true` },
    { id: 'welcome_header', url: `https://capsule-render.vercel.app/render?type=wave&color=auto&height=100&section=header&text=${username}&fontSize=50` }
];

async function validateWidgets() {
    console.log(`--- Iniciando Auditoría Técnica de Widgets para: ${username} ---`);
    for (const widget of widgets) {
        try {
            const response = await axios.get(widget.url, { timeout: 5000 });
            console.log(`[PASS] ${widget.id}: Status ${response.status} - Content-Type: ${response.headers['content-type']}`);
            if (response.data.includes('404') || response.data.includes('not found')) {
                console.warn(` [WAIT] ${widget.id} devolvió 200 pero el contenido sugiere error.`);
            }
        } catch (error) {
            console.error(`[FAIL] ${widget.id}: ${error.message} - URL: ${widget.url}`);
        }
    }
    console.log('--- Fin de la Auditoría ---');
}

validateWidgets();
