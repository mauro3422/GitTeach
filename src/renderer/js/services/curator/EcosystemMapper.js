/**
 * EcosystemMapper - Maps tech stack maturity and adoption stages
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Map technology stack to maturity levels
 * - Assess adoption stages (Adopt/Trial/Assess/Hold)
 * - Generate technology radar classifications
 * - Analyze ecosystem health and trends
 */

export class EcosystemMapper {
    /**
     * Map tech stack to maturity levels
     * @param {Array} technologies - Array of technology names
     * @returns {Object} Maturity analysis
     */
    static mapTechStack(technologies = []) {
        if (!Array.isArray(technologies) || technologies.length === 0) {
            return {
                maturity: "Unknown",
                categories: {},
                recommendations: ["Add technology stack information"]
            };
        }

        const maturity = {
            cutting_edge: [],
            mature: [],
            legacy: [],
            experimental: []
        };

        // Define technology maturity buckets
        const techMaturity = {
            // Cutting edge (2023-2024)
            cutting_edge: [
                'bun', 'deno', 'solidjs', 'sveltekit', 'nextjs', 'nuxt', 'astro',
                'vite', 'esbuild', 'swc', 'turbo', 'pnpm', 'bun', 'rome',
                'biome', 'oxc', 'rolldown', 'farm', 'rspack'
            ],
            // Mature (2015-2022)
            mature: [
                'react', 'vue', 'angular', 'svelte', 'typescript', 'webpack',
                'babel', 'eslint', 'prettier', 'jest', 'cypress', 'playwright',
                'docker', 'kubernetes', 'aws', 'vercel', 'netlify', 'supabase',
                'prisma', 'turborepo', 'nx', 'lerna'
            ],
            // Legacy (pre-2015)
            legacy: [
                'jquery', 'backbone', 'angularjs', 'grunt', 'gulp', 'bower',
                'jspm', 'systemjs', 'requirejs', 'browserify'
            ],
            // Experimental/Emerging
            experimental: [
                'qwik', 'marko', 'million', 'redwoodjs', 'blitz', 'remix',
                'hydrogen', 'vike', 'vinxi', 'elysia', 'hono', 'nitro'
            ]
        };

        const normalizedTech = technologies.map(t => t.toLowerCase().trim());

        // Categorize technologies
        Object.entries(techMaturity).forEach(([category, techs]) => {
            techs.forEach(tech => {
                if (normalizedTech.some(t => t.includes(tech) || tech.includes(t))) {
                    maturity[category].push(tech);
                }
            });
        });

        // Calculate overall maturity score
        let maturityScore = 0;
        if (maturity.cutting_edge.length > 0) maturityScore += 40;
        if (maturity.mature.length > 0) maturityScore += 35;
        if (maturity.legacy.length > 0) maturityScore += 15;
        if (maturity.experimental.length > 0) maturityScore += 10;

        let maturityLevel = "Mixed";
        if (maturityScore >= 70) maturityLevel = "Modern";
        else if (maturityScore >= 50) maturityLevel = "Current";
        else if (maturityScore >= 30) maturityLevel = "Transitional";
        else maturityLevel = "Legacy";

        return {
            maturity: maturityLevel,
            score: maturityScore,
            categories: maturity,
            technologies: technologies,
            recommendations: this.generateMaturityRecommendations(maturity)
        };
    }

