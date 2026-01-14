
const fs = require('fs');

const urls = {
    'github_stats': 'https://github-readme-stats.vercel.app/api?username=mauro3422&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true',
    'top_langs': 'https://github-readme-stats.vercel.app/api/top-langs/?username=mauro3422&layout=compact&theme=tokyonight&hide_title=true',
    'github_trophies': 'https://github-profile-trophy.vercel.app/?username=mauro3422&theme=tokyonight&margin-w=5',
    'streak_stats': 'https://github-readme-streak-stats.herokuapp.com/?user=mauro3422&theme=tokyonight&hide_border=true',
    'welcome_header': 'https://capsule-render.vercel.app/render?type=wave&color=auto&height=120&text=GitTeach&fontSize=50',
    'project_showcase': 'https://github-readme-stats.vercel.app/api/pin/?username=mauro3422&repo=mauro3422&theme=tokyonight'
};

const fetchWithHeaders = async (name, url, mode = 'github') => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
    };

    if (mode === 'github') {
        headers['Referer'] = 'https://github.com/';
        headers['Origin'] = 'https://github.com';
    }

    try {
        const res = await fetch(url, { headers, redirect: 'follow' });
        return { ok: res.ok, status: res.status };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

const runDiagnostic = async () => {
    console.log("=== 🔍 DIAGNÓSTICO DE WIDGETS ===\n");
    const resultsReport = [];

    for (const [name, url] of Object.entries(urls)) {
        process.stdout.write(`Testing ${name}... `);
        const itemReport = { name, url, stages: [] };

        // Fase 1: GitHub Identity
        let res = await fetchWithHeaders(name, url, 'github');
        itemReport.stages.push({ mode: 'github', status: res.status, ok: res.ok });

        // Fase 2: Clean Browser
        if (!res.ok) {
            res = await fetchWithHeaders(name, url, 'clean');
            itemReport.stages.push({ mode: 'clean', status: res.status, ok: res.ok });
        }

        // Fase 3: Weserv Proxy
        if (!res.ok) {
            const cleanUrl = url.replace(/^https?:\/\//, '');
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&nps=1&output=png`;
            res = await fetchWithHeaders(name, proxyUrl, 'weserv');
            itemReport.stages.push({ mode: 'weserv', status: res.status, ok: res.ok });
        }

        resultsReport.push(itemReport);
        console.log(res.ok ? "✅" : "❌");
    }

    fs.writeFileSync('diagnostic_report.json', JSON.stringify(resultsReport, null, 4));
    console.log("\nReporte guardado en diagnostic_report.json");
};

runDiagnostic();
