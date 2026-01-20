/**
 * WorkflowGenerator - Logic for generating and pushing Snake / Action YAMLs.
 */
export class WorkflowGenerator {
    constructor(requestStrategy) {
        this.requestStrategy = requestStrategy;
    }

    /**
     * Generate Snake Game workflow YAML content
     */
    generateSnakeWorkflow(username) {
        return `name: Generate Snake Game

on:
  schedule:
    - cron: "0 0 * * *"  # Daily at midnight UTC
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Generate Snake Game
        uses: Platane/snk@master
        id: snake
        with:
          github_user_name: ${username}
          outputs: |
            dist/snake.svg
            dist/snake-dark.svg

      - name: Push Snake Game to Output Branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
    }

    /**
     * Generate contribution stats workflow YAML content
     */
    generateStatsWorkflow(username) {
        return `name: Generate Contribution Stats

on:
  schedule:
    - cron: "0 0 * * *"  # Daily at midnight UTC
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Generate Contribution Stats
        uses: anuraghazra/github-readme-stats@master
        id: stats
        with:
          username: ${username}
          outputs: |
            stats.svg
            stats-dark.svg

      - name: Push Stats to Output Branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: .
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
    }

    /**
     * Create workflow file in repository
     */
    async createWorkflow(username, filename, content) {
        // First try to get existing file to get SHA for update
        let sha = null;
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`
            });

            if (response.ok) {
                const fileData = await response.json();
                sha = fileData.sha;
            }
        } catch (error) {
            // File doesn't exist, will create new one
        }

        const response = await this.requestStrategy.execute({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`,
            body: {
                message: `Add ${filename} workflow`,
                content: Buffer.from(content).toString('base64'),
                sha: sha
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to create workflow ${filename}: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Create Snake Game workflow
     */
    async createSnakeWorkflow(username) {
        const content = this.generateSnakeWorkflow(username);
        return this.createWorkflow(username, 'snake.yml', content);
    }

    /**
     * Create Contribution Stats workflow
     */
    async createStatsWorkflow(username) {
        const content = this.generateStatsWorkflow(username);
        return this.createWorkflow(username, 'stats.yml', content);
    }

    /**
     * Create multiple workflows at once
     */
    async createAllWorkflows(username) {
        const results = [];

        try {
            const snakeResult = await this.createSnakeWorkflow(username);
            results.push({ type: 'snake', success: true, data: snakeResult });
        } catch (error) {
            results.push({ type: 'snake', success: false, error: error.message });
        }

        try {
            const statsResult = await this.createStatsWorkflow(username);
            results.push({ type: 'stats', success: true, data: statsResult });
        } catch (error) {
            results.push({ type: 'stats', success: false, error: error.message });
        }

        return results;
    }

    /**
     * Update workflow with custom configuration
     */
    async updateWorkflow(username, filename, updates) {
        // First get existing workflow
        const response = await this.requestStrategy.execute({
            url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`
        });

        if (!response.ok) {
            throw new Error(`Workflow ${filename} not found: ${response.status}`);
        }

        const fileData = await response.json();
        let content = Buffer.from(fileData.content, 'base64').toString('utf-8');

        // Apply updates (this is a simple example - in practice you'd need more sophisticated YAML parsing)
        for (const [key, value] of Object.entries(updates)) {
            // Simple string replacement for common patterns
            content = content.replace(new RegExp(`${key}:.*`, 'g'), `${key}: ${value}`);
        }

        const updateResponse = await this.requestStrategy.execute({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`,
            body: {
                message: `Update ${filename} workflow`,
                content: Buffer.from(content).toString('base64'),
                sha: fileData.sha
            }
        });

        if (!updateResponse.ok) {
            throw new Error(`Failed to update workflow ${filename}: ${updateResponse.status}`);
        }

        return await updateResponse.json();
    }

    /**
     * Get list of workflows in repository
     */
    async getWorkflows(username) {
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${username}/${username}/contents/.github/workflows`
            });

            if (!response.ok) {
                return [];
            }

            const contents = await response.json();
            return contents.filter(item => item.type === 'file' && item.name.endsWith('.yml'));
        } catch (error) {
            console.warn(`[WorkflowGenerator] Error getting workflows: ${error.message}`);
            return [];
        }
    }

    /**
     * Delete workflow
     */
    async deleteWorkflow(username, filename) {
        // First get file info to get SHA
        const response = await this.requestStrategy.execute({
            url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`
        });

        if (!response.ok) {
            throw new Error(`Workflow ${filename} not found: ${response.status}`);
        }

        const fileData = await response.json();

        const deleteResponse = await this.requestStrategy.execute({
            method: 'DELETE',
            url: `/repos/${username}/${username}/contents/.github/workflows/${filename}`,
            body: {
                message: `Remove ${filename} workflow`,
                sha: fileData.sha
            }
        });

        if (!deleteResponse.ok) {
            throw new Error(`Failed to delete workflow ${filename}: ${deleteResponse.status}`);
        }

        return await deleteResponse.json();
    }
}
