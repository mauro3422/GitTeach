// src/main/services/profileService.js
import githubClient from './githubClient.js';

class ProfileService {
    async getUserData() {
        return await githubClient.request({ url: '/user' });
    }

    /**
     * Obtiene el README de perfil (repo 'usuario/usuario')
     */
    async getProfileReadme(username) {
        try {
            return await githubClient.request({
                url: `/repos/${username}/${username}/contents/README.md`
            });
        } catch (e) {
            return null; // El usuario podría no tener repositorio de perfil
        }
    }

    /**
     * Actualiza el README de perfil
     */
    async updateProfileReadme(username, content, sha) {
        return await githubClient.request({
            method: 'PUT',
            url: `/repos/${username}/${username}/contents/README.md`,
            body: {
                message: 'Update profile README via GitTeach',
                content: Buffer.from(content).toString('base64'),
                sha: sha
            }
        });
    }
}

export default new ProfileService();
