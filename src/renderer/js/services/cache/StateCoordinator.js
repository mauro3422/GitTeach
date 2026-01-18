/**
 * StateCoordinator - Unified state and cache management facade
 * Coordinates FileCacheManager, IdentityCacheManager, and RepoCacheManager
 *
 * SOLID Principles:
 * - S: Single responsibility for coordinating cache operations
 * - O: Extensible to new cache managers
 * - L: Can be substituted with different coordination strategies
 * - I: Clean unified interface for state operations
 * - D: Depends on specific cache managers via composition
 */

import { FileCacheManager } from './FileCacheManager.js';
import { IdentityCacheManager } from './IdentityCacheManager.js';
import { RepoCacheManager } from './RepoCacheManager.js';
import { logManager } from '../../utils/logManager.js';

export class StateCoordinator {
    constructor() {
        this.fileCache = new FileCacheManager();
        this.identityCache = new IdentityCacheManager();
        this.repoCache = new RepoCacheManager();

        this.logger = logManager.child({ component: 'StateCoordinator' });
    }

    /**
     * Checks if all cache systems are available
     */
    isCacheAvailable() {
        return this.fileCache.isAvailable() &&
            this.identityCache.isAvailable() &&
            this.repoCache.isAvailable();
    }

    /**
     * Unified cache health check
     */
    async getCacheHealth() {
        return {
            fileCache: this.fileCache.isAvailable(),
            identityCache: this.identityCache.isAvailable(),
            repoCache: this.repoCache.isAvailable(),
            overall: this.isCacheAvailable()
        };
    }

    // === FILE CACHE OPERATIONS ===

    /**
     * Gets file summary from cache
     */
    async getFileSummary(username, repo, path) {
        try {
            const result = await this.fileCache.getFileSummary(username, repo, path);
            if (result) {
                this.logger.debug(`File summary cache hit: ${repo}/${path}`);
            }
            return result;
        } catch (e) {
            this.logger.error(`Error getting file summary: ${e.message}`, { username, repo, path });
            return null;
        }
    }

