const https = require('https');

const mirrors = [
    'https://github-readme-stats.vercel.app', // Original (Failing)
    'https://github-readme-stats-eight-theta.vercel.app',
    'https://github-readme-stats-sigma-five.vercel.app',
    'https://github-readme-stats-psi-five.vercel.app'
];

const USERNAME = 'mauro3422';
const PATH = `/api/top-langs/?username=${USERNAME}&layout=compact&theme=tokyonight`;

console.log(`Checking mirrors for ${USERNAME}...\n`);

mirrors.forEach(base => {
    const url = base + PATH;
    const req = https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            const status = res.statusCode === 200 && !data.includes('Error') ? '✅' : '❌';
            console.log(`${status} [${base}] Status: ${res.statusCode}`);
        });
    });
    req.on('error', e => console.log(`❌ [${base}] Error: ${e.message}`));
});
