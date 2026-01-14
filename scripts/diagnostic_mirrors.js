
const fs = require('fs');

const urls = {
    'github_stats_V1': 'https://github-readme-stats.vercel.app/api?username=mauro3422&show_icons=true&theme=tokyonight',
    'github_stats_V2': 'https://github-readme-stats-sigma-five.vercel.app/api?username=mauro3422&show_icons=true&theme=tokyonight',
    'top_langs_V1': 'https://github-readme-stats.vercel.app/api/top-langs/?username=mauro3422&layout=compact&theme=tokyonight',
    'top_langs_V2': 'https://github-readme-stats-sigma-five.vercel.app/api/top-langs/?username=mauro3422&layout=compact&theme=tokyonight',
    'github_trophies': 'https://github-profile-trophy.vercel.app/?username=mauro3422&theme=tokyonight',
    'welcome_header_V1': 'https://capsule-render.vercel.app/render?type=wave&color=auto&height=120&text=GitTeach&fontSize=50',
    'welcome_header_V2': 'https://capsule-render.vercel.app/render?type=wave&color=00d2ff&height=120&text=GitTeach&fontSize=50&fontAlign=50',
    'project_showcase': 'https://github-readme-stats.vercel.app/api/pin/?username=mauro3422&repo=mauro3422&theme=tokyonight'
};

const fetchWithHeaders = async (name, url, mode = 'github') => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (mode === 'github') {
        headers['Referer'] = 'https://github.com/';
    }
    try {
        const res = await fetch(url, { headers, redirect: 'follow' });
        return { ok: res.ok, status: res.status };
    } catch (e) {
        return { ok: false, error: e.message };
    }
};

const runDiagnostic = async () => {
    console.log("=== 🔍 DIAGNÓSTICO DE MIRRORS ===\n");
    const resultsReport = [];

    for (const [name, url] of Object.entries(urls)) {
        process.stdout.write(`Testing ${name}... `);
        let res = await fetchWithHeaders(name, url, 'github');
        if (!res.ok) res = await fetchWithHeaders(name, url, 'clean');

        console.log(res.ok ? "✅" : `❌ (${res.status})`);
        resultsReport.push({ name, url, ok: res.ok, status: res.status });
    }

    fs.writeFileSync('mirror_report.json', JSON.stringify(resultsReport, null, 4));
};

runDiagnostic();
