/**
 * audit_context_payload.js
 * Genera un "Volcado de Cerebro" de la IA para auditoría del usuario.
 */
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(process.env.APPDATA, 'Giteach', 'repo_cache.json');
const USERNAME = 'mauro3422'; // Usuario hardcodeado para este test
const OUT_FILE = 'context_dump.md';
const SUMMARY_LIMIT = 5; // Simular límite de resumen rápido

// Función auxiliar para reconstruir el prompt (Copiada de ProfileAnalyzer/AIService)
function generateContextString(dna, repos) {
    let deepMemoryString = "";

    // 1. ADN / Memoria Profunda
    if (dna && typeof dna === 'object') {
        deepMemoryString += `### 🧬 ADN TÉCNICO (Resultados del Curator)\n`;
        deepMemoryString += `**Biografía**: ${dna.bio || "N/A"}\n`;
        deepMemoryString += `**Veredicto**: ${dna.verdict || "N/A"}\n`;

        if (Array.isArray(dna.traits)) {
            deepMemoryString += `**Rasgos Detectados**:\n`;
            dna.traits.forEach(t => {
                deepMemoryString += `- [${t.name}]: ${t.details}\n`;
            });
        }
    } else {
        deepMemoryString += `### 🧬 ADN TÉCNICO\n(Sin datos profundos aún)\n`;
    }

    // 2. Resúmenes de Repos (Evidencias)
    let repoString = `\n### 🔍 EVIDENCIAS POR REPO (Top ${SUMMARY_LIMIT})\n`;
    const repoNames = Object.keys(repos || {});

    if (repoNames.length === 0) {
        repoString += "_No hay repositorios analizados._\n";
    } else {
        repoNames.slice(0, SUMMARY_LIMIT).forEach(name => {
            const repo = repos[name];
            repoString += `\n#### 📦 ${name}\n`;

            // Buscar un resumen general o archivos clave
            let fileCount = 0;
            if (repo.files) {
                fileCount = Object.keys(repo.files).length;

                // Mostrar algunos archivos analizados
                Object.keys(repo.files).slice(0, 3).forEach(fPath => {
                    const fData = repo.files[fPath];
                    repoString += `- \`${fPath}\`: ${fData.summary ? fData.summary.substring(0, 80) + "..." : "Sin resumen"}\n`;
                });
            }
            repoString += `*(Total archivos analizados: ${fileCount})*\n`;
        });
    }

    return `# 🧠 CONTEXTO TÉCNICO INYECTADO A LA IA
> Este documento muestra EXACTAMENTE qué información tiene el "Director de Arte" sobre ti en este momento.

${deepMemoryString}
${repoString}

---
**NOTA**: Esta información se usa de fondo ("Memoria Latente") para que la IA entienda tu contexto sin que tengas que explicárselo.`;
}

async function runAudit() {
    console.log(`🕵️ Iniciando auditoría de contexto para: ${USERNAME}`);
    console.log(`📂 Leyendo cache desde: ${CACHE_PATH}`);

    try {
        if (!fs.existsSync(CACHE_PATH)) {
            console.error("❌ Archivo de cache no encontrado. Asegúrate de haber ejecutado la app al menos una vez.");
            return;
        }

        const cacheRaw = fs.readFileSync(CACHE_PATH, 'utf8');
        const cache = JSON.parse(cacheRaw);
        const userData = cache.users?.[USERNAME];

        if (!userData) {
            console.error(`❌ No se encontraron datos para el usuario ${USERNAME} en el cache.`);
            return;
        }

        console.log("✅ Datos de usuario encontrados.");

        const dna = userData.dna;
        const repos = userData.repos;

        const contextDump = generateContextString(dna, repos);

        fs.writeFileSync(OUT_FILE, contextDump, 'utf8');
        console.log(`\n📄 RESULTADO GUARDADO EN: ${path.resolve(OUT_FILE)}`);
        console.log("👉 Abre este archivo para ver lo que ve la IA.");

    } catch (e) {
        console.error("❌ Error durante la auditoría:", e);
    }
}

runAudit();
