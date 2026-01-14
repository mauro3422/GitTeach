
const username = 'mauro3422';
const url = `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true`;
const staticallyUrl = `https://cdn.statically.io/img/${url.replace('https://', '')}`;

async function test() {
    console.log(`[Statically Test] URL: ${staticallyUrl}`);
    try {
        const res = await fetch(staticallyUrl);
        console.log(`Status: ${res.status} | Type: ${res.headers.get('content-type')}`);
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}
test();
