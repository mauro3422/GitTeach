/**
 * CodeScanner - Escaneo profundo de código de repositorios
 * Extraído de ProfileAnalyzer para cumplir SRP
 * UPDATED: Usa Logger y CacheRepository centralizados
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

/**
 * Motor de Escaneo de Código Profundo con Cache (Recursivo)
 * - Analiza TODOS los repos (no solo 5)
 * - Usa cache para evitar re-descargas
 * - Procesa más archivos por repo (10 en lugar de 3)
 */
export class CodeScanner {
    constructor(coordinator, workerPool) {
        this.coordinator = coordinator;
        this.workerPool = workerPool;
    }

    /**
     * Escanea todos los repositorios del usuario
     * @param {string} username 
     * @param {Array} repos 
     * @param {Function} onStep 
     * @returns {Promise<Array>} Hallazgos curados
     */
    async scan(username, repos, onStep = null) {
        // Inicializar coordinator con todos los repos
        this.coordinator.initInventory(repos);
        this.coordinator.onProgress = (data) => {
            if (onStep) onStep(data);
        };

        const targetRepos = repos;
        const allFindings = [];

        // Procesar en batches paralelos
        await Promise.all(targetRepos.map(async (repo, index) => {
            if (onStep) {
                const stats = this.coordinator.getStats();
                onStep({ type: 'Progreso', percent: stats.progress, message: `Rastreando ${repo.name}...` });
            }

            try {
                const { treeFiles, treeSha } = await this.getRepoTree(username, repo, onStep, allFindings);
                if (!treeFiles || treeFiles.length === 0) return;

                // Registrar archivos en el coordinator
                this.coordinator.registerRepoFiles(repo.name, treeFiles, treeSha);

                // Verificar si el repo cambió desde última vez (cache)
                const needsFullScan = await CacheRepository.hasRepoChanged(username, repo.name, treeSha);
                if (!needsFullScan) {
                    Logger.cache(`${repo.name} - Usando datos cacheados`, true);
                }

                // Identificar archivos "Ancla" (Arquitectura)
                const anchors = this.identifyAnchorFiles(treeFiles);

                // Auditoría de archivos ancla (máximo 50 por repo)
                const repoAudit = await this.auditFiles(username, repo.name, anchors.slice(0, 50), needsFullScan, onStep);

                // Guardar tree SHA en cache
                await CacheRepository.setRepoTreeSha(username, repo.name, treeSha);

                allFindings.push({
                    repo: repo.name,
                    techStack: anchors.map(a => a.path),
                    auditedFiles: repoAudit.filter(f => f !== null)
                });

                if (onStep) {
                    const stats = this.coordinator.getStats();
                    onStep({ type: 'Progreso', percent: stats.progress, message: `Completado ${repo.name}.` });
                }

            } catch (e) {
                Logger.error('SCAN', `Error escaneando ${repo.name}: ${e.message}`);
                this.coordinator.report('Error', `${repo.name}: ${e.message}`);
            }
        }));

        // Log estadísticas del coordinator
        const stats = this.coordinator.getStats();
        Logger.progress(stats.analyzed, stats.totalFiles, 'archivos descargados');

        return allFindings;
    }

    /**
     * Obtiene el árbol de archivos de un repo (propio o fork)
     */
    async getRepoTree(username, repo, onStep, allFindings) {
        let treeFiles = [];
        let treeSha = 'unknown';

        if (repo.fork) {
            // Si es fork, solo analizamos SI el usuario contribuyó
            Logger.fork(`Investigando contribuciones en ${repo.name}...`);

            const userCommits = await window.githubAPI.getUserCommits(username, repo.name, username);

            if (!userCommits || userCommits.length === 0) {
                Logger.info('FORK IGNORED', `Sin contribuciones en ${repo.name}. Saltando.`);
                return { treeFiles: [], treeSha: null };
            }

            // Extraer archivos modificados en los commits
            const uniqueFiles = new Set();
            for (const commit of userCommits) {
                const diff = await window.githubAPI.getCommitDiff(username, repo.name, commit.sha);
                if (diff && diff.files) {
                    diff.files.forEach(f => {
                        if (!uniqueFiles.has(f.filename)) {
                            uniqueFiles.add(f.filename);
                            treeFiles.push({ path: f.filename, type: 'blob', sha: f.sha, mode: 'patch' });
                        }
                    });
                }
            }
            treeSha = `patch_group_${userCommits[0].sha}`;

            Logger.fork(`${treeFiles.length} archivos modificados encontrados en ${repo.name}.`, true);

        } else {
            // Repositorio propio: Análisis completo
            const treeData = await window.githubAPI.getRepoTree(username, repo.name, true);

            if (treeData && treeData.message && treeData.message.includes("rate limit")) {
                onStep({ type: 'Error', message: `Base de datos bloqueada temporalmente (Rate Limit).` });
                allFindings.push({ repo: repo.name, error: "Rate Limit" });
                return { treeFiles: [], treeSha: null };
            }

            if (!treeData || !treeData.tree) return { treeFiles: [], treeSha: null };
            treeFiles = treeData.tree;
            treeSha = treeData.sha || 'unknown';
        }

        return { treeFiles, treeSha };
    }

    /**
     * Audita una lista de archivos, descargando contenido y guardando en cache
     */
    async auditFiles(username, repoName, files, needsFullScan, onStep) {
        return await Promise.all(files.map(async (file) => {
            // Verificar cache primero
            if (!needsFullScan) {
                const needsUpdate = await CacheRepository.needsUpdate(username, repoName, file.path, file.sha);
                if (!needsUpdate) {
                    const cached = await CacheRepository.getFileSummary(username, repoName, file.path);
                    if (cached) {
                        this.coordinator.markCompleted(repoName, file.path, cached.summary);
                        return { path: file.path, snippet: cached.contentSnippet || '', fromCache: true };
                    }
                }
            }

            if (onStep) {
                const stats = this.coordinator.getStats();
                onStep({ type: 'Progreso', percent: stats.progress, message: `Descargando ${file.path}...` });
            }

            const contentRes = await window.githubAPI.getFileContent(username, repoName, file.path);
            if (contentRes && contentRes.content) {
                const codeSnippet = atob(contentRes.content.replace(/\n/g, '')).substring(0, 1500);

                // Guardar en cache
                await CacheRepository.setFileSummary(
                    username, repoName, file.path,
                    contentRes.sha,
                    codeSnippet.substring(0, 500),
                    codeSnippet
                );

                // Encolar para procesamiento IA
                if (this.workerPool.totalQueued < 200) {
                    this.workerPool.enqueue(repoName, file.path, codeSnippet, contentRes.sha);
                }

                this.coordinator.markCompleted(repoName, file.path, codeSnippet.substring(0, 100));
                return { path: file.path, snippet: codeSnippet };
            }
            return null;
        }));
    }

    /**
     * Identifica archivos "ancla" relevantes para el análisis
     */
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

    /**
     * Cura los hallazgos para la IA principal
     */
    curateFindings(findings) {
        if (findings.length === 0) return [];

        return findings.map(f => ({
            repo: f.repo,
            error: f.error || null,
            structure: f.techStack ? (f.techStack.length > 0 ? f.techStack.slice(0, 10).join(', ') : "Estructura no accesible") : "N/A",
            auditedSnippets: f.auditedFiles ? (f.auditedFiles.length > 0 ? f.auditedFiles.map(af => ({
                file: af.path,
                content: af.snippet?.substring(0, 300) || '',
                aiSummary: af.aiSummary || null
            })) : "Sin Acceso") : "Error de Lectura"
        }));
    }
}
