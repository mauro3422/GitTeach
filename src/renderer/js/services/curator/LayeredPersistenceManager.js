/**
 * LayeredPersistenceManager - Handles granular metadata storage for the deep curation pipeline.
 * Extends the basic cacheAPI with domain-specific layering.
 */
import { Logger } from '../../utils/logger.js';
import { DebugLogger } from '../../utils/debugLogger.js';

export class LayeredPersistenceManager {
    /**
     * Store a specific metadata layer
     * @param {string} username - GitHub username
     * @param {string} type - 'metrics' | 'theme'
     * @param {string} subType - 'logic' | 'architecture' | 'habits' | etc.
     * @param {any} data - The data to store
     */
    static async storeLayer(username, type, subType, data) {
        const key = `meta:${type}:${subType}:${username}`;
        Logger.info('LayeredPersistence', `Storing layer: ${key}`);

        // 1. Production Persistence (LevelDB)
        if (window.cacheAPI && window.cacheAPI.setTechnicalIdentity) {
            // We reuse setTechnicalIdentity for now or implement a generic put in cacheAPI
            // Since cacheAPI is a fixed set of IPCs, we can encode the sub-key in the 'identity' field
            // if we don't want to change the preload script yet.
            // BETTER: Use a prefix in the username to route it in the main process? 
            // Actually, let's assume we want a clean LevelDB structure.
            await window.cacheAPI.setTechnicalIdentity(`${type}:${subType}:${username}`, data);
        }

        // 2. Debug Observability (Human Readable JSON)
        if (DebugLogger.isActive()) {
            await DebugLogger.logCurator(`theme_${subType}`, data);
        }
    }

    /**
     * Retrieve a specific metadata layer
     */
    static async getLayer(username, type, subType) {
        const key = `${type}:${subType}:${username}`;
        if (window.cacheAPI && window.cacheAPI.getTechnicalIdentity) {
            return await window.cacheAPI.getTechnicalIdentity(key);
        }
        return null;
    }

    /**
     * Store the Master Identity Broker (The "Linked" object)
     */
    static async storeIdentityBroker(username, brokerData) {
        Logger.info('LayeredPersistence', `Storing Identity Broker for ${username}`);

        // Ensure the broker has the correct layer references
        const fullBroker = {
            ...brokerData,
            updatedAt: new Date().toISOString(),
            isLayered: true,
            layers: {
                logic: `meta:metrics:logic:${username}`,
                resilience: `meta:metrics:resilience:${username}`,
                semantic: `meta:metrics:semantic:${username}`,
                architecture: `meta:theme:architecture:${username}`,
                habits: `meta:theme:habits:${username}`,
                stack: `meta:theme:stack:${username}`
            }
        };

        if (window.cacheAPI) {
            await window.cacheAPI.setTechnicalIdentity(username, fullBroker);
        }
    }
}
