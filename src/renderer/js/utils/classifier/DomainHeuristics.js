import { DOMAIN_PATTERNS } from './ClassificationRules.js';

/**
 * DomainHeuristics - Path and content based domain inference
 */
export class DomainHeuristics {
    static infer(filePath, contentPreview = '') {
        const fileName = filePath.toLowerCase();
        const content = contentPreview || '';

        // High confidence path patterns
        if (fileName.includes('/test/') || fileName.includes('/spec/') || fileName.includes('__tests__')) {
            return { domain: 'Testing', confidence: 'high' };
        }
        if (fileName.includes('/scripts/') || fileName.includes('/tools/')) {
            return { domain: 'Script/Tooling', confidence: 'medium' };
        }
        if (fileName.includes('/game/') || fileName.includes('/engine/') || fileName.includes('/physics/')) {
            return { domain: 'Game Engine', confidence: 'high' };
        }
        if (fileName.includes('/api/') || fileName.includes('/routes/') || fileName.includes('/controllers/')) {
            return { domain: 'Backend/API', confidence: 'high' };
        }
        if (fileName.includes('/components/') || fileName.includes('/views/') || fileName.includes('/pages/')) {
            return { domain: 'UI/Frontend', confidence: 'high' };
        }

        // Content patterns
        for (const { pattern, domain, skipWorthy } of DOMAIN_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    domain,
                    confidence: skipWorthy ? 'low' : 'medium',
                    skipWorthy: skipWorthy || false
                };
            }
        }

        // Extension hints
        const ext = fileName.split('.').pop();
        const extHints = {
            'py': 'Python', 'js': 'JavaScript', 'ts': 'TypeScript',
            'cpp': 'C++', 'h': 'C/C++ Header', 'rs': 'Rust', 'go': 'Go',
            'java': 'Java (Backend)', 'cs': 'C# (Enterprise)', 'gd': 'Godot Game Engine'
        };

        if (extHints[ext]) return { domain: extHints[ext], confidence: 'low' };

        return { domain: null, confidence: 'low' };
    }

    static getHint(filePath, contentPreview = '') {
        const { domain, confidence } = this.infer(filePath, contentPreview);
        if (!domain) return '';
        if (confidence === 'high') return `DOMAIN DETECTED: ${domain}. Validate this.`;
        if (confidence === 'medium') return `SUGGESTED DOMAIN: ${domain}. Confirm this.`;
        return '';
    }
}