    /**
     * Assess adoption stages for technologies
     * @param {Array} technologies - Technology names
     * @param {Object} usage - Usage patterns and frequency
     * @returns {Object} Adoption stage analysis
     */
    static assessAdoptionStage(technologies = [], usage = {}) {
        const radar = {
            adopt: [],
            trial: [],
            assess: [],
            hold: []
        };

        if (!Array.isArray(technologies)) return radar;

        const normalizedTech = technologies.map(t => t.toLowerCase());

        // Technology Radar classifications
        const classifications = {
            adopt: [
                'typescript', 'react', 'vue', 'nextjs', 'vercel', 'supabase',
                'prisma', 'tailwind', 'eslint', 'prettier', 'jest', 'playwright',
                'docker', 'github actions', 'vite', 'pnpm'
            ],
            trial: [
                'svelte', 'solidjs', 'astro', 'nuxt', 'qwik', 'turborepo',
                'biome', 'vitest', 'cypress', 'testing library', 'nx', 'changesets'
            ],
            assess: [
                'deno', 'bun', 'rome', 'redwoodjs', 'blitz', 'remix',
                'hydrogen', 'elysia', 'hono', 'million', 'farm', 'rolldown'
            ],
            hold: [
                'jquery', 'angularjs', 'backbone', 'grunt', 'gulp', 'bower',
                'jspm', 'systemjs', 'requirejs', 'browserify', 'coffeescript'
            ]
        };

        // Classify each technology
        normalizedTech.forEach(tech => {
            let classified = false;
            Object.entries(classifications).forEach(([stage, techs]) => {
                if (techs.some(t => tech.includes(t) || t.includes(tech))) {
                    radar[stage].push(tech);
                    classified = true;
                }
            });
            if (!classified) {
                radar.assess.push(tech); // Default to assess for unknown tech
            }
        });

        return radar;
    }

    /**
     * Generate technology radar with recommendations
     * @param {Array} adopt - Technologies to adopt
     * @param {Array} trial - Technologies to trial
     * @param {Array} assess - Technologies to assess
     * @param {Array} hold - Technologies to hold
     * @returns {Object} Technology radar
     */
    static generateTechRadar(adopt = [], trial = [], assess = [], hold = []) {
        return {
            adopt: [...new Set(adopt)],
            trial: [...new Set(trial)],
            assess: [...new Set(assess)],
            hold: [...new Set(hold)],
            summary: {
                total: adopt.length + trial.length + assess.length + hold.length,
                adoptCount: adopt.length,
                trialCount: trial.length,
                assessCount: assess.length,
                holdCount: hold.length
            },
            recommendations: this.generateRadarRecommendations({ adopt, trial, assess, hold })
        };
    }

    /**
     * Analyze ecosystem health and provide insights
     * @param {Array} technologies - Technology stack
     * @param {Object} usage - Usage patterns
     * @returns {Object} Ecosystem health analysis
     */
    static analyzeEcosystemHealth(technologies = [], usage = {}) {
        const analysis = {
            diversity: 0,
            balance: "Unknown",
            risks: [],
            strengths: [],
            recommendations: []
        };

        if (!Array.isArray(technologies) || technologies.length === 0) {
            analysis.risks.push("No technology stack detected");
            analysis.recommendations.push("Define and document technology stack");
            return analysis;
        }

        // Analyze diversity
        const categories = this.categorizeTechnologies(technologies);
        analysis.diversity = Object.keys(categories).length;

        // Analyze balance
        const hasFrontend = categories.frontend?.length > 0;
        const hasBackend = categories.backend?.length > 0;
        const hasDatabase = categories.database?.length > 0;
        const hasDevOps = categories.devops?.length > 0;
        const hasTesting = categories.testing?.length > 0;

        const pillars = [hasFrontend, hasBackend, hasDatabase, hasDevOps, hasTesting];
        const pillarCount = pillars.filter(Boolean).length;

        if (pillarCount >= 4) analysis.balance = "Well-balanced";
        else if (pillarCount >= 2) analysis.balance = "Moderately balanced";
        else analysis.balance = "Unbalanced";

        // Identify risks
        if (!hasTesting) analysis.risks.push("No testing framework detected");
        if (!hasDevOps) analysis.risks.push("No DevOps/CI tools detected");
        if (categories.legacy?.length > technologies.length * 0.5) {
            analysis.risks.push("Heavy reliance on legacy technologies");
        }

        // Identify strengths
        if (hasFrontend && hasBackend) analysis.strengths.push("Full-stack capability");
        if (categories.modern?.length > technologies.length * 0.7) {
            analysis.strengths.push("Modern technology stack");
        }
        if (analysis.diversity > 3) analysis.strengths.push("Diverse technology portfolio");

        // Generate recommendations
        if (analysis.risks.includes("No testing framework detected")) {
            analysis.recommendations.push("Adopt a testing framework (Jest, Vitest, Playwright)");
        }
        if (analysis.risks.includes("No DevOps/CI tools detected")) {
            analysis.recommendations.push("Implement CI/CD pipeline (GitHub Actions, Vercel)");
        }
        if (analysis.balance === "Unbalanced") {
            analysis.recommendations.push("Balance technology stack across all layers");
        }

        return analysis;
    }

