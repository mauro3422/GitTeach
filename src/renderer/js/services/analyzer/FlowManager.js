/**
 * FlowManager - Manages the high-level analysis state and language processing.
 */
export class FlowManager {
    static processLanguages(repos) {
        const counts = {};
        repos.forEach(r => {
            if (r.language) {
                counts[r.language] = (counts[r.language] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);
    }

    static getInitialResults() {
        return {
            mainLangs: [],
            topRepos: [],
            totalStars: 0,
            summary: "",
            suggestions: []
        };
    }

    static finalizeResults(username, repos, aiInsight, langData, codeInsights, coordinator) {
        return {
            summary: aiInsight.summary,
            suggestions: aiInsight.suggestions,
            mainLangs: langData,
            topRepos: repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3),
            deepScan: codeInsights,
            failedFiles: coordinator.inventory.failedFiles.length,
            timestamp: new Date().toISOString()
        };
    }
}
