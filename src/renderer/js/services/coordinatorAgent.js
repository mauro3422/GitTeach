/**
 * CoordinatorAgent - Orquesta los workers y verifica completitud del análisis
 * Mantiene inventario de repos/archivos y asigna tareas a workers
 * UPDATED: Usa Logger centralizado
 */
import { Logger } from '../utils/logger.js';

export class CoordinatorAgent {
    constructor() {
        this.inventory = {
            repos: [],
            totalFiles: 0,
            analyzedFiles: 0,
            pendingFiles: [],
            completedFiles: [],
            failedFiles: []
        };
        this.onProgress = null;
        this.workerCount = 4; // Workers paralelos
    }

    /**
     * Inicializa el inventario con la lista de repos
     */
    initInventory(repos) {
        this.inventory.repos = repos.map(r => ({
            name: r.name,
            fullName: r.full_name,
            language: r.language,
            files: [],
            status: 'pending',
            treeSha: null
        }));
        this.report('Inventario inicializado', `${repos.length} repos detectados`);
    }

    /**
     * Registra los archivos de un repo
     */
    registerRepoFiles(repoName, tree, treeSha) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        repo.treeSha = treeSha;
        repo.files = tree.map(node => ({
            path: node.path,
            sha: node.sha,
            size: node.size,
            type: node.type,
            status: 'pending',
            priority: this.calculatePriority(node.path)
        }));

        // Ordenar por prioridad (archivos importantes primero)
        repo.files.sort((a, b) => b.priority - a.priority);

        this.inventory.totalFiles += repo.files.filter(f => f.type === 'blob').length;
        this.report('Repo escaneado', `${repoName}: ${repo.files.length} archivos`);
    }

    /**
     * Calcula prioridad de un archivo (mayor = más importante)
     */
    calculatePriority(filePath) {
        const lowerPath = filePath.toLowerCase();

        // Archivos de alta prioridad
        if (lowerPath.includes('readme')) return 100;
        if (lowerPath.includes('package.json')) return 95;
        if (lowerPath.includes('cargo.toml')) return 95;
        if (lowerPath.includes('requirements.txt')) return 95;
        if (lowerPath.includes('go.mod')) return 95;
        if (lowerPath.includes('main.')) return 90;
        if (lowerPath.includes('index.')) return 90;
        if (lowerPath.includes('app.')) return 85;
        if (lowerPath.includes('changelog')) return 80;
        if (lowerPath.includes('config')) return 75;

        // Archivos de código
        if (lowerPath.endsWith('.py')) return 60;
        if (lowerPath.endsWith('.js')) return 60;
        if (lowerPath.endsWith('.ts')) return 60;
        if (lowerPath.endsWith('.cpp') || lowerPath.endsWith('.c')) return 60;
        if (lowerPath.endsWith('.rs')) return 60;
        if (lowerPath.endsWith('.go')) return 60;

        // Documentación
        if (lowerPath.endsWith('.md')) return 50;

        // Configuración
        if (lowerPath.endsWith('.json')) return 40;
        if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 40;

        // Menor prioridad
        if (lowerPath.includes('node_modules')) return 0;
        if (lowerPath.includes('.lock')) return 5;
        if (lowerPath.includes('dist/')) return 5;

        return 30; // Default
    }

    /**
     * Obtiene los próximos archivos a procesar para un worker
     */
    getNextBatch(batchSize = 5, ignorePriority = false) {
        const batch = [];

        for (const repo of this.inventory.repos) {
            const pendingFiles = repo.files.filter(f =>
                f.status === 'pending' &&
                f.type === 'blob' &&
                (ignorePriority || f.priority > 10)
            );

            for (const file of pendingFiles) {
                if (batch.length >= batchSize) break;
                file.status = 'processing';
                batch.push({
                    repo: repo.name,
                    path: file.path,
                    sha: file.sha,
                    priority: file.priority
                });
            }
            if (batch.length >= batchSize) break;
        }

        return batch;
    }

    /**
     * Marca un archivo como completado
     */
    markCompleted(repoName, filePath, summary) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'completed';
            file.summary = summary;
            this.inventory.analyzedFiles++;
            this.inventory.completedFiles.push({ repo: repoName, path: filePath });
        }

        // Reportar progreso
        const progress = this.inventory.totalFiles > 0
            ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
            : 0;

        this.report('Progreso', `Analizando... ${this.inventory.analyzedFiles}/${this.inventory.totalFiles}`, { percent: progress });
    }

    /**
     * Marca un archivo como fallido
     */
    markFailed(repoName, filePath, error) {
        const repo = this.inventory.repos.find(r => r.name === repoName);
        if (!repo) return;

        const file = repo.files.find(f => f.path === filePath);
        if (file) {
            file.status = 'failed';
            file.error = error;
            this.inventory.failedFiles.push({ repo: repoName, path: filePath, error });
            this.inventory.analyzedFiles++;
            // Reportar progreso también en fallo para que la barra no se congele
            const progress = this.inventory.totalFiles > 0
                ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
                : 0;

            this.report('Progreso', `Analizando... ${this.inventory.analyzedFiles}/${this.inventory.totalFiles}`, { percent: progress });
        }
    }

    /**
     * Obtiene resúmenes filtrados para el chat (Top 10 por repo para ahorrar contexto)
     */
    getSummaryForChat() {
        return this.getSummaryByFilter({ limitPerRepo: 10, minPriority: 60 });
    }

    /**
     * Obtiene el 100% de los resúmenes de los workers (Sin filtros)
     * Usado para la Curación Profunda (Map-Reduce) en segundo plano.
     */
    getAllSummaries() {
        return this.getSummaryByFilter({ limitPerRepo: 9999, minPriority: 0 });
    }

    /**
     * Motor genérico de extracción de resúmenes.
     */
    getSummaryByFilter({ limitPerRepo, minPriority }) {
        const summaries = [];
        for (const repo of this.inventory.repos) {
            const completed = repo.files.filter(f =>
                f.status === 'completed' &&
                f.summary &&
                f.priority >= minPriority
            );

            if (completed.length > 0) {
                const sorted = [...completed].sort((a, b) => b.priority - a.priority);
                summaries.push(`--- REPO: ${repo.name} ---`);
                const topFiles = sorted.slice(0, limitPerRepo);
                topFiles.forEach(f => {
                    summaries.push(`[${f.path}]: ${f.summary}`);
                });
            }
        }
        return summaries.join('\n');
    }

    /**
     * Verifica si todo el inventario fue procesado
     */
    isComplete() {
        return this.inventory.analyzedFiles >= this.inventory.totalFiles;
    }

    /**
     * Reporta estado (para logging/UI)
     */
    report(type, message, extra = {}) {
        const log = `[Coordinator] ${type}: ${message}`;
        console.log(log);
        if (this.onProgress) {
            this.onProgress({ type, message, ...extra });
        }
        // Solo loguear en terminal si NO es update de progreso para evitar spam
        if (type !== 'Progreso') {
            Logger.info('Coordinator', `${type}: ${message}`);
        }
    }

    /**
     * Obtiene estadísticas actuales
     */
    getStats() {
        return {
            repos: this.inventory.repos.length,
            totalFiles: this.inventory.totalFiles,
            analyzed: this.inventory.analyzedFiles,
            pending: this.inventory.totalFiles - this.inventory.analyzedFiles,
            progress: this.inventory.totalFiles > 0
                ? Math.round((this.inventory.analyzedFiles / this.inventory.totalFiles) * 100)
                : 0
        };
    }
}
