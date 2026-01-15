import { BINARY_EXTENSIONS, NOISE_EXTENSIONS, NOISE_FILENAMES, CHANGELOG_PATTERNS } from './ClassificationRules.js';

/**
 * SkipManager - Logic to determine if a file should be ignored
 */
export class SkipManager {
    static shouldSkip(filePath, contentPreview = '') {
        const fileName = filePath.split('/').pop().toLowerCase();
        const ext = '.' + fileName.split('.').pop();

        // 1. Binary files
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

        // 4. Changelog patterns
        if (CHANGELOG_PATTERNS.some(p => fileName.includes(p))) {
            return { skip: true, reason: 'Changelog/history file' };
        }

        // 5. Content check
        const trimmed = (contentPreview || '').trim();
        if (trimmed.length < 30) {
            return { skip: true, reason: 'Empty or near-empty file' };
        }

        // 6. README validation
        if (fileName === 'readme.md' || fileName === 'readme.txt') {
            const isPlaceholder = (
                trimmed.length < 100 ||
                /^#\s*\w+\s*$/m.test(trimmed) ||
                /todo|placeholder|coming soon|wip/i.test(trimmed)
            );
            if (isPlaceholder) return { skip: true, reason: 'Placeholder README' };
        }

        // 7. Auto-generated check
        if (/auto-?generated|do not edit|machine generated/i.test(contentPreview.substring(0, 200))) {
            return { skip: true, reason: 'Auto-generated file' };
        }

        // 8. Boilerplate package.json
        if (fileName === 'package.json') {
            const hasCustomContent = contentPreview.includes('"scripts"') &&
                (contentPreview.includes('"build"') || contentPreview.includes('"start"'));
            if (!hasCustomContent) return { skip: true, reason: 'Boilerplate package.json' };
        }

        return { skip: false };
    }
}
