/**
 * BlueprintGenerator - Generates technical blueprints for repositories
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Curate findings for blueprint generation
 * - Synthesize repository blueprints from insights
 * - Calculate technical metrics and complexity
 * - Generate structured repository profiles
 */

import { Logger } from '../../utils/logger.js';
import { AIService } from '../aiService.js';
import { AISlotPriorities } from '../ai/AISlotPriorities.js';

export class BlueprintGenerator {
    /**
     * Curate findings specifically for blueprint generation
     * @param {Array} findings - Raw findings from workers
     * @returns {Object} Curated findings structure
     */
    curateFindings(findings) {
        if (!Array.isArray(findings) || findings.length === 0) {
            return { validInsights: [], anomalies: [], stats: { total: 0, valid: 0 } };
        }

        // Filter and validate findings
        const validInsights = findings.filter(f => f && f.summary && f.summary.trim().length > 0);

        // Remove duplicates based on content similarity
        const uniqueInsights = this.deduplicateInsights(validInsights);

        // Calculate basic stats
        const stats = {
            total: findings.length,
            valid: validInsights.length,
            unique: uniqueInsights.length,
            avgLength: uniqueInsights.reduce((sum, f) => sum + (f.summary?.length || 0), 0) / uniqueInsights.length
        };

        // Identify potential anomalies
        const anomalies = this.detectAnomalies(findings, uniqueInsights);

        return {
            validInsights: uniqueInsights,
            anomalies,
            stats
        };
    }

    /**
     * Remove duplicate insights based on content similarity
     * @param {Array} insights - Array of insights
     * @returns {Array} Deduplicated insights
     */
    deduplicateInsights(insights) {
        const unique = [];
        const seen = new Set();

        for (const insight of insights) {
            const key = this.generateInsightKey(insight);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(insight);
            }
        }

