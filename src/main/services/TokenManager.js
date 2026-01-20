import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * TokenManager - Pure logic for reading/writing token.json and session validation.
 */
class TokenManager {
    constructor() {
        this.tokenPath = path.join(app.getPath('userData'), 'token.json');
    }

    /**
     * Saves the access token to disk.
     * @param {string} token - The GitHub access token
     */
    async saveToken(token) {
        try {
            const data = { token, savedAt: new Date().toISOString() };
            fs.writeFileSync(this.tokenPath, JSON.stringify(data, null, 2));
            console.log('[TokenManager] Token saved to disk');
        } catch (error) {
            console.error('[TokenManager] Error saving token:', error);
            throw error;
        }
    }

    /**
     * Loads the access token from disk.
     * @returns {string|null} The token or null if not found
     */
    async loadToken() {
        try {
            if (!fs.existsSync(this.tokenPath)) {
                console.log('[TokenManager] No token file found');
                return null;
            }

            const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            console.log('[TokenManager] Token loaded from disk');
            return data.token || null;
        } catch (error) {
            console.error('[TokenManager] Error loading token:', error);
            return null;
        }
    }

    /**
     * Validates a token by attempting to use it with GitHub API.
     * @param {string} token - The token to validate
     * @returns {Promise<Object|null>} User data if valid, null if invalid
     */
    async validateToken(token) {
        if (!token) {
            console.log('[TokenManager] No token provided for validation');
            return null;
        }

        try {
            // Dynamic import to avoid circular dependencies
            const { default: githubClient } = await import('./githubClient.js');
            const { default: profileService } = await import('./profileService.js');

            githubClient.setToken(token);
            console.log('[TokenManager] Validating token with GitHub API...');

            const user = await profileService.getUserData();
            console.log('[TokenManager] Token validation result:', user ? 'VALID' : 'INVALID');

            if (user && !user.error) {
                console.log('[TokenManager] Valid session for:', user.login);
                return user;
            }

            console.warn('[TokenManager] Token expired or invalid response:', user);
            return null;
        } catch (error) {
            console.error('[TokenManager] Error validating token:', error.message);
            return null;
        }
    }

    /**
     * Checks if a valid token exists and validates it.
     * @returns {Promise<Object|null>} User data if valid session exists, null otherwise
     */
    async checkSession() {
        console.log('[TokenManager] Checking saved session...');
        console.log('[TokenManager] Token path:', this.tokenPath);

        const token = await this.loadToken();
        if (!token) {
            console.log('[TokenManager] No token found on disk');
            return null;
        }

        return await this.validateToken(token);
    }

    /**
     * Removes the stored token (logout).
     */
    async clearToken() {
        try {
            if (fs.existsSync(this.tokenPath)) {
                fs.unlinkSync(this.tokenPath);
                console.log('[TokenManager] Token cleared from disk');

                // Clear token from githubClient
                const { default: githubClient } = await import('./githubClient.js');
                githubClient.setToken(null);
            }
        } catch (error) {
            console.error('[TokenManager] Error clearing token:', error);
            throw error;
        }
    }

    /**
     * Checks if a token file exists on disk.
     * @returns {boolean}
     */
    tokenExists() {
        return fs.existsSync(this.tokenPath);
    }
}

// Export as singleton instance
export default new TokenManager();
