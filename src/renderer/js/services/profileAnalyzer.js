/**
 * Orquestador de agentes en paralelo para analizar el perfil de GitHub del usuario.
 */
import { AIService } from './aiService.js';

export class ProfileAnalyzer {
    constructor() {
        this.results = {
            mainLangs: [],
            topRepos: [],
            totalStars: 0,
            summary: "",
            suggestions: []
        };
        this.isAnalyzing = false;
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`\n🕵️ AGENTIC CYCLE START: ${username}`);
            window.githubAPI.logToTerminal(`🚀 LAUNCHING WORKERS (Parallel)...`);
        }

        try {
            // --- INFRAESTRUCTURA DE AGENTES PARALELOS (WORKERS) ---
            const [repos, readmeData, audit] = await Promise.all([
                window.githubAPI.listRepos(),
                window.githubAPI.getProfileReadme(username),
                this.runAuditorAgent(username)
            ]);

            // FORENSICS: Verificar ingesta real de datos
            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`\n🔍 [FORENSICS] DATA INGESTION VERIFIED:`);
                window.githubAPI.logToTerminal(`   📂 REPOS DISCOVERED: ${repos.length}`);

                if (readmeData && readmeData.content) {
                    const decoded = atob(readmeData.content.replace(/\n/g, ''));
                    const snippet = decoded.substring(0, 150).replace(/\n/g, ' ');
                    window.githubAPI.logToTerminal(`   📄 README CONTENT SNIPPET: "${snippet}..."`);
                } else {
                    window.githubAPI.logToTerminal(`   📄 README STATUS: Not found or empty.`);
                }
                window.githubAPI.logToTerminal(`------------------------------------------\n`);
            }

            // --- INTELIGENCIA DE CÓDIGO (DEEP CODE SCANNER) ---
            // Los workers ahora navegan por el código fuente real.
            const codeInsights = await this.runDeepCodeScanner(username, repos, onStep);

            // Agente 1: Analizador de Lenguajes (Datos Estructurales)
            const langData = this.processLanguages(repos);

            // --- VALIDACIÓN DE VERACIDAD (CHECKER) ---
            const hasRealData = codeInsights && codeInsights.length > 0;
            if (!hasRealData && window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`⚠️ [WARNING] No se pudo extraer código real. Los Workers reportan fallos de acceso.`);
            }

            // Agente 2: IA - Generador de Insights y Selección de Widgets
            // Pasamos explícitamente si tenemos datos reales o no.
            const aiInsight = await this.getAIInsights(username, langData, repos.slice(0, 5), codeInsights, hasRealData);

            this.results = {
                mainLangs: langData,
                topRepos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3),
                summary: aiInsight.summary,
                suggestions: aiInsight.suggestions,
                audit: audit,
                deepScan: codeInsights,
                timestamp: new Date().toISOString()
            };

            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`📊 AGENT (Audit): Score ${this.results.audit?.score || '0'}/100`);
                window.githubAPI.logToTerminal(`✨ AI INSIGHT: "${this.results.summary}"`);
                window.githubAPI.logToTerminal(`🧩 SUGGESTIONS: [${this.results.suggestions.join(', ')}]`);
                window.githubAPI.logToTerminal(`✅ CYCLE COMPLETE.\n`);
            }

            return this.results;

        } catch (error) {
            console.error("❌ Error en el análisis agéntico paralelo:", error);
            return null;
        } finally {
            this.isAnalyzing = false;
        }
    }

    async runAuditorAgent(username) {
        // Un worker especializado en auditoría de legibilidad/calidad
        try {
            const { ToolRegistry } = await import('./toolRegistry.js');
            const auditor = ToolRegistry.getById('readability_auditor');
            if (auditor) {
                return await auditor.execute({}, username);
            }
        } catch (e) {
            return { score: 0, details: "Auditor offline" };
        }
    }

    /**
     * Motor de Escaneo de Código Profundo (Recursivo)
     */
    async runDeepCodeScanner(username, repos, onStep = null) {
        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`🚀 [DEEP CODE SCAN] Iniciando rastreo recursivo...`);
        }

        const targetRepos = repos.slice(0, 5); // Analizamos los 5 más relevantes
        const allFindings = [];

        await Promise.all(targetRepos.map(async (repo, index) => {
            const workerId = (index % 4) + 1;

            if (onStep) onStep(`Rastreando estructura de <b>${repo.name}</b>...`);

            try {
                // 1. Obtener árbol recursivo
                const treeData = await window.githubAPI.getRepoTree(username, repo.name, true);

                if (treeData && treeData.message && treeData.message.includes("rate limit")) {
                    if (onStep) onStep(`⚠️ <b>Límite de API alcanzado</b>. No puedo profundizar más por ahora.`);
                    allFindings.push({ repo: repo.name, error: "Rate Limit" });
                    return;
                }

                if (!treeData || !treeData.tree) return;

                // 2. Identificar archivos "Ancla" (Arquitectura)
                const anchors = this.identifyAnchorFiles(treeData.tree);

                if (window.githubAPI?.logToTerminal) {
                    window.githubAPI.logToTerminal(`   📂 [Worker ${workerId}] Repo: ${repo.name} - Encontrados: ${anchors.slice(0, 5).map(a => a.path).join(', ')}...`);
                }

                // 3. Auditoría de archivos clave en paralelo
                const repoAudit = await Promise.all(anchors.slice(0, 3).map(async (file) => {
                    if (onStep) onStep(`Auditando código en <b>${repo.name}/${file.path}</b>`);

                    const contentRes = await window.githubAPI.getFileContent(username, repo.name, file.path);
                    if (contentRes && contentRes.content) {
                        const codeSnippet = atob(contentRes.content.replace(/\n/g, '')).substring(0, 1000);
                        return { path: file.path, snippet: codeSnippet };
                    }
                    return null;
                }));

                allFindings.push({
                    repo: repo.name,
                    techStack: anchors.map(a => a.path),
                    auditedFiles: repoAudit.filter(f => f !== null)
                });

                if (onStep) onStep(`Finalizada auditoría de <b>${repo.name}</b>.`);

            } catch (e) {
                console.error(`Error escaneando ${repo.name}:`, e);
            }
        }));

        // CURACIÓN: Consolidar hallazgos para la IA principal
        return this.curateFindings(allFindings);
    }

    identifyAnchorFiles(tree) {
        const extensions = [
            '.json', '.cpp', '.hpp', '.c', '.h', '.js', '.py', '.java', '.rs', '.go',
            '.rb', '.php', '.cs', '.ts', '.tsx', '.vue', '.svelte', '.sh', '.md', '.yml', '.yaml'
        ];
        const specificFiles = [
            'Dockerfile', 'Makefile', 'CMakeLists.txt', 'requirements.txt', 'package.json', 'go.mod'
        ];

        return tree.filter(node => {
            if (node.type !== 'blob') return false;
            const lowerPath = node.path.toLowerCase();
            const hasExt = extensions.some(ext => lowerPath.endsWith(ext));
            const isSpecific = specificFiles.some(file => lowerPath.endsWith(file.toLowerCase()));
            return hasExt || isSpecific;
        });
    }

    curateFindings(findings) {
        // Sintetiza los datos de los workers para que la IA tenga contexto real de cada repo
        if (findings.length === 0) return [];

        return findings.map(f => ({
            repo: f.repo,
            error: f.error || null,
            structure: f.techStack ? (f.techStack.length > 0 ? f.techStack.slice(0, 10).join(', ') : "Estructura no accesible") : "N/A",
            auditedSnippets: f.auditedFiles ? (f.auditedFiles.length > 0 ? f.auditedFiles.map(af => ({
                file: af.path,
                content: af.snippet.substring(0, 300)
            })) : "Sin Acceso") : "Error de Lectura"
        }));
    }

    processLanguages(repos) {
        const counts = {};
        repos.forEach(r => {
            if (r.language) {
                counts[r.language] = (counts[r.language] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);
    }

    async fetchUserEvents(username) {
        // Podríamos extender el githubClient para esto, por ahora simulamos
        return [];
    }

    async getAIInsights(username, langs, projects, codeInsights, hasRealData) {
        let prompt = "";

        const isRateLimited = codeInsights && codeInsights.some(f => f.error === "Rate Limit");

        if (isRateLimited) {
            prompt = `¡NOTICIA IMPORTANTE! El sistema ha alcanzado el Límite de Tasa de GitHub (Rate Limit).
            Explícale al usuario con total honestidad que los Workers han sido bloqueados temporalmente por GitHub.
            Dile que no puedes analizar el código real en este momento para evitar alucinaciones.
            Sugiérele esperar unos minutos o usar un Personal Access Token si está disponible.
            Genera un JSON con este formato:
            { "summary": "Límite de API de GitHub alcanzado temporalmente.", "suggestions": ["github_stats"] }`;
        } else if (!hasRealData) {
            prompt = `¡ATENCIÓN! No he podido acceder al código real de los repositorios de ${username} (Errores de conexión o permisos).
            Dile al usuario de forma honesta que has analizado su lista de repositorios y lenguajes (${langs.join(', ')}), 
            pero que no has podido "bucear" en su código para una auditoría profunda. 
            Pregúntale si tiene el token de GitHub configurado correctamente.
            Genera un JSON con este formato:
            { "summary": "No pude analizar tu código a fondo por falta de acceso.", "suggestions": ["github_stats"] }`;
        } else {
            prompt = `¡AUDITORÍA TÉCNICA REQUERIDA! Analiza este perfil de GitHub usando el CÓDIGO REAL extraído por los Workers:
            Usuario: ${username}
            Dominio técnico (Langs): ${langs.join(', ')}
            
            DATOS CURADOS DE LOS WORKERS (ESTRICTAMENTE VERACES):
            ${JSON.stringify(codeInsights, null, 2)}
            
            REGLAS PARA TU RESPUESTA:
            1. NO IGNORES los snippets ni la estructura detectada. Úsalos para dar un diagnóstico real.
            2. Describe su estilo basado en el código (ej: "¿Usa Fetch o Axios?", "¿Cómo organiza sus carpetas?").
            3. Genera un JSON con este formato:
            { "summary": "una frase técnica de experto basada en su código real", "suggestions": ["id_de_widget1", "id_de_widget2"] }
            Inputs IDs: welcome_header, github_stats, top_langs, github_trophies, streak_stats, activity_graph, contribution_snake, skills_grid.`;
        }

        try {
            const response = await AIService.callAI("Eres un analista de perfiles GitHub experto.", prompt, 0.3);

            // Extracción robusta de JSON (busca el primer { y el último })
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in AI response");

            const cleanJson = jsonMatch[0];
            const data = JSON.parse(cleanJson);

            return {
                summary: data.summary || "Perfil analizado.",
                suggestions: data.suggestions || ['github_stats']
            };
        } catch (e) {
            console.warn("AI Insight Fallback", e);
            return {
                summary: `Desarrollador enfocado en ${langs[0] || 'software'}.`,
                suggestions: ['github_stats', 'top_langs']
            };
        }
    }
}
