/**
 * CacheService - Sistema de cache local para datos de GitHub
 * Evita llamadas repetidas a la API y permite análisis instantáneo
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class CacheService {
    constructor() {
        this.cachePath = path.join(app.getPath('userData'), 'repo_cache.json');
        this.cache = this.loadCache();
    }

    loadCache() {
        try {
            if (fs.existsSync(this.cachePath)) {
                return JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
            }
        } catch (e) {
            console.error('[CacheService] Error loading cache:', e);
        }
        return { repos: {}, lastGlobalUpdate: null };
    }

    saveCache() {
        try {
            fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf8');
        } catch (e) {
            console.error('[CacheService] Error saving cache:', e);
        }
    }

    /**
     * Obtiene el cache de un repositorio
     */
    getRepoCache(owner, repo) {
        const key = `${owner}/${repo}`;
        return this.cache.repos[key] || null;
    }

    /**
     * Guarda/actualiza el cache de un repositorio
     */
    setRepoCache(owner, repo, data) {
        const key = `${owner}/${repo}`;
        this.cache.repos[key] = {
            ...data,
            lastUpdated: new Date().toISOString()
        };
        this.saveCache();
    }

    /**
     * Verifica si un archivo necesita actualización comparando SHA
     */
    needsUpdate(owner, repo, filePath, newSha) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache || !repoCache.files) return true;

        const cachedFile = repoCache.files[filePath];
        if (!cachedFile) return true;

        return cachedFile.sha !== newSha;
    }

    /**
     * Guarda el resumen de un archivo
     */
    setFileSummary(owner, repo, filePath, sha, summary, content = null) {
        const key = `${owner}/${repo}`;
        if (!this.cache.repos[key]) {
            this.cache.repos[key] = { files: {}, lastUpdated: null };
        }
        if (!this.cache.repos[key].files) {
            this.cache.repos[key].files = {};
        }

        this.cache.repos[key].files[filePath] = {
            sha: sha,
            summary: summary,
            contentSnippet: content ? content.substring(0, 500) : null,
            analyzedAt: new Date().toISOString()
        };
        this.saveCache();
    }

    /**
     * Obtiene el resumen cacheado de un archivo
     */
    getFileSummary(owner, repo, filePath) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache || !repoCache.files) return null;
        return repoCache.files[filePath] || null;
    }

    /**
     * Guarda el tree SHA del repositorio para detección de cambios
     */
    setRepoTreeSha(owner, repo, treeSha) {
        const key = `${owner}/${repo}`;
        if (!this.cache.repos[key]) {
            this.cache.repos[key] = { files: {} };
        }
        this.cache.repos[key].treeSha = treeSha;
        this.cache.repos[key].lastUpdated = new Date().toISOString();
        this.saveCache();
    }

    /**
     * Verifica si el tree del repo cambió
     */
    hasRepoChanged(owner, repo, newTreeSha) {
        const repoCache = this.getRepoCache(owner, repo);
        if (!repoCache) return true;
        return repoCache.treeSha !== newTreeSha;
    }

    /**
     * Obtiene estadísticas del cache
     */
    getStats() {
        const repos = Object.keys(this.cache.repos);
        let totalFiles = 0;
        repos.forEach(key => {
            if (this.cache.repos[key].files) {
                totalFiles += Object.keys(this.cache.repos[key].files).length;
            }
        });
        return {
            repoCount: repos.length,
            fileCount: totalFiles,
            lastUpdate: this.cache.lastGlobalUpdate
        };
    }

    /**
     * Limpia el cache (para debug/reset)
     */
    clearCache() {
        this.cache = { repos: {}, lastGlobalUpdate: null };
        this.saveCache();
    }
}

module.exports = new CacheService();
