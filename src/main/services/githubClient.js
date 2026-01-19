// src/main/services/githubClient.js
import fetch from 'node-fetch';

class GithubClient {
    constructor() {
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    /**
     * Helper genérico para peticiones a la API de GitHub
     * Migrado a node-fetch para evitar net::ERR_CONTENT_DECODING_FAILED
     */
    async request(options) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'GitTeach-App',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `token ${this.token}`;
        }

        const url = options.url.startsWith('http') ? options.url : `https://api.github.com${options.url}`;

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const body = await response.text();
            let data = {};

            if (body) {
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    console.warn('[GithubClient] Failed to parse JSON:', body.substring(0, 100));
                    data = { raw: body };
                }
            }

            if (response.ok) {
                return data;
            } else {
                throw new Error(data.message || `Error API: ${response.status}`);
            }
        } catch (error) {
            console.error('[GithubClient] Fetch Error:', error);
            throw error;
        }
    }
}

export default new GithubClient();
