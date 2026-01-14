/**
 * verify_integrity.js
 * Auditoría profunda del Director de Arte para detectar alucinaciones.
 * Versión final con test de self-relf-cli.
 */
const fs = require('fs');

const ENDPOINT = 'http://localhost:8000/v1/chat/completions';
const CACHE_PATH = 'C:/Users/mauro/AppData/Roaming/Giteach/repo_cache.json';

async function callAI(systemPrompt, userMessage, temperature) {
    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "lfm2.5",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: temperature
            })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (e) {
        return `ERROR: ${e.message}`;
    }
}

async function runAudit() {
    console.log("🚀 Iniciando Auditoría de Integridad Final...");

    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    const username = "mauro3422";
    const dna = cache.users?.[username]?.dna || { bio: "No DNA found", traits: [], verdict: "N/A" };

    let deepMemoryString = `BIOGRAFÍA: ${dna.bio}\nVEREDICTO: ${dna.verdict}\n`;
    if (dna.traits) {
        dna.traits.forEach(t => {
            deepMemoryString += `- [${t.name} ${t.score}%]: ${t.details}\n`;
        });
    }

    const repos = Object.keys(cache.repos || {}).join(', ');

    const systemPrompt = `# MANDATO CRÍTICO: USA ÚNICAMENTE LA INFORMACIÓN ANALIZADA
Tú eres el Director de Arte. Tu misión es ser un espejo técnico del usuario ${username}.

## REGLAS DE ORO (HALLUCINATION GUARD):
1. **NO INVENTES NOMBRES DE PROYECTOS**: Si el contexto no dice que un proyecto se llama "Máximo Gravity", no uses ese nombre.
2. **CITA EVIDENCIAS**: Di cosas como "He visto en tu repo [Nombre] que usas..." o "Basado en tu archivo [X]...".
3. **SÉ HONESTO**: Si el contexto es escaso sobre un tema, admítelo en lugar de inventar.

## INFORMACIÓN ANALIZADA:
USUARIO: ${username}
REPOSITORIOS DETECTADOS: ${repos}

## 🧬 ADN TÉCNICO (SÍNTESIS MAP-REDUCE)
${deepMemoryString}

Responde en español, técnico y veraz.`;

    const questions = [
        "¿Quién soy según mi código y qué proyectos analizaste?",
        "¿Cuál es mi mayor fortaleza técnica detectada?",
        "¿Qué sabes de mis hábitos de programación (SOLID, Naming)?",
        "¿Existe algún proyecto llamado 'Máximo Gravity' en mis repos?",
        "Dime un detalle técnico muy específico que haya en 'lifesimuletorC'.",
        "Resúmeme qué es 'self-relf-cli' y qué destacarías de ese sistema según lo que viste en mi código."
    ];

    for (const q of questions) {
        console.log(`\n❓ PREGUNTA: ${q}`);
        const response = await callAI(systemPrompt, q, 0.1);
        console.log(`🤖 RESPUESTA: ${response}`);

        if (response.toLowerCase().includes("máximo gravity") || response.toLowerCase().includes("maximo gravity")) {
            console.log("⚠️ ALERTA: Alucinación 'Máximo Gravity' detectada.");
        }
    }
}

runAudit();
