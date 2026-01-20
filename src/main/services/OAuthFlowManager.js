import { shell } from 'electron';
import AuthServer from './AuthServer.js';
import TokenManager from './TokenManager.js';

/**
 * OAuthFlowManager - Orchestrates the shell.openExternal call and handles the code-to-token exchange.
 */
class OAuthFlowManager {
    constructor() {
        this.authServer = new AuthServer();
    }

    /**
     * Initiates the OAuth flow by starting the server and opening the GitHub auth URL.
     * @returns {Promise<{success: boolean, token?: string}>}
     */
    async initiateOAuthFlow() {
        return new Promise(async (resolve, reject) => {
            try {
                // Start the auth server to listen for callback
                await this.authServer.startServer(async (code) => {
                    try {
                        // Exchange code for token
                        const token = await this.exchangeCodeForToken(code);

                        // Save token via TokenManager
                        await TokenManager.saveToken(token);

                        resolve({ success: true, token });
                    } catch (error) {
                        reject(error);
                    }
                });

                // Open GitHub auth URL in external browser
                const authUrl = this.buildAuthUrl();
                console.log('[OAuthFlowManager] Opening external URL:', authUrl);
                await shell.openExternal(authUrl);
            } catch (error) {
                console.error('[OAuthFlowManager] Error initiating OAuth flow:', error);
                reject(error);
            }
        });
    }

    /**
     * Builds the GitHub OAuth authorization URL.
     * @returns {string}
     */
    buildAuthUrl() {
        const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const REDIRECT_URI = 'http://localhost:3000/callback';

        if (!CLIENT_ID) {
            throw new Error('GITHUB_CLIENT_ID not found in environment');
        }

        return `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user,repo,workflow`;
    }

    /**
     * Exchanges authorization code for access token.
     * @param {string} code - The authorization code from GitHub callback
     * @returns {Promise<string>} The access token
     */
    async exchangeCodeForToken(code) {
        const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
        const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
        const REDIRECT_URI = 'http://localhost:3000/callback';

        if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('GitHub OAuth credentials not found in environment');
        }

        // Import githubClient dynamically to avoid circular dependencies
        const { default: githubClient } = await import('./githubClient.js');

        const response = await githubClient.request({
            method: 'POST',
            url: 'https://github.com/login/oauth/access_token',
            body: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI
            }
        });

        if (!response.access_token) {
            throw new Error('Failed to exchange code for token');
        }

        return response.access_token;
    }

    /**
     * Stops the OAuth flow by closing the auth server.
     */
    stopOAuthFlow() {
        this.authServer.stopServer();
    }
}

export default OAuthFlowManager;