    /**
     * Saves file summary to cache
     */
    async setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta = {}, durationMs = 0) {
        try {
            const success = await this.fileCache.setFileSummary(username, repo, path, sha, summary, contentSnippet, fileMeta, durationMs);
            if (success) {
                this.logger.debug(`File summary cached: ${repo}/${path}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error setting file summary: ${e.message}`, { username, repo, path });
            return false;
        }
    }

    /**
     * Checks if file needs update
     */
    async needsFileUpdate(username, repo, path, currentSha) {
        try {
            return await this.fileCache.needsUpdate(username, repo, path, currentSha);
        } catch (e) {
            this.logger.warn(`Error checking file update: ${e.message}`, { username, repo, path });
            return true; // Assume needs update if error
        }
    }

    // === IDENTITY CACHE OPERATIONS ===

    /**
     * Gets technical identity
     */
    async getTechnicalIdentity(username) {
        try {
            const identity = await this.identityCache.getTechnicalIdentity(username);
            if (identity) {
                this.logger.debug(`Technical identity loaded for ${username}`);
            }
            return identity;
        } catch (e) {
            this.logger.error(`Error getting technical identity: ${e.message}`, { username });
            return null;
        }
    }

    /**
     * Saves technical identity
     */
    async setTechnicalIdentity(username, identity) {
        try {
            const success = await this.identityCache.setTechnicalIdentity(username, identity);
            if (success) {
                this.logger.info(`Technical identity saved for ${username}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error setting technical identity: ${e.message}`, { username });
            return false;
        }
    }

    /**
     * Gets technical findings
     */
    async getTechnicalFindings(username) {
        try {
            const findings = await this.identityCache.getTechnicalFindings(username);
            if (findings) {
                this.logger.debug(`Technical findings loaded for ${username}`);
            }
            return findings;
        } catch (e) {
            this.logger.error(`Error getting technical findings: ${e.message}`, { username });
            return null;
        }
    }

    /**
     * Gets cognitive profile
     */
    async getCognitiveProfile(username) {
        try {
            const profile = await this.identityCache.getCognitiveProfile(username);
            if (profile) {
                this.logger.debug(`Cognitive profile loaded for ${username}`);
            }
            return profile;
        } catch (e) {
            this.logger.error(`Error getting cognitive profile: ${e.message}`, { username });
            return null;
        }
    }

    /**
     * Saves cognitive profile
     */
    async setCognitiveProfile(username, profile) {
        try {
            const success = await this.identityCache.setCognitiveProfile(username, profile);
            if (success) {
                this.logger.info(`Cognitive profile saved for ${username}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error setting cognitive profile: ${e.message}`, { username });
            return false;
        }
    }

    // === REPO CACHE OPERATIONS ===

    /**
     * Checks if repo has changed
     */
    async hasRepoChanged(username, repo, currentTreeSha) {
        try {
            return await this.repoCache.hasRepoChanged(username, repo, currentTreeSha);
        } catch (e) {
            this.logger.warn(`Error checking repo change: ${e.message}`, { username, repo });
            return true;
        }
    }

    /**
     * Sets repo tree SHA
     */
    async setRepoTreeSha(username, repo, treeSha) {
        try {
            const success = await this.repoCache.setRepoTreeSha(username, repo, treeSha);
            if (success) {
                this.logger.debug(`Repo tree SHA set: ${repo}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error setting repo tree SHA: ${e.message}`, { username, repo });
            return false;
        }
    }

    /**
     * Gets all repo blueprints
     */
    async getAllRepoBlueprints() {
        try {
            const blueprints = await this.repoCache.getAllRepoBlueprints();
            this.logger.debug(`Loaded ${blueprints.length} repo blueprints`);
            return blueprints;
        } catch (e) {
            this.logger.error(`Error getting repo blueprints: ${e.message}`);
            return [];
        }
    }

    /**
     * Persists repo blueprint
     */
    async persistRepoBlueprint(repoName, blueprint) {
        try {
            const success = await this.repoCache.persistRepoBlueprint(repoName, blueprint);
            if (success) {
                this.logger.info(`Repo blueprint persisted: ${repoName}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error persisting repo blueprint: ${e.message}`, { repoName });
            return false;
        }
    }

    // === UNIFIED OPERATIONS ===

    /**
     * Gets complete user state
     */
    async getUserState(username) {
        try {
            const [identity, findings, profile, blueprints] = await Promise.all([
                this.getTechnicalIdentity(username),
                this.getTechnicalFindings(username),
                this.getCognitiveProfile(username),
                this.getAllRepoBlueprints()
            ]);

            const state = {
                username,
                identity,
                findings,
                profile,
                blueprints: blueprints.filter(bp => bp.username === username),
                lastUpdated: new Date().toISOString()
            };

            this.logger.info(`Complete user state loaded for ${username}`);
            return state;
        } catch (e) {
            this.logger.error(`Error getting user state: ${e.message}`, { username });
            return null;
        }
    }

    /**
     * Clears all user data
     */
    async clearUserData(username) {
        try {
            const [identityCleared, findingsCleared, profileCleared] = await Promise.all([
                this.identityCache.clearIdentityData(username),
                // Note: repo blueprints are not cleared as they might be shared
                Promise.resolve(true),
                Promise.resolve(true)
            ]);

            const success = identityCleared && findingsCleared && profileCleared;
            if (success) {
                this.logger.info(`All user data cleared for ${username}`);
            }
            return success;
        } catch (e) {
            this.logger.error(`Error clearing user data: ${e.message}`, { username });
            return false;
        }
    }

    /**
     * Gets comprehensive cache statistics
     */
    async getCacheStats(username) {
        try {
            const [identityStats, repoStats] = await Promise.all([
                this.identityCache.getIdentityCacheStats(username),
                this.repoCache.getRepoCacheStats()
            ]);

            const stats = {
                username,
                identity: identityStats,
                repos: repoStats,
                cacheHealth: await this.getCacheHealth(),
                generated: new Date().toISOString()
            };

            this.logger.debug(`Cache stats generated for ${username}`);
            return stats;
        } catch (e) {
            this.logger.error(`Error getting cache stats: ${e.message}`, { username });
            return null;
        }
    }

    /**
     * Optimized cache operations for analysis workflow
     */
    async prepareForAnalysis(username) {
        // Pre-load commonly accessed data
        const [identity, profile] = await Promise.all([
            this.getTechnicalIdentity(username),
            this.getCognitiveProfile(username)
        ]);

        return {
            hasExistingIdentity: !!identity,
            hasExistingProfile: !!profile,
            cacheReady: this.isCacheAvailable()
        };
    }
}

// Singleton instance
export const stateCoordinator = new StateCoordinator();
