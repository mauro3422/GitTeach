// src/main/services/repoService.js
const githubClient = require('./githubClient');

class RepoService {
    async listUserRepos() {
        return await githubClient.request({ url: '/user/repos?sort=updated&per_page=10' });
    }

    async getFileContent(owner, repo, path) {
        return await githubClient.request({
            url: `/repos/${owner}/${repo}/contents/${path}`
        });
    }

    /**
     * Crea el repositorio especial de perfil (username/username)
     */
    async createProfileRepo(username) {
        return await githubClient.request({
            method: 'POST',
            url: '/user/repos',
            body: {
                name: username,
                description: 'Mi perfil de GitHub creado con GitTeach 🚀',
                auto_init: true, // Importante para que cree el README.md inicial
                private: false
            }
        });
    }
}

module.exports = new RepoService();
