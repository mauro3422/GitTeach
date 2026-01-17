/**
 * IdentityCacheManager - Handles technical identity and findings caching
 * Extracted from CacheRepository to comply with SRP
 *
 * Responsibilities:
 * - Technical identity persistence and retrieval
 * - Technical findings (traceability maps) management
 * - Cognitive profile caching
 */
export class IdentityCacheManager {
    /**
     * Checks if cache is available
     */
    isAvailable() {
        return !!window.cacheAPI;
    }

    /**
     * Gets technical identity (deep synthesis) from cache
     * @param {string} username - GitHub username
     * @returns {Promise<Object|null>} Technical identity or null
     */
    async getTechnicalIdentity(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getTechnicalIdentity(username);
        } catch (e) {
            console.warn('[IdentityCacheManager] Error getting technical identity:', e);
            return null;
        }
    }

    /**
     * Saves technical identity (deep synthesis) to cache
     * @param {string} username - GitHub username
     * @param {Object} identity - Technical identity object
     * @returns {Promise<boolean>} Success status
     */
    async setTechnicalIdentity(username, identity) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setTechnicalIdentity(username, identity);
            return true;
        } catch (e) {
            console.warn('[IdentityCacheManager] Error setting technical identity:', e);
            return false;
        }
    }

    /**
     * Gets technical findings (traceability map) from cache
     * @param {string} username - GitHub username
     * @returns {Promise<Object|null>} Technical findings or null
     */
    async getTechnicalFindings(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getTechnicalFindings(username);
        } catch (e) {
            console.warn('[IdentityCacheManager] Error getting technical findings:', e);
            return null;
        }
    }

    /**
     * Saves technical findings (traceability map) to cache
     * @param {string} username - GitHub username
     * @param {Object} findings - Technical findings object
     * @returns {Promise<boolean>} Success status
     */
    async setTechnicalFindings(username, findings) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setTechnicalFindings(username, findings);
            return true;
        } catch (e) {
            console.warn('[IdentityCacheManager] Error setting technical findings:', e);
            return false;
        }
    }

    /**
     * Gets the CognitiveProfile (master user profile) from cache
     * @param {string} username - GitHub username
     * @returns {Promise<Object|null>} Cognitive profile or null
     */
    async getCognitiveProfile(username) {
        if (!this.isAvailable()) return null;
        try {
            return await window.cacheAPI.getCognitiveProfile(username);
        } catch (e) {
            console.warn('[IdentityCacheManager] Error getting CognitiveProfile:', e);
            return null;
        }
    }

    /**
     * Saves the CognitiveProfile (master user profile) to cache
     * @param {string} username - GitHub username
     * @param {Object} profile - Cognitive profile object
     * @returns {Promise<boolean>} Success status
     */
    async setCognitiveProfile(username, profile) {
        if (!this.isAvailable()) return false;
        try {
            await window.cacheAPI.setCognitiveProfile(username, {
                ...profile,
                username,
                lastUpdated: new Date().toISOString()
            });
            console.log('[IdentityCacheManager] Cognitive Profile updated:', profile.title);
            return true;
        } catch (e) {
            console.warn('[IdentityCacheManager] Error setting CognitiveProfile:', e);
            return false;
        }
    }

    /**
     * Checks if technical identity exists for user
     * @param {string} username - GitHub username
     * @returns {Promise<boolean>} True if identity exists
     */
    async hasTechnicalIdentity(username) {
        const identity = await this.getTechnicalIdentity(username);
        return identity !== null;
    }

    /**
     * Checks if technical findings exist for user
     * @param {string} username - GitHub username
     * @returns {Promise<boolean>} True if findings exist
     */
    async hasTechnicalFindings(username) {
        const findings = await this.getTechnicalFindings(username);
        return findings !== null;
    }

    /**
     * Updates technical identity with new data
     * @param {string} username - GitHub username
     * @param {Object} updates - Identity updates
     * @returns {Promise<boolean>} Success status
     */
    async updateTechnicalIdentity(username, updates) {
        const current = await this.getTechnicalIdentity(username);
        if (!current) return false;

        const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
        return await this.setTechnicalIdentity(username, updated);
    }

    /**
     * Merges new findings with existing ones
     * @param {string} username - GitHub username
     * @param {Object} newFindings - New findings to merge
     * @returns {Promise<boolean>} Success status
     */
    async mergeTechnicalFindings(username, newFindings) {
        const current = await this.getTechnicalFindings(username) || {};
        const merged = this.deepMerge(current, newFindings);
        return await this.setTechnicalFindings(username, merged);
    }

    /**
     * Deep merges two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Gets identity cache statistics
     * @param {string} username - GitHub username
     * @returns {Promise<Object>} Identity cache stats
     */
    async getIdentityCacheStats(username) {
        const identity = await this.getTechnicalIdentity(username);
        const findings = await this.getTechnicalFindings(username);
        const profile = await this.getCognitiveProfile(username);

        return {
            hasIdentity: identity !== null,
            hasFindings: findings !== null,
            hasProfile: profile !== null,
            identitySize: identity ? JSON.stringify(identity).length : 0,
            findingsSize: findings ? JSON.stringify(findings).length : 0,
            profileSize: profile ? JSON.stringify(profile).length : 0,
            lastUpdated: identity?.lastUpdated || profile?.lastUpdated || null
        };
    }

    /**
     * Clears all identity data for a user
     * @param {string} username - GitHub username
     * @returns {Promise<boolean>} Success status
     */
    async clearIdentityData(username) {
        let success = true;

        try {
            await window.cacheAPI.setTechnicalIdentity(username, null);
        } catch (e) {
            success = false;
        }

        try {
            await window.cacheAPI.setTechnicalFindings(username, null);
        } catch (e) {
            success = false;
        }

        try {
            await window.cacheAPI.setCognitiveProfile(username, null);
        } catch (e) {
            success = false;
        }

        return success;
    }
}
