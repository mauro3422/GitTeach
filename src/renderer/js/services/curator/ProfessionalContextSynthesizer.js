/**
 * ProfessionalContextSynthesizer - Synthesizes professional context metrics
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Calculate quality index based on code health metrics
 * - Infer ecosystem profile from tech stack analysis
 * - Analyze collaboration style from patterns
 * - Determine seniority vibe from complexity metrics
 * - Assess code churn patterns
 */

export class ProfessionalContextSynthesizer {
    /**
     * Calculate quality index based on code health and metrics
     * @param {Object} codeHealth - Health metrics from MetricRefinery
     * @param {number} complexityScore - Overall complexity score
     * @returns {string} Quality index (e.g. "High (78%)")
     */
    static synthesizeQualityIndex(codeHealth, complexityScore) {
        if (!codeHealth || typeof complexityScore !== 'number') {
            return "Unknown";
        }

        const logicScore = codeHealth.logic_integrity || 0;
        const knowledgeScore = codeHealth.knowledge_integrity || 0;
        const avgScore = (logicScore + knowledgeScore + complexityScore) / 3;

        if (avgScore >= 80) return `High (${Math.round(avgScore)}%)`;
        if (avgScore >= 60) return `Medium (${Math.round(avgScore)}%)`;
        if (avgScore >= 40) return `Low (${Math.round(avgScore)}%)`;
        return `Critical (${Math.round(avgScore)}%)`;
    }

    /**
     * Infer ecosystem profile from tech stack and frameworks
     * @param {Array} techStack - Array of technologies used
     * @param {Array} frameworks - Array of frameworks detected
     * @returns {string} Ecosystem profile description
     */
    static inferEcosystemProfile(techStack = [], frameworks = []) {
        if (!Array.isArray(techStack) || techStack.length === 0) {
            return "Undefined ecosystem";
        }

        const stack = [...techStack, ...frameworks].map(t => t.toLowerCase());

        // Cloud-native indicators
        if (stack.some(t => t.includes('kubernetes') || t.includes('docker') || t.includes('aws') || t.includes('azure'))) {
            return "Cloud-native development";
        }

        // Modern web stack
        if (stack.some(t => t.includes('react') || t.includes('vue') || t.includes('angular')) &&
            stack.some(t => t.includes('node') || t.includes('typescript'))) {
            return "Modern web development";
        }

        // Data science/ML
        if (stack.some(t => t.includes('python') || t.includes('tensorflow') || t.includes('pytorch'))) {
            return "Data science & ML";
        }

        // Enterprise stack
        if (stack.some(t => t.includes('java') || t.includes('.net') || t.includes('spring'))) {
            return "Enterprise development";
        }

        // Mobile development
        if (stack.some(t => t.includes('swift') || t.includes('kotlin') || t.includes('react native'))) {
            return "Mobile development";
        }

        return "General software development";
    }

    /**
     * Analyze collaboration style from commit and contribution patterns
     * @param {Array} commitPatterns - Commit frequency and patterns
     * @param {number} repoCount - Number of repositories
     * @returns {string} Collaboration style description
     */
    static analyzeCollaborationStyle(commitPatterns = [], repoCount = 0) {
        if (repoCount === 0) return "No collaborative activity detected";

        if (repoCount > 10) return "Highly collaborative - Multiple projects";
        if (repoCount > 5) return "Moderately collaborative - Team player";
        if (repoCount > 1) return "Lightly collaborative - Small teams";

        return "Independent contributor";
    }

    /**
     * Determine seniority vibe from code complexity and patterns
     * @param {number} complexityScore - Code complexity score
     * @param {Array} techStack - Technologies used
     * @param {number} experienceYears - Estimated experience years
     * @returns {string} Seniority assessment
     */
    static determineSeniorityVibe(complexityScore = 0, techStack = [], experienceYears = 0) {
        if (complexityScore >= 80 && techStack.length > 5) {
            return "Senior/Lead developer";
        }
        if (complexityScore >= 60 && techStack.length > 3) {
            return "Mid-level developer";
        }
        if (complexityScore >= 40) {
            return "Junior developer";
        }
        return "Beginner developer";
    }

    /**
     * Assess code churn patterns
     * @param {Array} churnData - Code churn metrics
     * @param {number} totalFiles - Total number of files
     * @returns {string} Code churn assessment
     */
    static assessCodeChurn(churnData = [], totalFiles = 0) {
        if (!Array.isArray(churnData) || churnData.length === 0 || totalFiles === 0) {
            return "No churn data available";
        }

        const avgChurn = churnData.reduce((sum, item) => sum + (item.churn || 0), 0) / churnData.length;
        const churnRate = avgChurn / totalFiles;

        if (churnRate > 0.5) return "High churn - Rapid iteration";
        if (churnRate > 0.2) return "Moderate churn - Active development";
        if (churnRate > 0.05) return "Low churn - Stable codebase";
        return "Very low churn - Mature code";
    }

    /**
     * Get the professional context schema definition
     * @returns {Object} JSON Schema for professional_context
     */
    static getSchema() {
        return {
            type: "object",
            properties: {
                quality_index: { type: "string" },
                ecosystem_profile: { type: "string" },
                collaboration_style: { type: "string" },
                seniority_vibe: { type: "string" },
                code_churn: { type: "string" }
            }
        };
    }
}