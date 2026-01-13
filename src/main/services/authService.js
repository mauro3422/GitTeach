const { shell, app } = require('electron');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const githubClient = require('./githubClient');

const CLIENT_ID = 'Ov23liHOkbOazRex4DCI';
const CLIENT_SECRET = '3d69b5853f0e1089fda660e580ebd27a12a923d0';
const REDIRECT_URI = 'http://localhost:3000/callback';

class AuthService {
    constructor() {
        this.server = null;
        this.tokenPath = path.join(app.getPath('userData'), 'token.json');
    }

    async login() {
        return new Promise((resolve, reject) => {
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

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user,repo`;
            shell.openExternal(authUrl);
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
        const token = this.loadToken();
        if (!token) {
            console.log('[AuthService] No se encontró token en disco.');
            return null;
        }

        console.log('[AuthService] Token cargado, validando con GitHub...');
        githubClient.setToken(token);
        try {
            const profileService = require('./profileService');
            const user = await profileService.getUserData();
            if (user && !user.error) {
                console.log('[AuthService] Sesión válida para:', user.login);
                return user;
            }
            console.warn('[AuthService] Token expirado o inválido.');
            return null;
        } catch (e) {
            console.error('[AuthService] Error al validar sesión:', e.message);
            return null;
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
