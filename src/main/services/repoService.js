// src/main/services/repoService.js
import githubClient from './githubClient.js';
import { RequestStrategy } from './RequestStrategy.js';
import { RepoDataAccessor } from './RepoDataAccessor.js';
import { WorkflowGenerator } from './WorkflowGenerator.js';
import AppLogger from './system/AppLogger.js';

/**
 * RepoService - Central Orchestrator for GitHub operations.
 * Consolidates data access, profile management, and workflow generation.
 */
class RepoService {
    constructor() {
        this.context = 'RepoService';
        this.requestStrategy = new RequestStrategy(githubClient);
        this.repoDataAccessor = new RepoDataAccessor(this.requestStrategy);
        this.workflowGenerator = new WorkflowGenerator(this.requestStrategy);
    }

    // --- Data Access Operations (Delegated) ---
    async listUserRepos() {
        return this.repoDataAccessor.listUserRepos();
    }

    async getFileContent(owner, repo, path) {
        return this.repoDataAccessor.getFileContent(owner, repo, path);
    }

    async getRepoReadme(owner, repo) {
        return this.repoDataAccessor.getRepoReadme(owner, repo);
    }

    async getRepoTree(owner, repo, recursive = true) {
        return this.repoDataAccessor.getRepoTree(owner, repo, recursive);
    }

    async getUserCommits(owner, repo, author) {
        return this.repoDataAccessor.getUserCommits(owner, repo, author);
    }

    async getCommitDiff(owner, repo, sha) {
        return this.repoDataAccessor.getCommitDiff(owner, repo, sha);
    }

    // --- Consolidated Profile Repository Operations ---
    async createProfileRepo(username) {
        AppLogger.info(this.context, `Creating profile repo for ${username}`);
        const response = await this.requestStrategy.execute({
            method: 'POST',
            url: '/user/repos',
            body: {
                name: username,
                description: 'Mi perfil de GitHub creado con GitTeach 🚀',
                auto_init: true,
                private: false
            }
        });

        if (!response.ok) {
            AppLogger.error(this.context, `Failed to create profile repo for ${username}`, { status: response.status });
            throw new Error(`Failed to create profile repo: ${response.status}`);
        }

        return await response.json();
    }

    async profileRepoExists(username) {
        try {
            const response = await this.requestStrategy.execute({
                url: `/repos/${username}/${username}`
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getProfileRepoInfo(username) {
        const response = await this.requestStrategy.execute({
            url: `/repos/${username}/${username}`
        });

        if (!response.ok) {
            throw new Error(`Failed to get profile repo info: ${response.status}`);
        }

        return await response.json();
    }

    async updateProfileReadme(username, content) {
        AppLogger.info(this.context, `Updating profile README for ${username}`);

        let sha = null;
        try {
            const readmeRes = await this.requestStrategy.execute({
                url: `/repos/${username}/${username}/readme`
            });
            if (readmeRes.ok) {
                const data = await readmeRes.json();
                sha = data.sha;
            }
        } catch (e) {
            AppLogger.debug(this.context, 'No existing README found, creating new one.');
        }

        const response = await this.requestStrategy.execute({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/README.md`,
            body: {
                message: 'Update profile README via GitTeach',
                content: Buffer.from(content).toString('base64'),
                sha: sha
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile README: ${response.status}`);
        }

        return await response.json();
    }

    // --- Workflow Operations (Delegated) ---
    async createWorkflow(username, content) {
        return this.workflowGenerator.createWorkflow(username, 'snake.yml', content);
    }

    async createSnakeWorkflow(username) {
        return this.workflowGenerator.createSnakeWorkflow(username);
    }

    async createAllWorkflows(username) {
        return this.workflowGenerator.createAllWorkflows(username);
    }
}

export default new RepoService();
