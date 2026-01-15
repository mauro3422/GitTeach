/**
 * FileClassifier - Heuristic-based file classification (Facade)
 * Delegates to specialized modules for SRP and maintainability.
 */
import {
    SkipManager,
    DomainHeuristics,
    IntegrityAuditor
} from './classifier/index.js';

export const FileClassifier = {
    /**
     * Pre-filter check: Should this file be SKIPped without AI?
     */
    shouldSkip(filePath, contentPreview = '') {
        return SkipManager.shouldSkip(filePath, contentPreview);
    },

    /**
     * Infer domain from file path and content patterns
     */
    inferDomain(filePath, contentPreview = '') {
        return DomainHeuristics.infer(filePath, contentPreview);
    },

    /**
     * Generate a domain hint string for the AI prompt
     */
    getDomainHint(filePath, contentPreview = '') {
        return DomainHeuristics.getHint(filePath, contentPreview);
    },

    /**
     * Validate language integrity
     */
    validateLanguageIntegrity(filePath, contentPreview = '') {
        return IntegrityAuditor.validate(filePath, contentPreview);
    }
};
