/**
 * InsightsCurator - The "Funnel of Truth" for filtering and ranking insights
 * Extracted from DeepCurator to comply with SRP
 * 
 * Responsibilities:
 * - Filter, deduplicate, and weight insights (Jaccard similarity)
 * - Detect anomalies and integrity issues
 * - Build traceability map linking concepts to source files
 * - Calculate statistics (repo count, top strengths)
 * - Centralize traceability map fusion (DRY)
 */

export class InsightsCurator {
    constructor() {
        // Rarity Tiers - concepts that pass even if duplicated
        this.TIER_S = [
            'ast', 'compiler', 'memory', 'mutex', 'shader', 'gpu',
            'dockerfile', 'protobuf', 'websocket', 'optimization',
            'algorithm', 'security', 'auth', 'oauth', 'ipc'
        ];
    }

    /**
     * "The Funnel of Truth"
     * Filters, deduplicates, and ranks insights.
     * @param {Array} findings - Raw findings from workers
     * @returns {Object} { validInsights, anomalies, stats, traceability_map }
     */
    curate(findings) {
        const validInsights = [];
        const anomalies = [];
        const seenTokens = [];
        const traceability_map = {};

        const stats = {
            repoCount: new Set(findings.map(f => f.repo)).size,
            strengths: {}
        };

        for (const finding of findings) {
            // 1. Anomaly Check
            const insightTextRaw = finding.params?.insight || "";
            if (finding.tool === 'anomaly' ||
                insightTextRaw.includes('INTEGRITY ANOMALY') ||
                insightTextRaw.includes('⚠️')) {
                anomalies.push(finding);
            }

            if (!finding.params || !finding.params.insight) continue;

            // Track Volume for Weighting
            const strength = finding.params.technical_strength || 'General';
            stats.strengths[strength] = (stats.strengths[strength] || 0) + 1;

            const insightText = (finding.params.insight + " " + strength).toLowerCase();
            const tokens = new Set(insightText.split(/\W+/).filter(t => t.length > 3));

            // 2. Echo Detection (Deduplication via Jaccard)
            let isEcho = false;
            const lookback = seenTokens.slice(-50); // Increased from 10 to 50

            for (let i = 0; i < lookback.length; i++) {
                const otherTokens = lookback[i];
                const intersection = new Set([...tokens].filter(x => otherTokens.has(x)));
                const union = new Set([...tokens, ...otherTokens]);
                const jaccard = intersection.size / union.size;

                if (jaccard > 0.65) {
                    isEcho = true;
                    break;
                }
            }

            // Reference Tracking (Enhanced with UIDs for V3 Graph)
            const sourceRef = {
                uid: finding.uid || finding.params?.uid || null,
                repo: finding.repo,
                file: finding.file,
                summary: insightTextRaw
            };

            if (!traceability_map[strength]) traceability_map[strength] = [];

            // Limit refs per strength to avoid massive JSON
            if (traceability_map[strength].length < 15) {
                if (!traceability_map[strength].some(r => r.file === sourceRef.file)) {
                    traceability_map[strength].push(sourceRef);
                }
            }

            if (isEcho) {
                // Increment weight for existing similar insight
                const prev = validInsights.find(v =>
                    v.params.insight.toLowerCase().includes(insightTextRaw.substring(0, 20).toLowerCase())
                );
                if (prev) {
                    prev.weight = (prev.weight || 1) + 1;
                }

                // Allow Tier-S concepts even if duplicated
                const isTierS = this.TIER_S.some(t => insightText.includes(t));
                if (!isTierS) continue;
            }

            finding.weight = 1;
            seenTokens.push(tokens);
            validInsights.push(finding);
        }

        // Finalize stats
        stats.topStrengths = Object.entries(stats.strengths)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        return { validInsights, anomalies, stats, traceability_map };
    }

    /**
     * Format curated insights as text for AI consumption
     * @param {Array} validInsights - Curated insights
     * @returns {string} Formatted text
     */
    formatInsightsAsText(validInsights) {
        // Implementation of Density Cap: Sort by weight and slice top 150
        const significantInsights = [...validInsights]
            .sort((a, b) => (b.weight || 1) - (a.weight || 1))
            .slice(0, 150);

        return significantInsights.map(i => {
            const anomalyPrefix = i.params.insight.includes('INTEGRITY ANOMALY') ? '[⚠️ INTEGRITY ANOMALY] ' : '';
            const weightPrefix = i.weight > 1 ? `[x${i.weight} CONFIRMED] ` : '';
            const uidTag = i.uid ? `[ID:${i.uid}] ` : '';
            return `${uidTag}[${i.repo}/${i.file}]: ${weightPrefix}${anomalyPrefix}${i.params.insight} | Evidence: ${i.params.evidence || 'N/A'} (Strength: ${i.params.technical_strength})`;
        }).join('\n');
    }

    /**
     * Merge multiple traceability maps into a single one
     * @param {Object} targetMap - Map to merge into
     * @param {Object} sourceMap - Map to merge from
     * @returns {Object} The merged map
     */
    mergeTraceabilityMaps(targetMap, sourceMap) {
        if (!sourceMap) return targetMap;

        for (const [key, value] of Object.entries(sourceMap)) {
            if (!targetMap[key]) {
                targetMap[key] = [];
            }
            // Add unique entries (by UID or File)
            if (Array.isArray(value)) {
                value.forEach(sourceRef => {
                    const alreadyExists = targetMap[key].some(r =>
                        (r.uid && r.uid === sourceRef.uid) ||
                        (r.file === sourceRef.file && r.repo === sourceRef.repo && r.summary === sourceRef.summary)
                    );
                    if (!alreadyExists) {
                        targetMap[key].push(sourceRef);
                    }
                });
            }
        }
        return targetMap;
    }
}
