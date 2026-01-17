/**
 * IntegrityAuditor - Cross-checks file extension against actual content signatures
 */
export class IntegrityAuditor {
    static validate(filePath, contentPreview = '') {
        const fileName = filePath.split('/').pop().toLowerCase();
        const ext = '.' + fileName.split('.').pop();
        const content = contentPreview || '';

        // Language signatures
        const SIGNS = {
            'Python': /(?:^|\n)\s*(def\s+\w+\s*\(|class\s+\w+\s*[:\(]|import\s+\w+|from\s+\w+\s+import)/,
            'JavaScript': /(?:^|\n)\s*(function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|export\s+(default\s+)?(function|class|const)|=>\s*\{)/,
            'C++': /(?:^|\n)\s*(#include\s*[<"]|int\s+main\s*\(|void\s+\w+\s*\(|class\s+\w+\s*\{|namespace\s+\w+)/,
            'Java': /(?:^|\n)\s*(public\s+class|private\s+\w+|import\s+java\.|package\s+\w+)/,
            'C#': /(?:^|\n)\s*(using\s+System|namespace\s+\w+|public\s+class|private\s+void)/,
            'Go': /(?:^|\n)\s*(package\s+\w+|func\s+\w+\s*\(|import\s+\()/,
            'GDScript': /(?:^|\n)\s*(extends\s+\w+|func\s+_\w+|@onready|preload\s*\()/
        };

        const EXT_TO_LANG = {
            '.js': 'JavaScript', '.mjs': 'JavaScript', '.jsx': 'JavaScript',
            '.ts': 'TypeScript', '.tsx': 'TypeScript',
            '.py': 'Python',
            '.cpp': 'C++', '.cxx': 'C++', '.cc': 'C++', '.h': 'C/C++', '.hpp': 'C++',
            '.java': 'Java', '.cs': 'C#', '.go': 'Go', '.gd': 'GDScript'
        };

        const expectedLang = EXT_TO_LANG[ext];
        if (!expectedLang) return { valid: true };

        try {
            const detectedLangs = Object.entries(SIGNS)
                .filter(([_, pattern]) => pattern.test(content))
                .map(([lang]) => lang);

            if (detectedLangs.length === 0 || detectedLangs.includes(expectedLang)) {
                return { valid: true };
            }

            return {
                valid: false,
                anomaly: `${detectedLangs[0]} code in ${ext} file`,
                detectedLang: detectedLangs[0],
                expectedLang: expectedLang
            };
        } catch (error) {
            // Guard against Regex DoS or compilation errors
            return { valid: true };
        }

        // Handle ambiguous cases
        const AMBIGUOUS = [['JavaScript', 'TypeScript'], ['C++', 'C/C++']];
        const isAmbiguous = AMBIGUOUS.some(pair =>
            pair.includes(expectedLang) && pair.some(l => detectedLangs.includes(l))
        );

        if (isAmbiguous) return { valid: true };

        return {
            valid: false,
            anomaly: `${detectedLangs[0]} code in ${ext} file`,
            detectedLang: detectedLangs[0],
            expectedLang: expectedLang
        };
    }
}
