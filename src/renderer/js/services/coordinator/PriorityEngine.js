/**
 * PriorityEngine - Heuristics for file importance
 * Determines scan order (important files like README or package.json first)
 */
export class PriorityEngine {
    /**
     * Calculates file priority (higher = more important)
     */
    static calculate(filePath) {
        const lowerPath = filePath.toLowerCase();

        // High priority files
        if (lowerPath.includes('readme')) return 100;
        if (lowerPath.includes('package.json')) return 95;
        if (lowerPath.includes('cargo.toml')) return 95;
        if (lowerPath.includes('requirements.txt')) return 95;
        if (lowerPath.includes('go.mod')) return 95;
        if (lowerPath.includes('main.')) return 90;
        if (lowerPath.includes('index.')) return 90;
        if (lowerPath.includes('app.')) return 85;
        if (lowerPath.includes('changelog')) return 80;
        if (lowerPath.includes('config')) return 75;

        // Code files
        if (lowerPath.endsWith('.py')) return 60;
        if (lowerPath.endsWith('.js')) return 60;
        if (lowerPath.endsWith('.ts')) return 60;
        if (lowerPath.endsWith('.cpp') || lowerPath.endsWith('.c')) return 60;
        if (lowerPath.endsWith('.rs')) return 60;
        if (lowerPath.endsWith('.go')) return 60;

        // Documentation
        if (lowerPath.endsWith('.md')) return 50;

        // Configuration
        if (lowerPath.endsWith('.json')) return 40;
        if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 40;

        // Lower priority
        if (lowerPath.includes('node_modules')) return 0;
        if (lowerPath.includes('.lock')) return 5;
        if (lowerPath.includes('dist/')) return 5;

        return 30; // Default
    }
}