        return unique;
    }

    /**
     * Generate a key for insight deduplication
     * @param {Object} insight - Insight object
     * @returns {string} Deduplication key
     */
    generateInsightKey(insight) {
        // Create a simplified key based on content
        const summary = insight.summary?.substring(0, 50)?.toLowerCase() || '';
        const file = insight.file || insight.path || '';
        return `${summary}_${file}`.replace(/\s+/g, '_');
    }

    /**
     * Detect anomalies in findings
     * @param {Array} rawFindings - Original findings
     * @param {Array} curatedFindings - Curated findings
     * @returns {Array} Detected anomalies
     */
    detectAnomalies(rawFindings, curatedFindings) {
        const anomalies = [];

        const invalidCount = rawFindings.length - curatedFindings.length;
        if (invalidCount > 0) {
            anomalies.push({
                type: 'invalid_findings',
                count: invalidCount,
                description: `${invalidCount} findings were invalid or empty`
            });
        }

        // Check for unusual file patterns
        const files = curatedFindings.map(f => f.file || f.path).filter(Boolean);
        const uniqueFiles = [...new Set(files)];

        if (uniqueFiles.length < curatedFindings.length * 0.5) {
            anomalies.push({
                type: 'file_duplication',
                description: 'Many insights reference the same files'
            });
        }

        return anomalies;
    }

    /**
     * Synthesize a repository blueprint from insights
     * @param {string} repoName - Repository name
     * @param {Array} insights - Curated insights
     * @returns {Promise<Object>} Repository blueprint
     */
    async synthesizeBlueprint(repoName, insights) {
        if (!Array.isArray(insights) || insights.length === 0) {
            Logger.warn('BlueprintGenerator', `No insights available for blueprint synthesis of ${repoName}`);
            return null;
        }

        Logger.info('BlueprintGenerator', `Synthesizing blueprint for ${repoName} with ${insights.length} insights`);

        try {
            // Extract technical elements
            const technicalElements = this.extractTechnicalElements(insights);

            // Calculate metrics
            const metrics = this.calculateBlueprintMetrics(insights, technicalElements);

            // Generate AI insights if needed
            const aiInsights = await this.generateAIInsights(repoName, insights);

            // Build final blueprint
            const blueprint = {
                repoName,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    insightCount: insights.length,
                    streaming: true, // Mark as streaming-generated
                    version: '2.0'
                },
                technical: technicalElements,
                metrics,
                insights: aiInsights,
                volume: {
                    analyzedFiles: insights.length,
                    codeLines: this.estimateCodeVolume(insights),
                    technicalBreadth: technicalElements.technologies.length
                }
            };

            Logger.info('BlueprintGenerator', `Blueprint synthesized for ${repoName}: ${metrics.complexity} complexity`);
            return blueprint;

        } catch (error) {
            Logger.error('BlueprintGenerator', `Failed to synthesize blueprint for ${repoName}: ${error.message}`);
            return null;
        }
    }

    /**
     * Extract technical elements from insights
     * @param {Array} insights - Curated insights
     * @returns {Object} Technical elements
     */
    extractTechnicalElements(insights) {
        const technologies = new Set();
        const patterns = new Set();
        const architectures = new Set();
        const languages = new Set();

        // Analyze each insight for technical content
        insights.forEach(insight => {
            const content = `${insight.summary} ${insight.details || ''}`.toLowerCase();

            // Extract technologies (simplified pattern matching)
            const techPatterns = [
                /\b(react|vue|angular|svelte|next|nuxt|astro)\b/g,
                /\b(node|python|javascript|typescript|java|c\+\+|go|rust)\b/g,
                /\b(docker|kubernetes|aws|vercel|supabase|prisma)\b/g,
                /\b(jest|vitest|cypress|playwright|testing)\b/g
            ];

            techPatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                    matches.forEach(match => technologies.add(match));
                }
            });

            // Extract patterns
            if (content.includes('component') || content.includes('hook')) patterns.add('Component-based');
            if (content.includes('async') || content.includes('promise')) patterns.add('Asynchronous');
            if (content.includes('test') || content.includes('spec')) patterns.add('Test-driven');
            if (content.includes('api') || content.includes('endpoint')) patterns.add('API-first');

            // Extract architectures
            if (content.includes('microservice') || content.includes('service')) architectures.add('Microservices');
            if (content.includes('monolith')) architectures.add('Monolithic');
            if (content.includes('serverless')) architectures.add('Serverless');
            if (content.includes('spa') || content.includes('single page')) architectures.add('SPA');

            // Extract languages from file extensions or content
            if (insight.file) {
                const fileExt = insight.file.split('.').pop()?.toLowerCase();
                if (['js', 'jsx', 'ts', 'tsx'].includes(fileExt)) languages.add('JavaScript/TypeScript');
                if (['py'].includes(fileExt)) languages.add('Python');
                if (['java'].includes(fileExt)) languages.add('Java');
                if (['cpp', 'cc', 'cxx'].includes(fileExt)) languages.add('C++');
            }
        });

        return {
            technologies: Array.from(technologies),
            patterns: Array.from(patterns),
            architectures: Array.from(architectures),
            languages: Array.from(languages),
            confidence: this.calculateConfidence(insights.length, technologies.size)
        };
    }

    /**
     * Calculate blueprint metrics
     * @param {Array} insights - Insights
     * @param {Object} technicalElements - Technical elements
     * @returns {Object} Calculated metrics
     */
    calculateBlueprintMetrics(insights, technicalElements) {
        const insightCount = insights.length;
        const techCount = technicalElements.technologies.length;

        // Complexity based on technical breadth and insight volume
        let complexity = 'Low';
        if (techCount > 5 && insightCount > 20) complexity = 'High';
        else if (techCount > 3 && insightCount > 10) complexity = 'Medium';

        // Maturity based on patterns and architectures
        let maturity = 'Early';
        if (technicalElements.patterns.includes('Test-driven')) maturity = 'Mature';
        else if (technicalElements.architectures.length > 0) maturity = 'Intermediate';

        // Quality score (simplified)
        const qualityScore = Math.min(100, (techCount * 10) + (insightCount * 2));

        return {
            complexity,
            maturity,
            qualityScore,
            technicalBreadth: techCount,
            insightDensity: insightCount,
            patterns: technicalElements.patterns.length,
            architectures: technicalElements.architectures.length
        };
    }

    /**
     * Generate AI insights for the blueprint
     * @param {string} repoName - Repository name
     * @param {Array} insights - Curated insights
     * @returns {Promise<Object>} AI-generated insights
     */
    async generateAIInsights(repoName, insights) {
        if (insights.length < 3) {
            return { summary: 'Limited insights available', recommendations: [] };
        }

        try {
            const prompt = `Analyze this repository (${repoName}) based on ${insights.length} technical insights:

${insights.slice(0, 5).map(i => `- ${i.summary}`).join('\n')}

Provide a brief technical summary and 2-3 key recommendations.`;

            const response = await AIService.callAI(
                "You are a technical repository analyzer.",
                prompt,
                0.3,
                null,
                null,
                AISlotPriorities.BACKGROUND
            );

            return {
                summary: response.substring(0, 200),
                recommendations: this.extractRecommendations(response),
                generated: true
            };

        } catch (error) {
            Logger.warn('BlueprintGenerator', `AI insights failed for ${repoName}: ${error.message}`);
            return {
                summary: 'Analysis completed with limited AI insights',
                recommendations: ['Consider adding more documentation'],
                generated: false
            };
        }
    }

    /**
     * Extract recommendations from AI response
     * @param {string} response - AI response
     * @returns {Array} Extracted recommendations
     */
    extractRecommendations(response) {
        const recommendations = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.toLowerCase().includes('recommend') ||
                line.toLowerCase().includes('suggest') ||
                line.toLowerCase().includes('consider') ||
                line.match(/^\d+\./) || // Numbered lists
                line.match(/^[•\-*]/)) { // Bullet points
                const clean = line.replace(/^[•\-*\d+\.\s]*/, '').trim();
                if (clean.length > 10 && clean.length < 100) {
                    recommendations.push(clean);
                }
            }
        }

        return recommendations.slice(0, 3); // Max 3 recommendations
    }

    /**
     * Estimate code volume from insights
     * @param {Array} insights - Insights
     * @returns {number} Estimated lines of code
     */
    estimateCodeVolume(insights) {
        // Rough estimation based on insight count and content
        const avgLinesPerInsight = 50; // Assumption
        return insights.length * avgLinesPerInsight;
    }

    /**
     * Calculate confidence score
     * @param {number} insightCount - Number of insights
     * @param {number} techCount - Number of technologies detected
     * @returns {number} Confidence score (0-1)
     */
    calculateConfidence(insightCount, techCount) {
        const insightConfidence = Math.min(1, insightCount / 10);
        const techConfidence = Math.min(1, techCount / 5);
        return (insightConfidence + techConfidence) / 2;
    }
}