    /**
     * Categorize technologies by type
     * @param {Array} technologies - Technology names
     * @returns {Object} Categorized technologies
     */
    static categorizeTechnologies(technologies = []) {
        const categories = {
            frontend: [],
            backend: [],
            database: [],
            devops: [],
            testing: [],
            mobile: [],
            desktop: [],
            ai: [],
            legacy: [],
            modern: []
        };

        const techMap = {
            frontend: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'astro', 'solidjs', 'qwik'],
            backend: ['node', 'express', 'fastify', 'nest', 'deno', 'bun', 'elysia', 'hono'],
            database: ['postgresql', 'mysql', 'mongodb', 'redis', 'supabase', 'prisma', 'drizzle'],
            devops: ['docker', 'kubernetes', 'aws', 'vercel', 'netlify', 'github actions', 'ci', 'cd'],
            testing: ['jest', 'vitest', 'cypress', 'playwright', 'testing library'],
            mobile: ['react native', 'expo', 'capacitor', 'ionic'],
            desktop: ['electron', 'tauri', 'neutralino'],
            ai: ['tensorflow', 'pytorch', 'llama', 'openai', 'anthropic']
        };

        const normalizedTech = technologies.map(t => t.toLowerCase());

        Object.entries(techMap).forEach(([category, techs]) => {
            techs.forEach(tech => {
                if (normalizedTech.some(t => t.includes(tech) || tech.includes(t))) {
                    categories[category].push(tech);
                }
            });
        });

        // Identify legacy vs modern
        const legacyTech = ['jquery', 'angularjs', 'backbone', 'grunt', 'gulp'];
        const modernTech = ['typescript', 'vite', 'pnpm', 'biome', 'astro'];

        normalizedTech.forEach(tech => {
            if (legacyTech.some(t => tech.includes(t))) {
                categories.legacy.push(tech);
            }
            if (modernTech.some(t => tech.includes(t))) {
                categories.modern.push(tech);
            }
        });

        return categories;
    }

    /**
     * Generate maturity recommendations
     * @param {Object} maturity - Maturity categorization
     * @returns {Array} Recommendations
     */
    static generateMaturityRecommendations(maturity) {
        const recommendations = [];

        if (maturity.legacy.length > maturity.mature.length) {
            recommendations.push("Consider migrating from legacy technologies");
        }

        if (maturity.experimental.length > 3) {
            recommendations.push("Evaluate stability of experimental technologies");
        }

        if (maturity.cutting_edge.length === 0) {
            recommendations.push("Explore cutting-edge technologies for innovation");
        }

        return recommendations;
    }

    /**
     * Generate radar recommendations
     * @param {Object} radar - Technology radar
     * @returns {Array} Recommendations
     */
    static generateRadarRecommendations(radar) {
        const recommendations = [];

        if (radar.hold.length > 0) {
            recommendations.push(`Consider migrating away from: ${radar.hold.slice(0, 3).join(', ')}`);
        }

        if (radar.adopt.length > 0) {
            recommendations.push(`Fully adopt proven technologies: ${radar.adopt.slice(0, 3).join(', ')}`);
        }

        if (radar.trial.length > 0) {
            recommendations.push(`Experiment with: ${radar.trial.slice(0, 3).join(', ')}`);
        }

        return recommendations;
    }
}