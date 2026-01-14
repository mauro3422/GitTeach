/**
 * CacheRepository - Capa de abstracción para operaciones de cache
 * Abstrae las llamadas a window.cacheAPI
 */

class CacheRepositoryService {
    /**
     * Verifica si el cache está disponible
     */
    isAvailable() {
        return !!window.cacheAPI;
    }

    // ==========================================
    // FILE SUMMARIES
    // ==========================================

    /**
     * Obtiene el resumen de un archivo desde cache
     * @returns {Promise<{summary: string, contentSnippet: string}|null>}
     */
    async getFileSummary(username, repo, path) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getFileSummary(username, repo, path);
        } catch (e) {
            console.warn('[CacheRepository] Error getting file summary:', e);
            return null;
        }
    }

    /**
     * Guarda el resumen de un archivo en cache
     */
    async setFileSummary(username, repo, path, sha, summary, contentSnippet) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setFileSummary(username, repo, path, sha, summary, contentSnippet);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting file summary:', e);
            return false;
        }
    }

    /**
     * Verifica si un archivo necesita actualización
     */
    async needsUpdate(username, repo, path, currentSha) {
        if (!this.isAvailable()) return true;
        try {
            return await window.cacheAPI.needsUpdate(username, repo, path, currentSha);
        } catch (e) {
            return true; // Asumir que necesita update si hay error
        }
    }

    // ==========================================
    // REPOSITORY TREE
    // ==========================================

    /**
     * Verifica si el árbol del repo cambió
     */
    async hasRepoChanged(username, repo, currentTreeSha) {
        if (!this.isAvailable()) return true;
        try {
            return await window.cacheAPI.hasRepoChanged(username, repo, currentTreeSha);
        } catch (e) {
            return true;
        }
    }

    /**
     * Guarda el SHA del árbol del repo
     */
    async setRepoTreeSha(username, repo, treeSha) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setRepoTreeSha(username, repo, treeSha);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting tree SHA:', e);
            return false;
        }
    }

    // ==========================================
    // DEVELOPER DNA
    // ==========================================

    /**
     * Obtiene el ADN del desarrollador desde cache
     */
    async getDeveloperDNA(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getDeveloperDNA(username);
        } catch (e) {
            console.warn('[CacheRepository] Error getting developer DNA:', e);
            return null;
        }
    }

    /**
     * Guarda el ADN del desarrollador en cache
     */
    async setDeveloperDNA(username, dna) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setDeveloperDNA(username, dna);
            return true;
        } catch (e) {
            console.warn('[CacheRepository] Error setting developer DNA:', e);
            return false;
        }
    }

    // ==========================================
    // STATS
    // ==========================================

    /**
     * Obtiene estadísticas del cache
     */
    async getStats() {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getStats();
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // CONVENIENCE METHODS
    // ==========================================

    /**
     * Intenta obtener archivo de cache, si no existe lo guarda después del callback
     * @param {Object} params - {username, repo, path, sha}
     * @param {Function} fetchFn - Función async que obtiene el contenido si no está en cache
     * @returns {Promise<{summary: string, content: string, fromCache: boolean}>}
     */
    async getOrFetch(params, fetchFn) {
        const { username, repo, path, sha } = params;

        // Intentar obtener de cache
        const needsUpdate = await this.needsUpdate(username, repo, path, sha);
        if (!needsUpdate) {
            const cached = await this.getFileSummary(username, repo, path);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }

        // Fetch y guardar
        const result = await fetchFn();
        if (result && result.summary) {
            await this.setFileSummary(username, repo, path, sha, result.summary, result.content);
        }

        return { ...result, fromCache: false };
    }
}

// Singleton export
export const CacheRepository = new CacheRepositoryService();
