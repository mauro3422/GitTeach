/**
 * EvidenceStore - Manages evidence accumulation and traceability mapping
 * Extracted from StreamingHandler to comply with SRP
 *
 * SOLID Principles:
 * - S: Only manages evidence storage and traceability
 * - O: Extensible to new evidence types
 * - L: N/A
 * - I: Clean interface for evidence operations
 * - D: No external dependencies
 */

export class EvidenceStore {
    constructor() {
        this.accumulatedFindings = [];
        this.traceabilityMap = {};
        this.evidenceMetadata = {
            totalAccumulated: 0,
            lastUpdate: null,
            sources: new Set()
        };
    }

    /**
     * Add findings to accumulated evidence
     */
    accumulateFindings(findings) {
        if (!findings || findings.length === 0) return;

        // Normalize findings for consistency
        const normalizedFindings = findings.map(f => this.normalizeFinding(f));

        this.accumulatedFindings.push(...normalizedFindings);
        this.evidenceMetadata.totalAccumulated += normalizedFindings.length;
        this.evidenceMetadata.lastUpdate = new Date().toISOString();

        // Track sources
        normalizedFindings.forEach(f => {
            if (f.repo) this.evidenceMetadata.sources.add(f.repo);
        });

        // Update traceability map
        this.updateTraceabilityMap(normalizedFindings);
    }

    /**
     * Normalize a finding object
     */
    normalizeFinding(finding) {
        return {
            file: finding.file || finding.path || 'unknown',
            repo: finding.repo,
            path: finding.path || finding.file,
            summary: finding.summary || 'No summary available',
            uid: finding.uid,
            workerId: finding.workerId,
            classification: finding.classification || 'General',
            file_meta: finding.file_meta || {},
            metadata: finding.metadata || {},
            params: finding.params || {},
            timestamp: finding.timestamp || new Date().toISOString()
        };
    }

    /**
     * Update traceability map with new findings
     */
    updateTraceabilityMap(findings) {
        findings.forEach(finding => {
            const key = `${finding.repo}:${finding.path}`;
            if (!this.traceabilityMap[key]) {
                this.traceabilityMap[key] = {
                    uid: finding.uid,
                    summary: finding.summary,
                    classification: finding.classification,
                    lastUpdated: finding.timestamp
                };
            } else {
                // Update existing entry
                this.traceabilityMap[key].summary = finding.summary;
                this.traceabilityMap[key].lastUpdated = finding.timestamp;
            }
        });
    }

    /**
     * Get all accumulated findings
     */
    getAccumulatedFindings() {
        return [...this.accumulatedFindings];
    }

    /**
     * Get traceability map
     */
    getTraceabilityMap() {
        return { ...this.traceabilityMap };
    }

    /**
     * Get evidence statistics
     */
    getStats() {
        return {
            totalFindings: this.accumulatedFindings.length,
            uniqueSources: this.evidenceMetadata.sources.size,
            lastUpdate: this.evidenceMetadata.lastUpdate,
            traceabilityEntries: Object.keys(this.traceabilityMap).length
        };
    }

    /**
     * Clear all evidence
     */
    clear() {
        this.accumulatedFindings = [];
        this.traceabilityMap = {};
        this.evidenceMetadata = {
            totalAccumulated: 0,
            lastUpdate: null,
            sources: new Set()
        };
    }

    /**
     * Find findings by criteria
     */
    findFindings(criteria) {
        return this.accumulatedFindings.filter(finding => {
            return Object.entries(criteria).every(([key, value]) => finding[key] === value);
        });
    }

    /**
     * Get findings for a specific repository
     */
    getFindingsByRepo(repoName) {
        return this.accumulatedFindings.filter(f => f.repo === repoName);
    }
}
