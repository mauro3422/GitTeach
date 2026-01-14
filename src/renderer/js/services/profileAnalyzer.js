/**
 * Orquestador de agentes en paralelo para analizar el perfil de GitHub del usuario.
 * Ahora con sistema de cache para análisis incremental y cobertura completa.
 * ACTUALIZADO: Usa AIWorkerPool para llamadas paralelas a IA en GPU.
 */
import { AIService } from './aiService.js';
import { CoordinatorAgent } from './coordinatorAgent.js';
import { AIWorkerPool } from './aiWorkerPool.js';

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
        this.coordinator = new CoordinatorAgent();
        this.workerPool = new AIWorkerPool(4); // 4 workers = 4 slots GPU
    }

    async analyze(username, onStep = null) {
        if (this.isAnalyzing) return;
        this.isAnalyzing = true;

        // Logs de inicio eliminados para limpieza


        try {
            // --- INFRAESTRUCTURA DE AGENTES PARALELOS (WORKERS) ---
            const [repos, readmeData, audit] = await Promise.all([
                window.githubAPI.listRepos(),
                window.githubAPI.getProfileReadme(username),
                this.runAuditorAgent(username)
            ]);

            // FORENSICS: Verificar ingesta real de datos
            // Forensic logs removed


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
                failedFiles: this.coordinator.inventory.failedFiles.length,
                timestamp: new Date().toISOString()
            };

            if (window.githubAPI?.logToTerminal) {
                // Solo mostrar resultado final de auditoría si es relevante
                if (this.results.audit && this.results.audit.score < 50) {
                    window.githubAPI.logToTerminal(`⚠️ Tu README podría mejorar (Score: ${this.results.audit.score})`);
                }
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
     * Motor de Escaneo de Código Profundo con Cache (Recursivo)
     * - Analiza TODOS los repos (no solo 5)
     * - Usa cache para evitar re-descargas
     * - Procesa más archivos por repo (10 en lugar de 3)
     */
    async runDeepCodeScanner(username, repos, onStep = null) {
        // Deep Code Scan start log removed


        // Inicializar coordinator con todos los repos
        this.coordinator.initInventory(repos);
        this.coordinator.onProgress = (data) => {
            if (onStep) onStep(data);
        };

        // Procesar TODOS los repos disponibles (sin límite)
        const targetRepos = repos; // Todos los repos
        const allFindings = [];

        // Procesar en batches paralelos
        await Promise.all(targetRepos.map(async (repo, index) => {
            const workerId = (index % 4) + 1;

            if (onStep) {
                const stats = this.coordinator.getStats();
                onStep({ type: 'Progreso', percent: stats.progress, message: `Rastreando ${repo.name}...` });
            }

            try {
                // 1. Obtener árbol recursivo
                const treeData = await window.githubAPI.getRepoTree(username, repo.name, true);

                if (treeData && treeData.message && treeData.message.includes("rate limit")) {
                    onStep({ type: 'Error', message: `Base de datos bloqueada temporalmente (Rate Limit).` });
                    allFindings.push({ repo: repo.name, error: "Rate Limit" });
                    return;
                }

                if (!treeData || !treeData.tree) return;

                // Registrar archivos en el coordinator
                const treeSha = treeData.sha || 'unknown';
                this.coordinator.registerRepoFiles(repo.name, treeData.tree, treeSha);

                // 2. Verificar si el repo cambió desde última vez (cache)
                let needsFullScan = true;
                if (window.cacheAPI) {
                    try {
                        needsFullScan = await window.cacheAPI.hasRepoChanged(username, repo.name, treeSha);
                        if (!needsFullScan) {
                            if (window.githubAPI?.logToTerminal) {
                                window.githubAPI.logToTerminal(`   ⚡ [Cache HIT] ${repo.name} - Usando datos cacheados`);
                            }
                        }
                    } catch (e) {
                        needsFullScan = true;
                    }
                }

                // 3. Identificar archivos "Ancla" (Arquitectura)
                const anchors = this.identifyAnchorFiles(treeData.tree);

                // Anchors log removed


                // 4. Auditoría de TODOS los archivos ancla (máximo 50 por repo)
                const filesToAudit = anchors.slice(0, 50);
                const repoAudit = await Promise.all(filesToAudit.map(async (file) => {
                    // Verificar cache primero
                    if (window.cacheAPI && !needsFullScan) {
                        try {
                            const needsUpdate = await window.cacheAPI.needsUpdate(username, repo.name, file.path, file.sha);
                            if (!needsUpdate) {
                                const cached = await window.cacheAPI.getFileSummary(username, repo.name, file.path);
                                if (cached) {
                                    this.coordinator.markCompleted(repo.name, file.path, cached.summary);
                                    return { path: file.path, snippet: cached.contentSnippet || '', fromCache: true };
                                }
                            }
                        } catch (e) { /* Cache miss, proceder con fetch */ }
                    }

                    if (onStep) {
                        const stats = this.coordinator.getStats();
                        onStep({ type: 'Progreso', percent: stats.progress, message: `Descargando ${file.path}...` });
                    }

                    const contentRes = await window.githubAPI.getFileContent(username, repo.name, file.path);
                    if (contentRes && contentRes.content) {
                        const codeSnippet = atob(contentRes.content.replace(/\n/g, '')).substring(0, 1500);

                        // Guardar en cache
                        if (window.cacheAPI) {
                            try {
                                await window.cacheAPI.setFileSummary(
                                    username, repo.name, file.path,
                                    contentRes.sha,
                                    `Archivo de código en ${repo.name}`,
                                    codeSnippet
                                );
                            } catch (e) { /* Cache write error */ }
                        }

                        // NUEVO: Encolar para procesamiento IA (máximo 200 archivos con 80K de contexto)
                        if (this.workerPool.totalQueued < 200) {
                            this.workerPool.enqueue(repo.name, file.path, codeSnippet, contentRes.sha);
                        }

                        this.coordinator.markCompleted(repo.name, file.path, codeSnippet.substring(0, 100));
                        return { path: file.path, snippet: codeSnippet };
                    }
                    return null;
                }));

                // Guardar tree SHA en cache
                if (window.cacheAPI) {
                    try {
                        await window.cacheAPI.setRepoTreeSha(username, repo.name, treeSha);
                    } catch (e) { /* Cache error */ }
                }
                // ACTUALIZADO: Incluye resúmenes de IA
                allFindings.push({
                    repo: repo.name,
                    techStack: anchors.map(a => a.path),
                    auditedFiles: repoAudit.filter(f => f !== null)
                });

                // Notificar fin de repo (silencioso en chat, update barra)
                if (onStep) {
                    const stats = this.coordinator.getStats();
                    onStep({ type: 'Progreso', percent: stats.progress, message: `Completado ${repo.name}.` });
                }

            } catch (e) {
                console.error(`Error escaneando ${repo.name}:`, e);
                this.coordinator.report('Error', `${repo.name}: ${e.message}`);
            }
        }));

        // Log estadísticas del coordinator
        const stats = this.coordinator.getStats();
        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`📊 [DOWNLOAD] ${stats.analyzed}/${stats.totalFiles} archivos descargados`);
        }

        // NUEVO: Procesar archivos con 4 workers de IA EN BACKGROUND (no bloquear)
        if (this.workerPool.totalQueued > 0) {
            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`🚀 [AI WORKERS] Lanzando ${this.workerPool.workerCount} workers en background para ${this.workerPool.totalQueued} archivos...`);
            }

            this.workerPool.onProgress = (data) => {
                if (onStep) {
                    onStep({
                        type: 'Progreso',
                        percent: data.percent,
                        message: `🤖 Worker ${data.workerId}: ${data.file}`
                    });
                }
            };

            // NO BLOQUEANTE: Procesar en background, no esperamos
            this.aiWorkersPromise = this.workerPool.processAll(AIService).then(aiSummaries => {
                if (window.githubAPI?.logToTerminal) {
                    window.githubAPI.logToTerminal(`✅ [AI WORKERS] Background complete: ${aiSummaries.length} archivos resumidos`);
                }
                // Los resúmenes se guardan en cache para futuras sesiones
            }).catch(err => {
                console.warn('[AI WORKERS] Background error:', err);
            });
        }

        // CURACIÓN: Consolidar hallazgos para la IA principal
        const curated = this.curateFindings(allFindings);

        // BACKGROUND ANALYSIS: Continuar analizando en segundo plano (Descarga de archivos)
        this.backgroundPromise = this.startBackgroundAnalysis(username, allFindings);

        // PROMESA DE INTELIGENCIA COMPLETA: Espera a que TODO termine (Descarga + IA)
        this.fullIntelligencePromise = Promise.all([
            this.backgroundPromise,
            this.aiWorkersPromise || Promise.resolve()
        ]);

        return curated;
    }

    /**
     * Análisis en segundo plano - sigue aprendiendo mientras el usuario trabaja
     * Retorna Promise para que tests puedan esperarlo
     */
    async startBackgroundAnalysis(username, initialFindings) {
        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`🔄 [BACKGROUND] Iniciando análisis profundo en segundo plano...`);
        }

        // Pequeña pausa para no bloquear el render inicial
        await new Promise(r => setTimeout(r, 100));

        // Obtener archivos pendientes del coordinator
        const pendingBatches = [];
        let batch;
        // Tomamos TODOS los archivos pendientes (ignorePriority: true)
        // en lotes de 20 para eficiencia
        while ((batch = this.coordinator.getNextBatch(20, true)).length > 0) {
            pendingBatches.push(batch);
        }

        if (pendingBatches.length === 0) {
            if (window.githubAPI?.logToTerminal) {
                window.githubAPI.logToTerminal(`✅ [BACKGROUND] Sin archivos pendientes. Cobertura completa.`);
            }
            return;
        }

        // Procesar todas los batches pendientes
        for (const fileBatch of pendingBatches) {
            await Promise.all(fileBatch.map(async (fileInfo) => {
                try {
                    // Verificar cache
                    if (window.cacheAPI) {
                        const cached = await window.cacheAPI.getFileSummary(username, fileInfo.repo, fileInfo.path);
                        if (cached) {
                            this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, cached.summary);
                            return;
                        }
                    }

                    // Descargar archivo
                    const contentRes = await window.githubAPI.getFileContent(username, fileInfo.repo, fileInfo.path);
                    if (contentRes && contentRes.content) {
                        const snippet = atob(contentRes.content.replace(/\n/g, '')).substring(0, 1500);

                        // Guardar en cache
                        if (window.cacheAPI) {
                            await window.cacheAPI.setFileSummary(
                                username, fileInfo.repo, fileInfo.path,
                                contentRes.sha, `Code in ${fileInfo.repo}`, snippet
                            );
                        }

                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, snippet.substring(0, 100));
                    }
                } catch (e) {
                    this.coordinator.markFailed(fileInfo.repo, fileInfo.path, e.message);
                }
            }));

            // Pequeña pausa entre batches para no saturar
            await new Promise(r => setTimeout(r, 50));
        }

        const finalStats = this.coordinator.getStats();
        if (window.githubAPI?.logToTerminal) {
            window.githubAPI.logToTerminal(`✅ [BACKGROUND] Análisis completo: ${finalStats.analyzed}/${finalStats.totalFiles} (${finalStats.progress}%)`);
            window.githubAPI.logToTerminal(`🧠 [BACKGROUND] Refrescando memoria del Director de Arte con conocimiento profundo...`);
        }

        // --- ACTUALIZACIÓN DE SESIÓN AUTOMÁTICA ---
        // Ahora que tenemos los resúmenes de los workers, refrescamos el contexto de la IA de chat.
        const freshContext = this.getFreshContext(username);
        AIService.setSessionContext(freshContext);
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
        // ACTUALIZADO: Ahora incluye resúmenes generados por IA workers
        if (findings.length === 0) return [];

        return findings.map(f => ({
            repo: f.repo,
            error: f.error || null,
            structure: f.techStack ? (f.techStack.length > 0 ? f.techStack.slice(0, 10).join(', ') : "Estructura no accesible") : "N/A",
            auditedSnippets: f.auditedFiles ? (f.auditedFiles.length > 0 ? f.auditedFiles.map(af => ({
                file: af.path,
                content: af.snippet?.substring(0, 300) || '',
                aiSummary: af.aiSummary || null  // NUEVO: Resumen de IA
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
            prompt = `Eres un CURADOR TÉCNICO DE ÉLITE. Tu meta es transformar el código analizado por los Workers en un PERFIL DE IMPACTO para ${username}.
            
            DATOS CRUDOS (ESTRICTAMENTE VERACES):
            ${JSON.stringify(codeInsights, null, 2)}
            
            INSTRUCCIONES DE CURACIÓN:
            1. Identifica PATRONES ARQUITECTÓNICOS (ej: "Usa inyección de dependencias", "Patrón Factory detectado", "Manejo de estados con Redux").
            2. Extrae FORTALEZAS (ej: "Experto en optimización de juegos", "Enfoque en Clean Code y SOLID").
            3. Selecciona PIEZAS DE PORTAFOLIO (Nombra archivos específicos que demuestren alta complejidad).
            
            REGLAS DE FORMATO (JSON ÚNICAMENTE):
            {
              "summary": "Un resumen narrativo de 3-4 frases que DESTACA FORTALEZAS y menciona ARCHIVOS CLAVE.",
              "suggestions": ["welcome_header", "skills_grid", "github_stats", "project_showcase"]
            }
            
            Responde SIEMPRE en ESPAÑOL y basa tus afirmaciones SOLAMENTE en los datos de los workers.`;
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
    /**
     * Obtiene el contexto más reciente incluyendo todos los resúmenes de archivos
     * Se debe llamar después de que el background analysis o los workers terminen.
     */
    getFreshContext(username) {
        if (!this.results) return "";

        const langList = (this.results.mainLangs && this.results.mainLangs.length > 0)
            ? this.results.mainLangs.join(', ')
            : 'varios lenguajes';
        const deepSummaries = this.coordinator.getSummaryForChat();

        return `--- MEMORIA PROFUNDA DEL DIRECTOR DE ARTE ---
USUARIO: ${username}
TALENTO: ${langList}

INTRODUCCIÓN CURADA:
${this.results.summary}

EVIDENCIA TÉCNICA (DETALLE POR ARCHIVO - FORTALEZAS Y PATRONES):
${deepSummaries || "Pendiente de completar el scanner profundo..."}

--- FIN DEL CONTEXTO ---`;
    }
}
