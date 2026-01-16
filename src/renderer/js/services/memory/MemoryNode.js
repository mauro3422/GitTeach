/**
 * MemoryNode - Granular unit of technical memory
 * Represents a single finding with weights and interconnectivity.
 */
export class MemoryNode {
    constructor(data = {}) {
        this.uid = data.uid || this._generateUID(data);
        this.timestamp = data.timestamp || new Date().toISOString();

        // Context
        this.repo = data.repo || 'unknown';
        this.path = data.path || 'unknown';

        // Content
        // Content
        this.insight = data.insight || data.summary || '';
        this.evidence = data.evidence || '';
        this.classification = data.classification || 'General';

        // Weights (The "Soul" of V3)
        this.confidence = data.confidence || 0.5; // 0.0 to 1.0
        this.complexity = data.complexity || 1;   // 1 to 5

        // Interconnectivity
        this.links = data.links || []; // Array of UIDs
        this.metadata = data.metadata || {};

        // V3 Vector Data
        this.embedding = data.embedding || null;
        this.vectorStatus = data.vectorStatus || 'pending'; // pending, ready, failed
    }

    /**
     * Generate a deterministic UID based on content
     * @private
     */
    _generateUID(data) {
        const text = data.insight || data.summary || '';
        const seed = `${data.repo}:${data.path}:${text.substring(0, 20)}`;
        // Browser/Node compatible base64
        const base64 = typeof btoa !== 'undefined'
            ? btoa(seed)
            : Buffer.from(seed).toString('base64');

        return 'mem_' + base64.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toLowerCase();
    }

    /**
     * Add a link to another memory node
     * @param {string} targetUid 
     */
    addLink(targetUid) {
        if (!this.links.includes(targetUid)) {
            this.links.push(targetUid);
        }
    }

    toJSON() {
        return {
            uid: this.uid,
            timestamp: this.timestamp,
            repo: this.repo,
            path: this.path,
            insight: this.insight,
            evidence: this.evidence,
            classification: this.classification,
            confidence: this.confidence,
            complexity: this.complexity,
            links: this.links,
            metadata: this.metadata
        };
    }
}
