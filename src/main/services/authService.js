import OAuthFlowManager from './OAuthFlowManager.js';
import TokenManager from './TokenManager.js';
import githubClient from './githubClient.js';

/**
 * AuthService - Simplified orchestrator delegating to OAuthFlowManager and TokenManager.
 */
class AuthService {
    constructor() {
        this.oauthFlowManager = new OAuthFlowManager();
    }

    /**
     * Initiates the login process using OAuth flow.
     * @returns {Promise<{success: boolean, token?: string}>}
     */
    async login() {
        console.log('[AuthService] Starting login process...');

        try {
            const result = await this.oauthFlowManager.initiateOAuthFlow();

            if (result.success && result.token) {
                // Set token in githubClient for immediate use
                githubClient.setToken(result.token);
                console.log('[AuthService] Login successful');
                return result;
            } else {
                throw new Error('OAuth flow failed');
            }
        } catch (error) {
            console.error('[AuthService] Login failed:', error);
            throw error;
        }
    }

    /**
     * Checks if there's a valid saved session.
     * @returns {Promise<Object|null>} User data if valid session exists, null otherwise
     */
    async checkAuth() {
        console.log('[AuthService] Checking authentication...');
        return await TokenManager.checkSession();
    }

    /**
     * Logs out the current user by clearing the token.
     */
    async logout() {
        console.log('[AuthService] Logging out...');
        await TokenManager.clearToken();
        console.log('[AuthService] Logout complete');
    }
}

export default new AuthService();
