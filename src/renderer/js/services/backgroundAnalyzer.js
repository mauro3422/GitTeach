/**
 * BackgroundAnalyzer - Análisis en segundo plano
 * Extraído de ProfileAnalyzer para cumplir SRP
 * UPDATED: Usa Logger y CacheRepository centralizados
 */
import { AIService } from './aiService.js';
import { DeepCurator } from './deepCurator.js';
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';

export class BackgroundAnalyzer {
    constructor(coordinator, deepCurator = null) {
        this.coordinator = coordinator;
        this.deepCurator = deepCurator || new DeepCurator();
    }

    /**
     * Análisis en segundo plano - sigue aprendiendo mientras el usuario trabaja
     * Retorna Promise para que tests puedan esperarlo
     */
    async startBackgroundAnalysis(username, initialFindings, onStep = null) {
        Logger.background('Iniciando análisis profundo en segundo plano...');

        // Pequeña pausa para no bloquear el render inicial
        await new Promise(r => setTimeout(r, 100));

        // Obtener archivos pendientes del coordinator
        const pendingBatches = [];
        let batch;
        while ((batch = this.coordinator.getNextBatch(20, true)).length > 0) {
            pendingBatches.push(batch);
        }

        if (pendingBatches.length === 0) {
            Logger.success('BACKGROUND', 'Sin archivos pendientes. Cobertura completa.');
            return null;
        }

        // Procesar todas los batches pendientes
        for (const fileBatch of pendingBatches) {
            await Promise.all(fileBatch.map(async (fileInfo) => {
                try {
                    // Verificar cache
                    const cached = await CacheRepository.getFileSummary(username, fileInfo.repo, fileInfo.path);
                    if (cached) {
                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, cached.summary);
                        return;
                    }

                    // Descargar archivo
                    const contentRes = await window.githubAPI.getFileContent(username, fileInfo.repo, fileInfo.path);
                    if (contentRes && contentRes.content) {
                        const rawContent = atob(contentRes.content.replace(/\n/g, ''));
                        const snippet = rawContent.substring(0, 2000);

                        // HIGH FIDELITY ANALYSIS
                        let aiSummary = `Code in ${fileInfo.repo}`;
                        try {
                            aiSummary = await this.deepCurator.generateHighFidelitySummary(fileInfo.repo, fileInfo.path, snippet);
                        } catch (err) {
                            console.warn("AI Fidelity Error:", err);
                        }

                        // Guardar en cache con el resumen REAL
                        await CacheRepository.setFileSummary(
                            username, fileInfo.repo, fileInfo.path,
                            contentRes.sha, aiSummary, snippet
                        );

                        this.coordinator.markCompleted(fileInfo.repo, fileInfo.path, aiSummary);
                    }
                } catch (e) {
                    this.coordinator.markFailed(fileInfo.repo, fileInfo.path, e.message);
                }
            }));

            // Pequeña pausa entre batches para no saturar
            await new Promise(r => setTimeout(r, 50));
        }

        const finalStats = this.coordinator.getStats();
        Logger.success('BACKGROUND', `Análisis completo: ${finalStats.analyzed}/${finalStats.totalFiles} (${finalStats.progress}%)`);
        Logger.dna('Refrescando memoria del Director de Arte con conocimiento profundo...');

        // Deep Curation (Map-Reduce)
        Logger.dna(`Iniciando Deep Curation (Map-Reduce) de ${finalStats.totalFiles} archivos...`);

        const deepMemory = await this.deepCurator.runDeepCurator(username, this.coordinator);

        // Persistencia: Guardar el nuevo ADN en el cache
        const saved = await CacheRepository.setDeveloperDNA(username, deepMemory);
        if (saved) {
            Logger.metabolic(`ADN actualizado y persistido para ${username}.`);
        }

        if (onStep) {
            onStep({
                type: 'DeepMemoryReady',
                message: '🧠 Memoria profunda sincronizada.',
                data: deepMemory
            });
        }

        return deepMemory;
    }
}
