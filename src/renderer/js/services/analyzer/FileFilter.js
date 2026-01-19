/**
 * FileFilter - Specialized module for filtering repository file trees
 * Extracted from FileAuditor to comply with SRP
 */
export class FileFilter {
    constructor() {
        // Configuration constants
        this.excludeExtensions = [
            // Media
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.mp4', '.ico',
            // Documents/Archives
            '.pdf', '.zip', '.tar', '.gz', '.rar',
            // Executables/Binary
            '.exe', '.dll', '.bin', '.so', '.dylib', '.class', '.o', '.obj',
            // Fonts (CRITICAL source of hallucinations)
            '.ttf', '.otf', '.woff', '.woff2', '.eot',
            // Engine/Config Noise
            '.import', '.lock', '.meta', '.map', '.min.js', '.min.css'
        ];

        // Folders that contain noise/demos, not architecture
        this.toxicTokens = [
            'demo', 'example', 'test', 'spec', 'vendor',
            'node_modules', 'dist', 'build', 'coverage',
            'mock', 'fixture', 'icomoon'
        ];

        // CURATED EXCEPTIONS: High-value files in toxic directories
        this.curatedExceptions = [
            'index.js', 'index.ts', 'main.js', 'main.ts',
            'app.js', 'app.ts', 'example.js', 'example.ts',
            'demo.js', 'demo.ts', 'usage.js', 'usage.ts'
        ];
    }

    /**
     * Identifies relevant files for analysis
     * @param {Array} tree - Repository file tree
     * @returns {Array} Filtered anchor files
     */
    identifyAnchorFiles(tree) {
        const isTracer = typeof window !== 'undefined' && window.IS_TRACER;

        return tree.filter(node => {
            if (node.type !== 'blob') return false;
            const lowerPath = node.path.toLowerCase();

            // 1. Extension Filter
            const isExcludedExt = this.excludeExtensions.some(ext => lowerPath.endsWith(ext));
            if (isExcludedExt) return false;

            // 2. Hidden Files
            if (lowerPath.includes('/.') || lowerPath.startsWith('.')) return false;

            // 3. Smart Path Filter (Token-based)
            const pathTokens = lowerPath.split(/[\\/]/); // Split by / or \
            const filename = pathTokens[pathTokens.length - 1];

            // Critical: "Assets" folder logic
            // FILTER V4: Draconian Assets Policy
            if (!isTracer && (pathTokens.includes('assets') || pathTokens.includes('static') || pathTokens.includes('public'))) {
                if (filename.toLowerCase() !== 'readme.md') return false;
            }

            // Critical: "Demo" / "Test" / "Vendor" logic
            // RELAXED FOR TRACER: Allow diagnostic scripts even if they use "test" or "mock"
            const hasToxicToken = pathTokens.some(token => {
                return this.toxicTokens.some(toxic => {
                    // In Tracer mode, we basically want EVERYTHING except node_modules/dist/build
                    if (isTracer) {
                        const skipList = ['node_modules', 'dist', 'build', 'vendor', 'icomoon'];
                        if (skipList.includes(toxic)) {
                            return token === toxic;
                        }
                        // For 'test', 'mock', 'demo', 'example', 'coverage', 'fixture', 'spec':
                        // Only skip if it's EXACTLY the folder name, but let file prefixes through
                        return token === toxic && token !== filename;
                    }

                    // Standard (Normal) mode: Draconian filtering
                    return token === toxic ||
                        token.startsWith(toxic + '-') ||
                        token.endsWith('-' + toxic) ||
                        filename.startsWith(toxic);
                });
            });

            if (hasToxicToken) {
                // CURATED EXCEPTION: Allow high-value files in toxic directories
                if (this.curatedExceptions.includes(filename)) {
                    return true;
                }
                return false;
            }

            return true;
        }).slice(0, 10); // Limit to 10 files per repo for quick global profiling
    }
}
