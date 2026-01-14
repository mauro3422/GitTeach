const { shell, app } = require('electron');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const githubClient = require('./githubClient');

// Cargar credenciales desde .env (NUNCA hardcodear secrets)
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

const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23liHOkbOazRex4DCI';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

// Validar que tenemos el secret
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
            console.log('[AuthService] Iniciando flujo OAuth...');
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
            console.log('[AuthService] Abriendo URL externa:', authUrl);
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
        console.log('[AuthService] Verificando sesión guardada...');
        console.log('[AuthService] Token Path:', this.tokenPath);

        let token;
        try {
            token = this.loadToken();
        } catch (e) {
            console.error('[AuthService] Error loading token from disk:', e);
            return null;
        }

        if (!token) {
            console.log('[AuthService] No se encontró token en disco.');
            return null;
        }

        console.log('[AuthService] Token cargado de disco, validando con GitHub...');
        githubClient.setToken(token);
        try {
            const profileService = require('./profileService');
            console.log('[AuthService] Calling profileService.getUserData()...');
            const user = await profileService.getUserData();
            console.log('[AuthService] getUserData returned:', user ? user.login : 'NULL');

            if (user && !user.error) {
                console.log('[AuthService] Sesión válida para:', user.login);
                return user;
            }
            console.warn('[AuthService] Token expirado o inválido response:', user);
            return null;
        } catch (e) {
            console.error('[AuthService] Error al validar sesión:', e.message);
            // Si falla la validación, tal vez el token es vijeo, lo borramos?
            // Dejamost que el usuario decida reloguearse.
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

module.exports = new AuthService();
