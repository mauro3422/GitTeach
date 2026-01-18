/**
 * InsightPartitioner - Utility to divide insights into semantic layers
 * Used by both Repo-Level Curators and Global-Level Mappers
 */
export class InsightPartitioner {
    /**
     * Divides an array of insights into Architecture, Habits, and Stack groups.
     * @param {Array} insights - Array of refined finding objects
     * @returns {Object} { architecture: [], habits: [], stack: [] }
     */
    static partition(insights) {
        const partitions = {
            architecture: [],
            habits: [],
            stack: []
        };

        if (!Array.isArray(insights)) return partitions;

        insights.forEach(f => {
            // SANEAMIENTO DE ESQUEMA (Anti-Legacy Guard)
            if (!f || typeof f !== 'object') return;

            // Normalize fields with robust fallbacks
            const summary = (f.summary || f.params?.insight || '').toLowerCase();
            const classification = (f.classification || f.params?.technical_strength || '').toLowerCase();

            // Handle tags (can be string or array or missing)
            let tags = [];
            if (Array.isArray(f.tags)) tags = f.tags;
            else if (typeof f.tags === 'string') tags = [f.tags];
            else if (f.params?.tags && Array.isArray(f.params.tags)) tags = f.params.tags;

            const normalizedTags = tags.map(t => String(t).toLowerCase());

            // 1. Architecture Signals (Pattern & Structure)
            if (
                classification.includes('architecture') ||
                classification.includes('pattern') ||
                classification.includes('modular') ||
                summary.includes('class') ||
                summary.includes('module') ||
                summary.includes('structure') ||
                summary.includes('system') ||
                summary.includes('pattern') ||
                normalizedTags.some(t => ['solid', 'dry', 'architecture', 'design pattern', 'modular'].includes(t))
            ) {
                partitions.architecture.push(f);
            }

            // 2. Habits Signals (Resilience & Style)
            if (
                classification.includes('style') ||
                classification.includes('quality') ||
                classification.includes('resilience') ||
                classification.includes('discipline') ||
                classification.includes('seniority') ||
                summary.includes('format') ||
                summary.includes('comment') ||
                summary.includes('naming') ||
                summary.includes('practice') ||
                summary.includes('seniority') ||
                summary.includes('trait') ||
                summary.includes('test') ||
                summary.includes('error') ||
                summary.includes('handling') ||
                summary.includes('discipline') ||
                summary.includes('defensive') ||
                summary.includes('clean code') ||
                summary.includes('security') ||
                normalizedTags.some(t => ['testing', 'formatting', 'lint', 'clean code', 'resilience', 'error handling', 'best practices', 'security', 'seniority', 'discipline'].includes(t))
            ) {
                partitions.habits.push(f);
            }

            // 3. Stack Signals (Tools & Deps)
            if (
                classification.includes('tech') ||
                classification.includes('dependency') ||
                classification.includes('stack') ||
                summary.includes('uses') ||
                summary.includes('import') ||
                summary.includes('library') ||
                summary.includes('framework') ||
                normalizedTags.some(t => ['dependency', 'library', 'framework', 'tool', 'stack'].includes(t))
            ) {
                partitions.stack.push(f);
            }

            // Fallback: If generic but has content, add to Architecture
            if (partitions.architecture.indexOf(f) === -1 &&
                partitions.habits.indexOf(f) === -1 &&
                partitions.stack.indexOf(f) === -1 &&
                summary.length > 0) {
                partitions.architecture.push(f);
            }
        });

        return partitions;
    }
}
