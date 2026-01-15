import { shell, app } from 'electron';
import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import githubClient from './githubClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from .env (NEVER hardcode secrets)
function loadEnv() {
    const envPath = path.join(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        });
    }
}
loadEnv();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

// Validate OAuth credentials
if (!CLIENT_ID) {
    console.error('[AuthService] ERROR: GITHUB_CLIENT_ID not found in .env file!');
}
if (!CLIENT_SECRET) {
    console.error('[AuthService] ERROR: GITHUB_CLIENT_SECRET not found in .env file!');
}

class AuthService {
    constructor() {
        this.server = null;
        this.tokenPath = path.join(app.getPath('userData'), 'token.json');
    }

    async login() {
        return new Promise((resolve, reject) => {
            console.log('[AuthService] Starting OAuth flow...');
            if (this.server) this.server.close();

            this.server = http.createServer(async (req, res) => {
                const queryData = url.parse(req.url, true).query;
                if (queryData.code) {
                    res.end('<h1>Autorizado!</h1><p>Vuelve a GitTeach.</p>');
                    this.server.close();
                    try {
                        const token = await this.exchangeCodeForToken(queryData.code);
                        this.saveToken(token);
                        githubClient.setToken(token);
                        resolve({ success: true, token });
                    } catch (e) { reject(e); }
                }
            }).listen(3000);

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user,repo,workflow`;
            console.log('[AuthService] Opening external URL:', authUrl);
            shell.openExternal(authUrl).catch(err => {
                console.error('[AuthService] Error abriendo external URL:', err);
                reject(err);
            });
        });
    }

    saveToken(token) {
        fs.writeFileSync(this.tokenPath, JSON.stringify({ token }));
    }

    loadToken() {
        if (fs.existsSync(this.tokenPath)) {
            const data = JSON.parse(fs.readFileSync(this.tokenPath));
            return data.token;
        }
        return null;
    }

    async checkAuth() {
        console.log('[AuthService] Verifying saved session...');
        console.log('[AuthService] Token Path:', this.tokenPath);

        let token;
        try {
            token = this.loadToken();
        } catch (e) {
            console.error('[AuthService] Error loading token from disk:', e);
            return null;
        }

        if (!token) {
            console.log('[AuthService] No token found on disk.');
            return null;
        }

        console.log('[AuthService] Token loaded from disk, validating with GitHub...');
        githubClient.setToken(token);
        try {
            // Dynamic import to avoid circular dependency if any
            const profileService = (await import('./profileService.js')).default;
            console.log('[AuthService] Calling profileService.getUserData()...');
            const user = await profileService.getUserData();
            console.log('[AuthService] getUserData returned:', user ? user.login : 'NULL');

            if (user && !user.error) {
                console.log('[AuthService] Valid session for:', user.login);
                return user;
            }
            console.warn('[AuthService] Token expired or invalid response:', user);
            return null;
        } catch (e) {
            console.error('[AuthService] Error validating session:', e.message);
            return { error: e.message };
        }
    }

    logout() {
        if (fs.existsSync(this.tokenPath)) {
            fs.unlinkSync(this.tokenPath);
        }
        githubClient.setToken(null);
    }

    async exchangeCodeForToken(code) {
        const data = await githubClient.request({
            method: 'POST',
            url: 'https://github.com/login/oauth/access_token',
            body: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI
            }
        });
        return data.access_token;
    }
}

export default new AuthService();
