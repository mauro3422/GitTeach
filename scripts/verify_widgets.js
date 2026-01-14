/**
 * Widget Tools Verification Script
 * Verifica que cada herramienta genere URLs válidas de imágenes/widgets.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Cargar token de GitHub
const appDataPath = process.env.APPDATA || path.join(process.env.HOME, '.config');
const tokenPath = path.join(appDataPath, 'giteach', 'token.json');
let GITHUB_TOKEN = '';
let USERNAME = 'mauro3422';

try {
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    GITHUB_TOKEN = tokenData.access_token;
    console.log('✅ Token cargado correctamente');
} catch (e) {
    console.log('⚠️ No se pudo cargar token, algunas verificaciones pueden fallar');
}

// Definición de todos los widgets a verificar
const WIDGETS = [
    {
        name: 'GitHub Stats - Profile Summary Cards',
        url: `https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=${USERNAME}&theme=tokyonight`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Top Languages - Profile Summary Cards',
        url: `https://github-profile-summary-cards.vercel.app/api/cards/repos-per-language?username=${USERNAME}&theme=tokyonight`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Streak Stats',
        url: `https://streak-stats.demolab.com/?user=${USERNAME}&theme=default`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'GitHub Trophies',
        url: `https://github-profile-trophy.vercel.app/?username=${USERNAME}&theme=onedark`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Activity Graph',
        url: `https://github-readme-activity-graph.vercel.app/graph?username=${USERNAME}&theme=tokyo-night`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Profile Views Counter',
        url: `https://komarev.com/ghpvc/?username=${USERNAME}&color=blue`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Shields.io Badge (JavaScript)',
        url: `https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white`,
        expectedType: 'image/svg+xml'
    },
    {
        name: 'Contribution Snake (requires workflow)',
        url: `https://raw.githubusercontent.com/${USERNAME}/${USERNAME}/output/github-contribution-grid-snake.svg`,
        expectedType: 'image/svg+xml',
        optional: true // Puede no existir si el workflow no está configurado
    }
];

// Función para verificar una URL
function checkUrl(widget) {
    return new Promise((resolve) => {
        const urlObj = new URL(widget.url);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'GitTeach-Verification/1.0'
            }
        };

        const req = protocol.request(options, (res) => {
            const contentType = res.headers['content-type'] || '';
            const status = res.statusCode;

            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const result = {
                    name: widget.name,
                    url: widget.url,
                    status: status,
                    contentType: contentType,
                    size: body.length,
                    ok: status === 200,
                    isSvg: contentType.includes('svg') || body.startsWith('<svg'),
                    optional: widget.optional || false
                };

                // Verificar tipo de contenido
                if (status === 200) {
                    if (result.isSvg || contentType.includes('image')) {
                        result.verdict = '✅ PASS';
                    } else {
                        result.verdict = '⚠️ WARN (not image)';
                        result.preview = body.substring(0, 200);
                    }
                } else if (status === 404 && widget.optional) {
                    result.verdict = '⏭️ SKIP (optional)';
                } else {
                    result.verdict = '❌ FAIL';
                    result.preview = body.substring(0, 200);
                }

                resolve(result);
            });
        });

        req.on('error', (e) => {
            resolve({
                name: widget.name,
                url: widget.url,
                status: 0,
                ok: false,
                verdict: '❌ ERROR',
                error: e.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: widget.name,
                url: widget.url,
                status: 0,
                ok: false,
                verdict: '⏰ TIMEOUT'
            });
        });

        req.end();
    });
}

// Función principal
async function main() {
    console.log('='.repeat(60));
    console.log('🔍 VERIFICACIÓN DE WIDGETS - GitTeach');
    console.log('='.repeat(60));
    console.log(`📅 Fecha: ${new Date().toISOString()}`);
    console.log(`👤 Usuario: ${USERNAME}`);
    console.log(`🔧 Total widgets: ${WIDGETS.length}`);
    console.log('');

    const results = [];

    for (const widget of WIDGETS) {
        process.stdout.write(`Verificando: ${widget.name}... `);
        const result = await checkUrl(widget);
        console.log(result.verdict);
        results.push(result);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.verdict.includes('PASS')).length;
    const failed = results.filter(r => r.verdict.includes('FAIL') || r.verdict.includes('ERROR')).length;
    const warned = results.filter(r => r.verdict.includes('WARN')).length;
    const skipped = results.filter(r => r.verdict.includes('SKIP') || r.verdict.includes('TIMEOUT')).length;

    console.log(`✅ PASS: ${passed}`);
    console.log(`❌ FAIL: ${failed}`);
    console.log(`⚠️ WARN: ${warned}`);
    console.log(`⏭️ SKIP/TIMEOUT: ${skipped}`);
    console.log('');

    // Mostrar detalles de fallos
    const failures = results.filter(r => r.verdict.includes('FAIL') || r.verdict.includes('ERROR'));
    if (failures.length > 0) {
        console.log('❌ DETALLES DE FALLOS:');
        failures.forEach(f => {
            console.log(`  - ${f.name}`);
            console.log(`    URL: ${f.url}`);
            console.log(`    Status: ${f.status}`);
            if (f.error) console.log(`    Error: ${f.error}`);
            if (f.preview) console.log(`    Response: ${f.preview.substring(0, 100)}...`);
        });
    }

    // Guardar reporte
    const reportPath = path.join(__dirname, 'widget_verification_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        username: USERNAME,
        summary: { passed, failed, warned, skipped },
        results: results
    }, null, 2));
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);

    // Exit code basado en resultados
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
