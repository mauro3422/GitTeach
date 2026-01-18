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
            const summary = (f.summary || '').toLowerCase();
            const classification = (f.classification || '').toLowerCase();
            const tags = (f.tags || []).map(t => t.toLowerCase());

            // 1. Architecture Signals
            if (
                classification.includes('architecture') ||
                classification.includes('pattern') ||
                summary.includes('class') ||
                summary.includes('module') ||
                summary.includes('structure') ||
                summary.includes('system') ||
                summary.includes('pattern') ||
                tags.some(t => ['solid', 'dry', 'architecture', 'design pattern'].includes(t))
            ) {
                partitions.architecture.push(f);
            }

            // 2. Habits Signals (Broadened for Resilience & Discipline Forensics)
            if (
                classification.includes('style') ||
                classification.includes('quality') ||
                classification.includes('resilience') ||
                classification.includes('discipline') ||
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
                tags.some(t => ['testing', 'formatting', 'lint', 'clean code', 'resilience', 'error handling', 'best practices'].includes(t))
            ) {
                partitions.habits.push(f);
            }

            // 3. Stack Signals
            if (
                classification.includes('tech') ||
                classification.includes('dependency') ||
                summary.includes('uses') ||
                summary.includes('import') ||
                summary.includes('library') ||
                summary.includes('framework') ||
                tags.some(t => ['dependency', 'library', 'framework', 'tool'].includes(t))
            ) {
                partitions.stack.push(f);
            }

            // Fallback: If generic, add to Architecture (usually most relevant for general logic)
            if (partitions.architecture.indexOf(f) === -1 &&
                partitions.habits.indexOf(f) === -1 &&
                partitions.stack.indexOf(f) === -1) {
                partitions.architecture.push(f);
            }
        });

        return partitions;
    }
}
