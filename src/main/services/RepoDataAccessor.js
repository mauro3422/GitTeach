/**
 * RepoDataAccessor - Pure GET operations (list repos, get tree, get commits).
 */
export class RepoDataAccessor {
    constructor(requestStrategy) {
        this.requestStrategy = requestStrategy;
    }

    /**
     * List user repositories
     */
    async listUserRepos() {
        const response = await this.requestStrategy.execute({
            url: '/user/repos?sort=updated&per_page=100'
        });

        if (!response.ok) {
            throw new Error(`Failed to list repos: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get file content from a repository
     */
    async getFileContent(owner, repo, path) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${owner}/${repo}/contents/${path}`
        });

        if (!response.ok) {
            throw new Error(`Failed to get file content: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get repository README
     */
    async getRepoReadme(owner, repo) {
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${owner}/${repo}/readme`
            });

            if (!response.ok) {
                return null; // Repository might not have a README
            }

            return await response.json();
        } catch (error) {
            return null; // Repository might not have a README
        }
    }

    /**
     * Get repository tree (recursive)
     */
    async getRepoTree(owner, repo, recursive = true) {
        try {
            // Try with 'main' branch first
            const response = await this.requestStrategy.execute({
                url: `/repos/${owner}/${repo}/git/trees/main?recursive=${recursive ? 1 : 0}`
            });

            if (!response.ok) {
                throw new Error(`Main branch failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // Fall back to 'master' branch
            try {
                const response = await this.requestStrategy.execute({
                    url: `/repos/${owner}/${repo}/git/trees/master?recursive=${recursive ? 1 : 0}`
                });

                if (!response.ok) {
                    throw new Error(`Master branch failed: ${response.status}`);
                }

                return await response.json();
            } catch (fallbackError) {
                throw new Error(`Failed to get repo tree: ${fallbackError.message}`);
            }
        }
    }

    /**
     * Get user commits in a specific repository
     */
    async getUserCommits(owner, repo, author) {
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${owner}/${repo}/commits?author=${author}&per_page=5`
            });

            if (!response.ok) {
                console.warn(`[RepoDataAccessor] Error fetching commits for ${author} in ${repo}: ${response.status}`);
                return [];
            }

            return await response.json();
        } catch (error) {
            console.warn(`[RepoDataAccessor] Error fetching commits for ${author} in ${repo}: ${error.message}`);
            return [];
        }
    }

    /**
     * Get commit diff/details
     */
    async getCommitDiff(owner, repo, sha) {
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${owner}/${repo}/commits/${sha}`
            });

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get repository information
     */
    async getRepoInfo(owner, repo) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${owner}/${repo}`
        });

        if (!response.ok) {
            throw new Error(`Failed to get repo info: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get repository languages
     */
    async getRepoLanguages(owner, repo) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${owner}/${repo}/languages`
        });

        if (!response.ok) {
            throw new Error(`Failed to get repo languages: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get repository contributors
     */
    async getRepoContributors(owner, repo) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${owner}/${repo}/contributors?per_page=10`
        });

        if (!response.ok) {
            throw new Error(`Failed to get repo contributors: ${response.status}`);
        }

        return await response.json();
    }
}
