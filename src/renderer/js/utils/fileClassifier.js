/**
 * FileClassifier - Heuristic-based file classification BEFORE AI processing
 * Purpose: Move work from AI to deterministic scripts where possible
 * 
 * Addresses issues from testing:
 * 1. False negatives (exporter.js SKIP'd incorrectly)
 * 2. Domain confusion (Playwright → "Game Engine")
 * 3. Analysis + SKIP inconsistency
 * 4. Empty file invention
 */

// Extension categories for quick lookup
const BINARY_EXTENSIONS = new Set([
    '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp',
    '.ttf', '.woff', '.woff2', '.eot', '.otf',
    '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx'
]);

const NOISE_EXTENSIONS = new Set([
    '.log', '.lock', '.gitignore', '.gitattributes', '.editorconfig',
    '.npmignore', '.dockerignore', '.prettierignore', '.eslintignore'
]);

const NOISE_FILENAMES = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
    'gemfile.lock', 'poetry.lock', 'cargo.lock', 'pubspec.lock',
    '.ds_store', 'thumbs.db', 'desktop.ini'
]);

const CHANGELOG_PATTERNS = [
    'changelog', 'changes', 'history', 'release', 'news'
];

// Domain detection patterns (content-based)
const DOMAIN_PATTERNS = [
    // Testing/Scripting
    { pattern: /chromium\.launch|puppeteer|playwright|page\.goto|browser\.newPage/i, domain: 'Script/Testing' },
    { pattern: /describe\s*\(|it\s*\(|test\s*\(|expect\s*\(|jest|mocha|vitest/i, domain: 'Testing' },

    // Game Engine
    { pattern: /raylib|sfml|sdl|gameloop|update.*render|physics.*engine/i, domain: 'Game Engine' },
    { pattern: /extends\s+Node2D|extends\s+KinematicBody|func\s+_process|\.gd$/i, domain: 'Godot Game Engine' },
    { pattern: /pygame|arcade\.run|sprite\.group/i, domain: 'Game Engine (Python)' },

    // UI/Frontend
    { pattern: /react|vue|angular|svelte|usestate|useeffect|component/i, domain: 'UI/Frontend' },
    { pattern: /\<style\>|\<div\>|\<template\>/i, domain: 'UI/Web' },

    // Backend
    { pattern: /express\(|fastapi|flask|django|koa|app\.listen/i, domain: 'Backend/API' },
    { pattern: /router\.|middleware|req\s*,\s*res/i, domain: 'Backend' },

    // DevOps
    { pattern: /dockerfile|docker-compose|kubernetes|k8s|helm/i, domain: 'DevOps' },
    { pattern: /github\.com.*actions|workflow.*on:|jobs:|runs-on:/i, domain: 'CI/CD' },

    // Data
    { pattern: /pandas|numpy|tensorflow|pytorch|sklearn|matplotlib/i, domain: 'Data Science/ML' },

    // Science/Simulation
    { pattern: /molecule|atomic|physics|chemistry|formula|simulation|vsepr/i, domain: 'Science/Simulation' },

    // Business/Enterprise (Antidote for "Game" bias)
    { pattern: /hospital|patient|doctor|medicina|obra\s*social|ticket|billing|invoice|payroll|inventory/i, domain: 'Business/Management' },
    { pattern: /client|customer|member|appointment|reservation|booking/i, domain: 'Enterprise/Systems' },

    // Configuration (low priority, often SKIP-worthy)
    { pattern: /^\s*\{[\s\S]*"name"\s*:[\s\S]*"version"\s*:/i, domain: 'Configuration', skipWorthy: true }
];

export const FileClassifier = {
    /**
     * Pre-filter check: Should this file be SKIPped without AI?
     * @param {string} filePath - Full file path
     * @param {string} contentPreview - First N chars of file content
     * @returns {{ skip: boolean, reason?: string }}
     */
    shouldSkip(filePath, contentPreview = '') {
        const fileName = filePath.split('/').pop().toLowerCase();
        const ext = '.' + fileName.split('.').pop();

        // 1. Binary files - always skip
        if (BINARY_EXTENSIONS.has(ext)) {
            return { skip: true, reason: 'Binary file' };
        }

        // 2. Noise files by extension
        if (NOISE_EXTENSIONS.has(ext)) {
            return { skip: true, reason: 'Noise/config file' };
        }

        // 3. Noise files by exact name
        if (NOISE_FILENAMES.has(fileName)) {
            return { skip: true, reason: 'Lock/system file' };
        }

        // 4. Changelog patterns (often auto-generated or low value)
        if (CHANGELOG_PATTERNS.some(p => fileName.includes(p))) {
            return { skip: true, reason: 'Changelog/history file' };
        }

        // 5. Empty or near-empty content check
        const trimmed = (contentPreview || '').trim();
        if (trimmed.length < 30) {
            return { skip: true, reason: 'Empty or near-empty file' };
        }

        // 6. README validation - check for placeholder READMEs
        if (fileName === 'readme.md' || fileName === 'readme.txt') {
            // Placeholder patterns
            const isPlaceholder = (
                trimmed.length < 100 ||
                /^#\s*\w+\s*$/m.test(trimmed) || // Just a heading
                /todo|placeholder|coming soon|wip/i.test(trimmed)
            );
            if (isPlaceholder) {
                return { skip: true, reason: 'Placeholder README' };
            }
        }

        // 7. Auto-generated file detection
        if (/auto-?generated|do not edit|machine generated/i.test(contentPreview.substring(0, 200))) {
            return { skip: true, reason: 'Auto-generated file' };
        }

        // 8. Package.json - only skip if it's boilerplate
        if (fileName === 'package.json') {
            // Check if it has meaningful scripts or custom fields
            const hasCustomContent = contentPreview.includes('"scripts"') &&
                contentPreview.includes('"build"') ||
                contentPreview.includes('"start"');
            if (!hasCustomContent) {
                return { skip: true, reason: 'Boilerplate package.json' };
            }
            // Don't skip - let AI analyze it for scripts/deps
        }

        return { skip: false };
    },

    /**
     * Infer domain from file path and content patterns
     * Returns a hint to guide AI classification (prevents hallucination)
     * @param {string} filePath
     * @param {string} contentPreview
     * @returns {{ domain: string | null, confidence: 'high' | 'medium' | 'low' }}
     */
    inferDomain(filePath, contentPreview = '') {
        const fileName = filePath.toLowerCase();
        const content = contentPreview || '';

        // Path-based hints (high confidence)
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

        // Content-based detection (medium-high confidence)
        for (const { pattern, domain, skipWorthy } of DOMAIN_PATTERNS) {
            if (pattern.test(content)) {
                return {
                    domain,
                    confidence: skipWorthy ? 'low' : 'medium',
                    skipWorthy: skipWorthy || false
                };
            }
        }

        // File extension hints (low confidence - let AI decide)
        const ext = fileName.split('.').pop();
        const extHints = {
            'py': 'Python',
            'js': 'JavaScript',
            'ts': 'TypeScript',
            'cpp': 'C++',
            'h': 'C/C++ Header',
            'rs': 'Rust',
            'go': 'Go',
            'java': 'Java (Backend)',
            'cs': 'C# (Enterprise)',
            'gd': 'Godot Game Engine'
        };

        if (extHints[ext]) {
            return { domain: extHints[ext], confidence: 'low' };
        }

        return { domain: null, confidence: 'low' };
    },

    /**
     * Generate a domain hint string for the AI prompt
     * @param {string} filePath
     * @param {string} contentPreview
     * @returns {string} Hint to prepend to AI prompt, or empty string
     */
    getDomainHint(filePath, contentPreview = '') {
        const { domain, confidence } = this.inferDomain(filePath, contentPreview);

        if (!domain) return '';

        if (confidence === 'high') {
            return `DOMAIN DETECTED (from path patterns): ${domain}. Validate this classification.`;
        } else if (confidence === 'medium') {
            return `SUGGESTED DOMAIN (from content patterns): ${domain}. Confirm or correct this.`;
        }

        return ''; // Low confidence - let AI decide freely
    },

    /**
     * Validate language integrity: detect when content doesn't match extension
     * Example: Python code inside a .js file
     * @param {string} filePath
     * @param {string} contentPreview
     * @returns {{ valid: boolean, anomaly?: string, detectedLang?: string, expectedLang?: string }}
     */
    validateLanguageIntegrity(filePath, contentPreview = '') {
        const fileName = filePath.split('/').pop().toLowerCase();
        const ext = '.' + fileName.split('.').pop();
        const content = contentPreview || '';

        // Language signatures (must be at start of line or after whitespace)
        const PYTHON_SIGNS = /(?:^|\n)\s*(def\s+\w+\s*\(|class\s+\w+\s*[:\(]|import\s+\w+|from\s+\w+\s+import)/;
        const JS_SIGNS = /(?:^|\n)\s*(function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|export\s+(default\s+)?(function|class|const)|=>\s*\{)/;
        const CPP_SIGNS = /(?:^|\n)\s*(#include\s*[<"]|int\s+main\s*\(|void\s+\w+\s*\(|class\s+\w+\s*\{|namespace\s+\w+)/;
        const JAVA_SIGNS = /(?:^|\n)\s*(public\s+class|private\s+\w+|import\s+java\.|package\s+\w+)/;
        const CSHARP_SIGNS = /(?:^|\n)\s*(using\s+System|namespace\s+\w+|public\s+class|private\s+void)/;
        const GO_SIGNS = /(?:^|\n)\s*(package\s+\w+|func\s+\w+\s*\(|import\s+\()/;
        const GDSCRIPT_SIGNS = /(?:^|\n)\s*(extends\s+\w+|func\s+_\w+|@onready|preload\s*\()/;

        // Extension to expected language mapping
        const EXT_TO_LANG = {
            '.js': 'JavaScript', '.mjs': 'JavaScript', '.jsx': 'JavaScript',
            '.ts': 'TypeScript', '.tsx': 'TypeScript',
            '.py': 'Python',
            '.cpp': 'C++', '.cxx': 'C++', '.cc': 'C++', '.h': 'C/C++', '.hpp': 'C++',
            '.java': 'Java',
            '.cs': 'C#',
            '.go': 'Go',
            '.gd': 'GDScript'
        };

        const expectedLang = EXT_TO_LANG[ext];
        if (!expectedLang) return { valid: true }; // Unknown extension, can't validate

        // Check for mismatches
        const detectedLangs = [];

        if (PYTHON_SIGNS.test(content)) detectedLangs.push('Python');
        if (JS_SIGNS.test(content)) detectedLangs.push('JavaScript');
        if (CPP_SIGNS.test(content)) detectedLangs.push('C++');
        if (JAVA_SIGNS.test(content)) detectedLangs.push('Java');
        if (CSHARP_SIGNS.test(content)) detectedLangs.push('C#');
        if (GO_SIGNS.test(content)) detectedLangs.push('Go');
        if (GDSCRIPT_SIGNS.test(content)) detectedLangs.push('GDScript');

        // If no lang detected or expected lang is detected, it's valid
        if (detectedLangs.length === 0 || detectedLangs.includes(expectedLang)) {
            return { valid: true };
        }

        // Check for definite mismatch (detected lang != expected AND expected not detected)
        // Skip ambiguous cases where both could be valid (e.g., TypeScript looks like JavaScript)
        const ambiguousPairs = [
            ['JavaScript', 'TypeScript'],
            ['C++', 'C/C++']
        ];
        const isAmbiguous = ambiguousPairs.some(pair =>
            pair.includes(expectedLang) && pair.some(p => detectedLangs.includes(p))
        );

        if (isAmbiguous) return { valid: true };

        // Definite mismatch
        return {
            valid: false,
            anomaly: `${detectedLangs[0]} code in ${ext} file`,
            detectedLang: detectedLangs[0],
            expectedLang: expectedLang
        };
    }
};
