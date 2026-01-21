/**
 * APIClient.js
 * Responsabilidad: Cliente HTTP para comunicaciones con el backend AI
 */

export const APIClient = {
    baseURL: 'http://localhost:11434/api',

    /**
     * Make a POST request to the API
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[APIClient] POST ${endpoint} failed:`, error);
            throw error;
        }
    },

    /**
     * Make a GET request to the API
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[APIClient] GET ${endpoint} failed:`, error);
            throw error;
        }
    },

    /**
     * Check if the API is available
     */
    async healthCheck() {
        try {
            await this.get('/tags');
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Get available models
     */
    async getModels() {
        const response = await this.get('/tags');
        return response.models || [];
    },

    /**
     * Send a chat completion request
     */
    async chat(model, messages, options = {}) {
        const data = {
            model,
            messages,
            stream: false,
            ...options
        };

        return await this.post('/chat', data);
    },

    /**
     * Send a streaming chat completion request
     */
    async chatStream(model, messages, onChunk, options = {}) {
        const data = {
            model,
            messages,
            stream: true,
            ...options
        };

        try {
            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (onChunk) onChunk(data);
                    } catch (e) {
                        console.warn('[APIClient] Failed to parse chunk:', line);
                    }
                }
            }
        } catch (error) {
            console.error('[APIClient] Stream failed:', error);
            throw error;
        }
    }
};
