/**
 * CodeChurnAnalyzer - Analyzes code churn patterns and metrics
 * Extracted from DNASynthesizer to comply with SRP
 *
 * Responsibilities:
 * - Calculate churn rates from commit data
 * - Identify frequently changing files
 * - Assess maintenance burden
 * - Analyze development velocity patterns
 */

export class CodeChurnAnalyzer {
    /**
     * Calculate churn rate from commits and files
     * @param {Array} commits - Array of commit objects with file changes
     * @param {Array} files - Array of file objects
     * @returns {number} Churn rate (0-1)
     */
    static calculateChurnRate(commits = [], files = []) {
        if (!Array.isArray(commits) || commits.length === 0) {
            return 0;
        }

        let totalChanges = 0;
        commits.forEach(commit => {
            if (commit.stats) {
                totalChanges += (commit.stats.additions || 0) + (commit.stats.deletions || 0);
            }
        });

        const totalFileSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        return totalFileSize > 0 ? totalChanges / totalFileSize : 0;
    }

    /**
     * Identify files with high churn rates
     * @param {Array} files - Array of file objects with churn data
     * @param {number} threshold - Churn threshold to consider "high"
     * @returns {Array} Array of files with high churn
     */
    static identifyFrequentChanges(files = [], threshold = 10) {
        if (!Array.isArray(files)) return [];

        return files
            .filter(file => (file.churn_count || 0) > threshold)
            .sort((a, b) => (b.churn_count || 0) - (a.churn_count || 0))
            .slice(0, 10); // Top 10 most changed files
    }

    /**
     * Assess maintenance burden based on churn patterns
     * @param {number} churnRate - Overall churn rate
     * @param {Array} highChurnFiles - Files with high churn
     * @param {number} totalFiles - Total number of files
     * @returns {Object} Maintenance burden assessment
     */
    static assessMaintenanceBurden(churnRate = 0, highChurnFiles = [], totalFiles = 0) {
        const highChurnRatio = totalFiles > 0 ? highChurnFiles.length / totalFiles : 0;

        let burden = "Low";
        let details = [];

        if (churnRate > 0.5) {
            burden = "Very High";
            details.push("Extremely high code turnover");
        } else if (churnRate > 0.2) {
            burden = "High";
            details.push("Frequent code changes");
        } else if (churnRate > 0.05) {
            burden = "Medium";
            details.push("Moderate maintenance activity");
        } else {
            burden = "Low";
            details.push("Stable codebase");
        }

        if (highChurnRatio > 0.3) {
            burden = burden === "Low" ? "Medium" : "High";
            details.push("Many files change frequently");
        }

        return {
            level: burden,
            details: details.join(", "),
            churnRate: churnRate,
            highChurnRatio: highChurnRatio
        };
    }

    /**
     * Analyze development velocity patterns
     * @param {Array} commits - Array of commits with timestamps
     * @param {number} days - Number of days to analyze
     * @returns {Object} Velocity analysis
     */
    static analyzeDevelopmentVelocity(commits = [], days = 30) {
        if (!Array.isArray(commits) || commits.length === 0) {
            return {
                velocity: "Unknown",
                consistency: "No data",
                pattern: "No commits found"
            };
        }

        // Sort commits by date
        const sortedCommits = commits
            .filter(commit => commit.date)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedCommits.length === 0) {
            return {
                velocity: "Unknown",
                consistency: "No date data",
                pattern: "Commits without dates"
            };
        }

        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        const recentCommits = sortedCommits.filter(commit =>
            new Date(commit.date) >= cutoffDate
        );

        const commitsPerDay = recentCommits.length / days;

        let velocity, consistency, pattern;

        if (commitsPerDay > 5) {
            velocity = "Very High";
            pattern = "Daily active development";
        } else if (commitsPerDay > 2) {
            velocity = "High";
            pattern = "Regular development activity";
        } else if (commitsPerDay > 0.5) {
            velocity = "Medium";
            pattern = "Occasional development";
        } else if (commitsPerDay > 0.1) {
            velocity = "Low";
            pattern = "Infrequent updates";
        } else {
            velocity = "Very Low";
            pattern = "Minimal activity";
        }

        // Analyze consistency (standard deviation of commit intervals)
        if (recentCommits.length > 2) {
            const intervals = [];
            for (let i = 1; i < recentCommits.length; i++) {
                const diff = new Date(recentCommits[i-1].date) - new Date(recentCommits[i].date);
                intervals.push(diff / (1000 * 60 * 60 * 24)); // days
            }

            const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
            const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev < 1) {
                consistency = "Very Consistent";
            } else if (stdDev < 3) {
                consistency = "Consistent";
            } else if (stdDev < 7) {
                consistency = "Irregular";
            } else {
                consistency = "Very Irregular";
            }
        } else {
            consistency = "Insufficient data";
        }

        return {
            velocity,
            consistency,
            pattern,
            commitsPerDay: commitsPerDay.toFixed(2),
            totalRecentCommits: recentCommits.length
        };
    }

    /**
     * Get comprehensive churn analysis
     * @param {Array} commits - Commit data
     * @param {Array} files - File data
     * @returns {Object} Complete churn analysis
     */
    static getChurnAnalysis(commits = [], files = []) {
        const churnRate = this.calculateChurnRate(commits, files);
        const highChurnFiles = this.identifyFrequentChanges(files);
        const maintenanceBurden = this.assessMaintenanceBurden(churnRate, highChurnFiles, files.length);
        const velocity = this.analyzeDevelopmentVelocity(commits);

        return {
            churnRate,
            highChurnFiles: highChurnFiles.map(f => f.path || f.name),
            maintenanceBurden,
            developmentVelocity: velocity
        };
    }
}