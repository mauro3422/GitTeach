/**
 * ProfileRepoManager - Logic for creating and maintaining the specialized "profile" repository.
 */
export class ProfileRepoManager {
    constructor(requestStrategy) {
        this.requestStrategy = requestStrategy;
    }

    /**
     * Create the special profile repository (username/username)
     */
    async createProfileRepo(username) {
        const response = await this.requestStrategy.execute({
            method: 'POST',
            url: '/user/repos',
            body: {
                name: username,
                description: 'Mi perfil de GitHub creado con GitTeach 🚀',
                auto_init: true, // Important to create initial README.md
                private: false
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to create profile repo: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Check if profile repository exists
     */
    async profileRepoExists(username) {
        try {
            await this.requestStrategy.execute({
                url: `/repos/${username}/${username}`
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get profile repository information
     */
    async getProfileRepoInfo(username) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${username}/${username}`
        });

        if (!response.ok) {
            throw new Error(`Failed to get profile repo info: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Update profile repository description
     */
    async updateProfileRepoDescription(username, description) {
        const response = await this.requestStrategy.execute({
            method: 'PATCH',
            url: `/repos/${username}/${username}`,
            body: {
                description: description
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile repo description: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Initialize profile repository with basic structure
     */
    async initializeProfileStructure(username) {
        const operations = [];

        // Create basic directory structure
        const directories = [
            'projects',
            'achievements',
            'contributions'
        ];

        for (const dir of directories) {
            try {
                // Create .gitkeep file to ensure directory exists
                const response = await this.requestStrategy.execute({
                    method: 'PUT',
                    url: `/repos/${username}/${username}/contents/${dir}/.gitkeep`,
                    body: {
                        message: `Initialize ${dir} directory`,
                        content: Buffer.from('# This file ensures the directory exists').toString('base64')
                    }
                });

                if (response.ok) {
                    operations.push({ type: 'directory', path: dir, success: true });
                } else {
                    operations.push({ type: 'directory', path: dir, success: false, error: response.status });
                }
            } catch (error) {
                operations.push({ type: 'directory', path: dir, success: false, error: error.message });
            }
        }

        return operations;
    }

    /**
     * Add profile README content
     */
    async updateProfileReadme(username, content) {
        // First try to get existing README to get SHA for update
        let sha = null;
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${username}/${username}/readme`
            });

            if (response.ok) {
                const readmeData = await response.json();
                sha = readmeData.sha;
            }
        } catch (error) {
            // README doesn't exist, will create new one
        }

        const response = await this.requestStrategy.execute({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/README.md`,
            body: {
                message: 'Update profile README',
                content: Buffer.from(content).toString('base64'),
                sha: sha
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile README: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Get profile repository stats
     */
    async getProfileStats(username) {
        try {
            const [repoInfo, languages, contributors] = await Promise.all([
                this.requestStrategy.execute({ url: `/repos/${username}/${username}` }),
                this.requestStrategy.execute({ url: `/repos/${username}/${username}/languages` }),
                this.requestStrategy.execute({ url: `/repos/${username}/${username}/contributors` })
            ]);

            return {
                repo: repoInfo.ok ? await repoInfo.json() : null,
                languages: languages.ok ? await languages.json() : {},
                contributors: contributors.ok ? await contributors.json() : []
            };
        } catch (error) {
            throw new Error(`Failed to get profile stats: ${error.message}`);
        }
    }
}
