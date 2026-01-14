// src/main/services/repoService.js
const githubClient = require('./githubClient');

class RepoService {
    async listUserRepos() {
        return await githubClient.request({ url: '/user/repos?sort=updated&per_page=100' });
    }

    async getFileContent(owner, repo, path) {
        return await githubClient.request({
            url: `/repos/${owner}/${repo}/contents/${path}`
        });
    }

    /**
     * Obtiene el README de cualquier repositorio
     */
    async getRepoReadme(owner, repo) {
        try {
            return await githubClient.request({
                url: `/repos/${owner}/${repo}/readme`
            });
        } catch (e) {
            return null; // El repositorio podría no tener README
        }
    }

    /**
     * Obtiene el árbol completo de archivos (recursivo)
     */
    async getRepoTree(owner, repo, recursive = true) {
        try {
            return await githubClient.request({
                url: `/repos/${owner}/${repo}/git/trees/main?recursive=${recursive ? 1 : 0}`
            });
        } catch (e) {
            // Intentar con 'master' si 'main' falla
            return await githubClient.request({
                url: `/repos/${owner}/${repo}/git/trees/master?recursive=${recursive ? 1 : 0}`
            });
        }
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
    /**
     * Crea un archivo de workflow en .github/workflows
     */
    async createWorkflow(username, content) {
        // Primero intentamos obtener el SHA si existe para hacer update
        let sha = null;
        try {
            const file = await this.getFileContent(username, username, '.github/workflows/snake.yml');
            if (file && file.sha) sha = file.sha;
        } catch (e) {
            // No existe, crearemos uno nuevo
        }

        return await githubClient.request({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/.github/workflows/snake.yml`,
            body: {
                message: 'Add Snake Game workflow 🐍',
                content: Buffer.from(content).toString('base64'),
                sha: sha
            }
        });
    }

    /**
     * Obtiene los commits de un usuario específico en un repo
     * Útil para detectar contribuciones en forks
     */
    async getUserCommits(owner, repo, author) {
        try {
            return await githubClient.request({
                url: `/repos/${owner}/${repo}/commits?author=${author}&per_page=5`
            });
        } catch (e) {
            console.warn(`[RepoService] Error fetching commits for ${author} in ${repo}: ${e.message}`);
            return [];
        }
    }

    /**
     * Obtiene el diff de un commit para ver qué archivos cambió
     */
    async getCommitDiff(owner, repo, sha) {
        try {
            return await githubClient.request({
                url: `/repos/${owner}/${repo}/commits/${sha}`
            });
        } catch (e) {
            return null;
        }
    }
}

module.exports = new RepoService();
