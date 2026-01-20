// src/main/services/repoService.js
import githubClient from './githubClient.js';
import { RequestStrategy } from './RequestStrategy.js';
import { RepoDataAccessor } from './RepoDataAccessor.js';
import { ProfileRepoManager } from './ProfileRepoManager.js';
import { WorkflowGenerator } from './WorkflowGenerator.js';

/**
 * RepoService - Orchestrator delegating to specialized managers.
 * Coordinates GitHub operations through focused, single-responsibility components.
 */
class RepoService {
    constructor() {
        // Initialize specialized managers
        this.requestStrategy = new RequestStrategy(githubClient);
        this.repoDataAccessor = new RepoDataAccessor(this.requestStrategy);
        this.profileRepoManager = new ProfileRepoManager(this.requestStrategy);
        this.workflowGenerator = new WorkflowGenerator(this.requestStrategy, this.profileRepoManager);
    }

    // Data Access Operations (delegated to RepoDataAccessor)
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

    // Profile Repository Operations (delegated to ProfileRepoManager)
    async createProfileRepo(username) {
        return this.profileRepoManager.createProfileRepo(username);
    }

    async profileRepoExists(username) {
        return this.profileRepoManager.profileRepoExists(username);
    }

    async getProfileRepoInfo(username) {
        return this.profileRepoManager.getProfileRepoInfo(username);
    }

    async updateProfileRepoDescription(username, description) {
        return this.profileRepoManager.updateProfileRepoDescription(username, description);
    }

    async initializeProfileStructure(username) {
        return this.profileRepoManager.initializeProfileStructure(username);
    }

    async updateProfileReadme(username, content) {
        return this.profileRepoManager.updateProfileReadme(username, content);
    }

    async getProfileStats(username) {
        return this.profileRepoManager.getProfileStats(username);
    }

    // Workflow Operations (delegated to WorkflowGenerator)
    async createWorkflow(username, content) {
        // Legacy method - creates snake workflow with provided content
        return this.workflowGenerator.createWorkflow(username, 'snake.yml', content);
    }

    async createSnakeWorkflow(username) {
        return this.workflowGenerator.createSnakeWorkflow(username);
    }

    async createStatsWorkflow(username) {
        return this.workflowGenerator.createStatsWorkflow(username);
    }

    async createAllWorkflows(username) {
        return this.workflowGenerator.createAllWorkflows(username);
    }

    async getWorkflows(username) {
        return this.workflowGenerator.getWorkflows(username);
    }

    async updateWorkflow(username, filename, updates) {
        return this.workflowGenerator.updateWorkflow(username, filename, updates);
    }

    async deleteWorkflow(username, filename) {
        return this.workflowGenerator.deleteWorkflow(username, filename);
    }
}

export default new RepoService();
