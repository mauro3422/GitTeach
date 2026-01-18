/**
 * GlobalIdentityRefiner - Refines and evolves global developer identity
 * Extracted from DeepCurator to comply with SRP
 *
 * Responsibilities:
 * - Update global identity from repository blueprints
 * - Calculate evolution metrics and trends
 * - Merge insights from multiple repositories
 * - Track identity evolution over time
 */

import { Logger } from '../../utils/logger.js';
import { CacheRepository } from '../../utils/cacheRepository.js';
import { EvolutionManager } from '../intelligence/EvolutionManager.js';

export class GlobalIdentityRefiner {
    /**
     * Refine global identity using repository blueprints
     * @param {string} username - GitHub username
     * @param {Object} context - Context with thematic analyses and stats
     * @returns {Promise<Object>} Refined global identity
     */
    async refineGlobalIdentity(username, context = {}) {
        Logger.info('GlobalIdentityRefiner', `Refining global identity for ${username}`);

        try {
            // Get all repository blueprints
            const allBlueprints = await CacheRepository.getAllRepoBlueprints();

            if (allBlueprints.length === 0) {
                Logger.warn('GlobalIdentityRefiner', 'No blueprints available for identity refinement');
                return null;
            }

            // Merge insights from all blueprints
            const mergedInsights = this.mergeBlueprintInsights(allBlueprints);

            // Get current identity
            const currentIdentity = await CacheRepository.getTechnicalIdentity(username);

            // Calculate evolution
            const evolution = await this.calculateIdentityEvolution(currentIdentity, mergedInsights);

            // Update identity if significant evolution detected
            if (evolution.isSignificant) {
                const updatedIdentity = await this.applyEvolutionToIdentity(currentIdentity, evolution);
                await CacheRepository.setTechnicalIdentity(username, updatedIdentity);

                Logger.success('GlobalIdentityRefiner', `Identity evolved: ${evolution.evolutionSummary}`);
                return updatedIdentity;
            } else {
                Logger.info('GlobalIdentityRefiner', 'No significant identity evolution detected');
                return currentIdentity;
            }

        } catch (error) {
            Logger.error('GlobalIdentityRefiner', `Identity refinement failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Merge insights from multiple repository blueprints
     * @param {Array} blueprints - Array of repository blueprints
     * @returns {Object} Merged insights
     */
    mergeBlueprintInsights(blueprints) {
        const merged = {
            technologies: new Map(),
            patterns: new Map(),
            architectures: new Map(),
            languages: new Map(),
            complexity: [],
            maturity: [],
            qualityScores: [],
            totalInsights: 0,
            totalFiles: 0,
            repositories: blueprints.length,
            // NEW: Store thematic data from real mappers
            thematicData: {
                architectureInsights: [],
                habitsInsights: [],
                stackInsights: []
            }
        };

        blueprints.forEach(blueprint => {
            // FIXED: Accept blueprints with either old schema (technical) or new schema (thematicAnalysis)
            const hasOldSchema = blueprint.technical && blueprint.metrics;
            const hasNewSchema = blueprint.thematicAnalysis || blueprint.metrics;

            if (!hasOldSchema && !hasNewSchema) return;

            // NEW SCHEMA: Extract from thematicAnalysis (Real Mapper Data)
            const thematic = blueprint.thematicAnalysis;
            if (thematic) {
                // Architecture mapper results
                if (thematic.architecture?.analysis) {
                    merged.thematicData.architectureInsights.push(thematic.architecture.analysis);
                    // Extract patterns from architecture
                    thematic.architecture.analysis.patterns?.forEach(p => {
                        merged.patterns.set(p, (merged.patterns.get(p) || 0) + 1);
                    });
                    thematic.architecture.analysis.architectures?.forEach(a => {
                        merged.architectures.set(a, (merged.architectures.get(a) || 0) + 1);
                    });
                }

                // Habits mapper results
                if (thematic.habits?.analysis) {
                    merged.thematicData.habitsInsights.push(thematic.habits.analysis);
                }

                // Stack mapper results
                if (thematic.stack?.analysis) {
                    merged.thematicData.stackInsights.push(thematic.stack.analysis);
                    // Extract technologies from stack
                    thematic.stack.analysis.technologies?.forEach(tech => {
                        merged.technologies.set(tech, (merged.technologies.get(tech) || 0) + 1);
                    });
                    thematic.stack.analysis.languages?.forEach(lang => {
                        merged.languages.set(lang, (merged.languages.get(lang) || 0) + 1);
                    });
                }
            }

            // OLD SCHEMA (Fallback): Extract from blueprint.technical
            if (blueprint.technical) {
                blueprint.technical.technologies?.forEach(tech => {
                    merged.technologies.set(tech, (merged.technologies.get(tech) || 0) + 1);
                });
                blueprint.technical.patterns?.forEach(pattern => {
                    merged.patterns.set(pattern, (merged.patterns.get(pattern) || 0) + 1);
                });
                blueprint.technical.architectures?.forEach(arch => {
                    merged.architectures.set(arch, (merged.architectures.get(arch) || 0) + 1);
                });
                blueprint.technical.languages?.forEach(lang => {
                    merged.languages.set(lang, (merged.languages.get(lang) || 0) + 1);
                });
            }

            // Collect metrics (works with both schemas)
            if (blueprint.metrics?.complexity) merged.complexity.push(blueprint.metrics.complexity);
            if (blueprint.metrics?.maturity) merged.maturity.push(blueprint.metrics.maturity);
            if (blueprint.metrics?.qualityScore) merged.qualityScores.push(blueprint.metrics.qualityScore);

            // NEW: Extract from logic/knowledge health if available
            if (blueprint.metrics?.logic?.overall) merged.qualityScores.push(blueprint.metrics.logic.overall);

            // Sum totals
            merged.totalInsights += blueprint.metadata?.insightCount || 0;
            merged.totalFiles += blueprint.volume?.analyzedFiles || 0;
        });

        // Convert maps to sorted arrays by frequency
        return {
            technologies: this.sortByFrequency(merged.technologies),
            patterns: this.sortByFrequency(merged.patterns),
            architectures: this.sortByFrequency(merged.architectures),
            languages: this.sortByFrequency(merged.languages),
            avgComplexity: this.calculateAverageComplexity(merged.complexity),
            avgMaturity: this.calculateAverageMaturity(merged.maturity),
            avgQualityScore: merged.qualityScores.length > 0 ?
                merged.qualityScores.reduce((a, b) => a + b, 0) / merged.qualityScores.length : 0,
            totalInsights: merged.totalInsights,
            totalFiles: merged.totalFiles,
            repositories: merged.repositories
        };
    }

    /**
     * Sort map entries by frequency
     * @param {Map} map - Map with frequency values
     * @returns {Array} Sorted array of [key, frequency] pairs
     */
    sortByFrequency(map) {
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([item, frequency]) => ({ item, frequency }));
    }

    /**
     * Calculate average complexity from complexity strings
     * @param {Array} complexities - Array of complexity strings
     * @returns {string} Average complexity
     */
    calculateAverageComplexity(complexities) {
        if (complexities.length === 0) return 'Unknown';

        const complexityValues = { 'Low': 1, 'Medium': 2, 'High': 3 };
        const numericValues = complexities.map(c => complexityValues[c] || 1);
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

        if (avg >= 2.5) return 'High';
        if (avg >= 1.5) return 'Medium';
        return 'Low';
    }

    /**
     * Calculate average maturity from maturity strings
     * @param {Array} maturities - Array of maturity strings
     * @returns {string} Average maturity
     */
    calculateAverageMaturity(maturities) {
        if (maturities.length === 0) return 'Early';

        const maturityValues = { 'Early': 1, 'Intermediate': 2, 'Mature': 3 };
        const numericValues = maturities.map(m => maturityValues[m] || 1);
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

        if (avg >= 2.5) return 'Mature';
        if (avg >= 1.5) return 'Intermediate';
        return 'Early';
    }

    /**
     * Calculate identity evolution between old and new insights
     * @param {Object} oldIdentity - Current identity
     * @param {Object} newInsights - New merged insights
     * @returns {Promise<Object>} Evolution analysis
     */
    async calculateIdentityEvolution(oldIdentity, newInsights) {
        try {
            // Use EvolutionManager for sophisticated evolution detection
            const evolution = await EvolutionManager.evolve(oldIdentity, newInsights, {
                repositories: newInsights.repositories,
                totalInsights: newInsights.totalInsights,
                avgComplexity: newInsights.avgComplexity
            });

            return {
                isSignificant: evolution.isSignificant,
                evolutionSummary: evolution.evolutionSummary || 'Minor refinements detected',
                changes: evolution.changes || [],
                confidence: evolution.confidence || 0.5
            };

        } catch (error) {
            Logger.warn('GlobalIdentityRefiner', `Evolution calculation failed: ${error.message}`);

            // Fallback: Simple evolution detection
            return this.simpleEvolutionCheck(oldIdentity, newInsights);
        }
    }

    /**
     * Simple evolution check as fallback
     * @param {Object} oldIdentity - Old identity
     * @param {Object} newInsights - New insights
     * @returns {Object} Simple evolution result
     */
    simpleEvolutionCheck(oldIdentity, newInsights) {
        let changes = [];
        let isSignificant = false;

        // Check technology expansion
        const oldTechCount = oldIdentity?.traits?.length || 0;
        const newTechCount = newInsights.technologies?.length || 0;

        if (newTechCount > oldTechCount) {
            changes.push(`Technology portfolio expanded from ${oldTechCount} to ${newTechCount} technologies`);
            if (newTechCount - oldTechCount >= 3) isSignificant = true;
        }

        // Check repository count increase
        if (newInsights.repositories > 1) {
            changes.push(`Analysis expanded to ${newInsights.repositories} repositories`);
            isSignificant = true;
        }

        return {
            isSignificant,
            evolutionSummary: changes.length > 0 ? changes.join('; ') : 'No significant changes',
            changes,
            confidence: 0.7
        };
    }

    /**
     * Apply evolution changes to identity
     * @param {Object} currentIdentity - Current identity
     * @param {Object} evolution - Evolution analysis
     * @returns {Promise<Object>} Updated identity
     */
    async applyEvolutionToIdentity(currentIdentity, evolution) {
        if (!currentIdentity) {
            // Create new identity from insights
            return this.createIdentityFromInsights(evolution);
        }

        // Update existing identity
        const updatedIdentity = { ...currentIdentity };

        // Update metadata
        updatedIdentity.metadata = {
            ...updatedIdentity.metadata,
            lastRefined: new Date().toISOString(),
            evolutionCount: (updatedIdentity.metadata?.evolutionCount || 0) + 1,
            confidence: evolution.confidence
        };

        // Update evolution history
        if (!updatedIdentity.evolution) updatedIdentity.evolution = [];
        updatedIdentity.evolution.push({
            timestamp: new Date().toISOString(),
            changes: evolution.changes,
            summary: evolution.evolutionSummary
        });

        // Keep only last 10 evolutions
        if (updatedIdentity.evolution.length > 10) {
            updatedIdentity.evolution = updatedIdentity.evolution.slice(-10);
        }

        Logger.info('GlobalIdentityRefiner', `Identity updated with ${evolution.changes.length} changes`);
        return updatedIdentity;
    }

    /**
     * Create new identity from insights (for first-time users)
     * @param {Object} evolution - Evolution analysis
     * @returns {Object} New identity
     */
    createIdentityFromInsights(evolution) {
        return {
            version: '2.0',
            created: new Date().toISOString(),
            metadata: {
                lastRefined: new Date().toISOString(),
                evolutionCount: 1,
                confidence: evolution.confidence
            },
            evolution: [{
                timestamp: new Date().toISOString(),
                changes: evolution.changes,
                summary: evolution.evolutionSummary
            }],
            traits: [],
            distinctions: [],
            verdict: 'Analysis in progress'
        };
    }

    /**
     * Get identity evolution statistics
     * @param {string} username - GitHub username
     * @returns {Promise<Object>} Evolution statistics
     */
    async getEvolutionStats(username) {
        try {
            const identity = await CacheRepository.getTechnicalIdentity(username);
            const blueprints = await CacheRepository.getAllRepoBlueprints();

            if (!identity) {
                return {
                    hasIdentity: false,
                    evolutionCount: 0,
                    repositoryCount: blueprints.length,
                    lastUpdate: null
                };
            }

            return {
                hasIdentity: true,
                evolutionCount: identity.metadata?.evolutionCount || 0,
                repositoryCount: blueprints.length,
                lastUpdate: identity.metadata?.lastRefined || null,
                confidence: identity.metadata?.confidence || 0,
                evolutionHistory: identity.evolution || []
            };

        } catch (error) {
            Logger.error('GlobalIdentityRefiner', `Failed to get evolution stats: ${error.message}`);
            return {
                hasIdentity: false,
                evolutionCount: 0,
                repositoryCount: 0,
                lastUpdate: null,
                error: error.message
            };
        }
    }

    /**
     * Reset identity evolution (for testing/debugging)
     * @param {string} username - GitHub username
     * @returns {Promise<boolean>} Success status
     */
    async resetEvolution(username) {
        try {
            await CacheRepository.setTechnicalIdentity(username, null);
            Logger.info('GlobalIdentityRefiner', `Evolution reset for ${username}`);
            return true;
        } catch (error) {
            Logger.error('GlobalIdentityRefiner', `Failed to reset evolution: ${error.message}`);
            return false;
        }
    }
}