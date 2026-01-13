const https = require('https');

const USERNAME = 'mauro3422';

const urls = {
    github_stats: `https://github-readme-stats.vercel.app/api?username=${USERNAME}&show_icons=true&theme=tokyonight`,
    top_langs: `https://github-readme-stats.vercel.app/api/top-langs/?username=${USERNAME}&layout=compact&theme=tokyonight`,
    github_trophies: `https://github-profile-trophy.vercel.app/?username=${USERNAME}&theme=flat&no-frame=true&no-bg=true&margin-w=4`,
    streak_stats: `https://github-readme-streak-stats.herokuapp.com/?user=${USERNAME}&theme=default`,
    profile_views: `https://komarev.com/ghpvc/?username=${USERNAME}&color=blue`,
    welcome_header: `https://capsule-render.vercel.app/api?type=waving&color=auto&height=200&section=header&text=Welcome&fontSize=60`
};

console.log(`Checking widgets for user: ${USERNAME}...\n`);

Object.entries(urls).forEach(([name, url]) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const isSvg = res.headers['content-type']?.includes('svg');
            // Check for common error text in SVG response
            const hasError = data.includes('Something went wrong') || data.includes('Error');

            const statusIcon = res.statusCode === 200 && !hasError ? '✅' : '❌';
            console.log(`${statusIcon} [${name}] Status: ${res.statusCode} | Type: ${res.headers['content-type']}`);

            if (res.statusCode !== 200 || hasError) {
                console.log(`    URL: ${url}`);
                if (hasError) console.log(`    Body Preview: ${data.substring(0, 100)}...`);
            }
        });
    }).on('error', (e) => {
        console.log(`❌ [${name}] Error: ${e.message}`);
    });
});
