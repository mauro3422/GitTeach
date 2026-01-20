/**
 * SessionCacheManager - Logic for analysis findings, memory nodes, and blueprints (Session DB).
 */
class SessionCacheManager {
    constructor(sessionDb) {
        this.db = sessionDb;
    }

    /**
     * Appends a raw finding to the session cache.
     * @param {string} repoName
     * @param {Object} finding
     */
    async appendRepoRawFinding(repoName, finding) {
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `raw:finding:${repoName}:${timestamp}:${rand}`;
        await this.db.put(key, finding);
    }

    /**
     * Persists curated memory nodes for a repository.
     * @param {string} repoName
     * @param {Array} nodes
     */
    async persistRepoCuratedMemory(repoName, nodes) {
        const ops = nodes.map(node => ({
            type: 'put',
            key: `mem:node:${node.uid}`,
            value: node
        }));

        const indexKey = `idx:repo:${repoName}:nodes`;
        const existingIndex = (await this.db.get(indexKey)) || [];
        const newUids = nodes.map(n => n.uid);
        const combinedIndex = [...new Set([...existingIndex, ...newUids])];

        ops.push({
            type: 'put',
            key: indexKey,
            value: combinedIndex
        });

        await this.db.batch(ops);
    }

    /**
     * Persists blueprint for a repository.
     * @param {string} repoName
     * @param {Object} blueprint
     */
    async persistRepoBlueprint(repoName, blueprint) {
        await this.db.put(`meta:blueprint:${repoName}`, blueprint);
    }

    /**
     * Gets all repository blueprints.
     * @returns {Promise<Array>} Array of blueprint objects
     */
    async getAllRepoBlueprints() {
        const blueprints = await this.db.getByPrefix('meta:blueprint:');
        return blueprints.map(entry => entry.value);
    }

    /**
     * Sets technical identity for a user.
     * @param {string} user
     * @param {Object} identity
     */
    async setTechnicalIdentity(user, identity) {
        await this.db.put(`meta:identity:${user}`, identity);
    }

    /**
     * Gets technical identity for a user.
     * @param {string} user
     * @returns {Promise<Object|null>}
     */
    async getTechnicalIdentity(user) {
        return await this.db.get(`meta:identity:${user}`);
    }

    /**
     * Sets technical findings for a user.
     * @param {string} user
     * @param {Object} findings
     */
    async setTechnicalFindings(user, findings) {
        await this.db.put(`meta:findings:${user}`, findings);
    }

    /**
     * Gets technical findings for a user.
     * @param {string} user
     * @returns {Promise<Object|null>}
     */
    async getTechnicalFindings(user) {
        return await this.db.get(`meta:findings:${user}`);
    }

    /**
     * Sets cognitive profile for a user.
     * @param {string} user
     * @param {Object} profile
     */
    async setCognitiveProfile(user, profile) {
        await this.db.put(`meta:profile:${user}`, profile);
    }

    /**
     * Gets cognitive profile for a user.
     * @param {string} user
     * @returns {Promise<Object|null>}
     */
    async getCognitiveProfile(user) {
        return await this.db.get(`meta:profile:${user}`);
    }

    /**
     * Sets worker audit finding.
     * @param {string} id
     * @param {Object} finding
     */
    async setWorkerAudit(id, finding) {
        const timestamp = new Date().toISOString();
        const rand = Math.random().toString(36).substring(7);
        const key = `log:worker:${id}:${timestamp}:${rand}`;
        await this.db.put(key, finding);
    }

    /**
     * Gets worker audit findings by ID.
     * @param {string} id
     * @returns {Promise<Array>} Array of audit findings
     */
    async getWorkerAudit(id) {
        return await this.db.getByPrefix(`log:worker:${id}`);
    }

    /**
     * Persists repository partitions.
     * @param {string} repoName
     * @param {Object} partitions
     */
    async persistRepoPartitions(repoName, partitions) {
        await this.db.put(`meta:partitions:${repoName}`, partitions);
    }

    /**
     * Persists repository golden knowledge.
     * @param {string} repoName
     * @param {Object} data
     */
    async persistRepoGoldenKnowledge(repoName, data) {
        await this.db.put(`meta:golden:${repoName}`, data);
    }

    /**
     * Gets repository golden knowledge.
     * @param {string} repoName
     * @returns {Promise<Object|null>}
     */
    async getRepoGoldenKnowledge(repoName) {
        return await this.db.get(`meta:golden:${repoName}`);
    }
}

export { SessionCacheManager };
