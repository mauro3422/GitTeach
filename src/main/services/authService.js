import OAuthFlowManager from './OAuthFlowManager.js';
import TokenManager from './TokenManager.js';
import githubClient from './githubClient.js';
import AppLogger from './system/AppLogger.js';

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
        AppLogger.info('AuthService', 'Starting login process...');

        try {
            const result = await this.oauthFlowManager.initiateOAuthFlow();

            if (result.success && result.token) {
                // Set token in githubClient for immediate use
                githubClient.setToken(result.token);
                AppLogger.info('AuthService', 'Login successful');
                return result;
            } else {
                throw new Error('OAuth flow failed');
            }
        } catch (error) {
            AppLogger.error('AuthService', 'Login failed:', error);
            throw error;
        }
    }

    /**
     * Checks if there's a valid saved session.
     * @returns {Promise<Object|null>} User data if valid session exists, null otherwise
     */
    async checkAuth() {
        AppLogger.info('AuthService', 'Checking authentication...');
        return await TokenManager.checkSession();
    }

    /**
     * Logs out the current user by clearing the token.
     */
    async logout() {
        AppLogger.info('AuthService', 'Logging out...');
        await TokenManager.clearToken();
        AppLogger.info('AuthService', 'Logout complete');
    }
}

export default new AuthService();
