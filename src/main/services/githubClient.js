// src/main/services/githubClient.js
import { net } from 'electron';

class GithubClient {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    /**
     * Helper genérico para peticiones a la API de GitHub
     */
    async request(options) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'GitTeach-App',
                ...options.headers
            };

            if (this.token) {
                headers['Authorization'] = `token ${this.token}`;
            }

            const request = net.request({
                method: options.method || 'GET',
                url: options.url.startsWith('http') ? options.url : `https://api.github.com${options.url}`,
                headers: headers
            });

            request.on('response', (response) => {
                let body = '';
                response.on('data', (chunk) => body += chunk);
                response.on('end', () => {
                    try {
                        const data = body ? JSON.parse(body) : {};
                        if (response.statusCode >= 200 && response.statusCode < 300) {
                            resolve(data);
                        } else {
                            reject(new Error(data.message || `Error API: ${response.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error('Respuesta inválida de GitHub'));
                    }
                });
            });

            request.on('error', (err) => reject(err));

            if (options.body) {
                request.write(JSON.stringify(options.body));
            }
            request.end();
        });
    }
}

export default new GithubClient();
