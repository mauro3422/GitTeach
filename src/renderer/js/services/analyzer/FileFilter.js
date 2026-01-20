/**
 * FileFilter - Specialized module for filtering repository file trees
 * Extracted from FileAuditor to comply with SRP
 */
import pipelineEventBus from '../pipeline/PipelineEventBus.js';

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

        // Track discarded count per call
        this.lastDiscardedCount = 0;
    }

    /**
     * Identifies relevant files for analysis
     * @param {Array} tree - Repository file tree
     * @param {string} repoName - Name of the repository for event emission
     * @returns {Array} Filtered anchor files
     */
    identifyAnchorFiles(tree, repoName = 'unknown') {
        const isTracer = typeof window !== 'undefined' && window.IS_TRACER;
        const accepted = [];
        this.lastDiscardedCount = 0;

        tree.forEach(node => {
            if (node.type !== 'blob') return;
            const lowerPath = node.path.toLowerCase();
            let discardReason = null;

            // 1. Extension Filter
            const isExcludedExt = this.excludeExtensions.some(ext => lowerPath.endsWith(ext));
            if (isExcludedExt) {
                discardReason = 'excluded_extension';
            }

            // 2. Hidden Files
            if (!discardReason && (lowerPath.includes('/.') || lowerPath.startsWith('.'))) {
                discardReason = 'hidden_file';
            }

            // 3. Smart Path Filter (Token-based)
            const pathTokens = lowerPath.split(/[\\/]/);
            const filename = pathTokens[pathTokens.length - 1];

            // Assets/Static/Public folders
            if (!discardReason && !isTracer &&
                (pathTokens.includes('assets') || pathTokens.includes('static') || pathTokens.includes('public'))) {
                if (filename.toLowerCase() !== 'readme.md') {
                    discardReason = 'asset_folder';
                }
            }

            // Toxic tokens (node_modules, dist, etc.)
            if (!discardReason) {
                const hasToxicToken = pathTokens.some(token => {
                    return this.toxicTokens.some(toxic => {
                        if (isTracer) {
                            const skipList = ['node_modules', 'dist', 'build', 'vendor', 'icomoon'];
                            if (skipList.includes(toxic)) {
                                return token === toxic;
                            }
                            return token === toxic && token !== filename;
                        }
                        return token === toxic ||
                            token.startsWith(toxic + '-') ||
                            token.endsWith('-' + toxic) ||
                            filename.startsWith(toxic);
                    });
                });

                if (hasToxicToken) {
                    // CURATED EXCEPTION: Allow high-value files in toxic directories
                    if (!this.curatedExceptions.includes(filename)) {
                        discardReason = 'toxic_folder';
                    }
                }
            }

            if (discardReason) {
                // Emit discarded event for visualization
                this.lastDiscardedCount++;
                pipelineEventBus.emit('file:discarded', {
                    file: node.path,
                    repo: repoName,
                    reason: discardReason
                });
            } else {
                accepted.push(node);
            }
        });

        return accepted.slice(0, 10); // Limit to 10 files per repo for quick global profiling
    }
}

