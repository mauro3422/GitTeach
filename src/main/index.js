// src/main/index.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Import specialized services (SOLID)
const authService = require('./services/authService');
const profileService = require('./services/profileService');
const repoService = require('./services/repoService');
const cacheService = require('./services/cacheService');

// --- NOTE: LFM 2.5 model runs via llama-server.exe (llama.cpp) ---
// Endpoint: http://localhost:8000/v1/chat/completions

// --- IPC HANDLERS ---

// Authentication
ipcMain.handle('github:login', async () => {
    try {
        return await authService.login();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:check-auth', async () => {
    try {
        console.log('[Main] github:check-auth request received');
        return await authService.checkAuth();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.on('github:logout', () => {
    console.log('[Main] Logout received');
    authService.logout();
});

// Profile and Data
ipcMain.handle('github:get-user', async () => {
    try {
        return await profileService.getUserData();
    } catch (error) {
        return { error: error.message };
    }
});

// Profile README
ipcMain.handle('github:get-profile-readme', async (event, username) => {
    try {
        return await profileService.getProfileReadme(username);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:update-profile-readme', async (event, { username, content, sha }) => {
    try {
        return await profileService.updateProfileReadme(username, content, sha);
    } catch (error) {
        return { error: error.message };
    }
});

// Repositories
ipcMain.handle('github:list-repos', async () => {
    try {
        return await repoService.listUserRepos();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:get-repo-readme', async (event, { owner, repo }) => {
    try {
        return await repoService.getRepoReadme(owner, repo);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:get-repo-tree', async (event, { owner, repo, recursive }) => {
    try {
        return await repoService.getRepoTree(owner, repo, recursive);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:create-profile-repo', async (event, username) => {
    try {
        return await repoService.createProfileRepo(username);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:create-workflow', async (event, { username, content }) => {
    try {
        return await repoService.createWorkflow(username, content);
    } catch (error) {
        return { error: error.message };
    }
});

// --- COMMIT HANDLERS (Fork Forensics) ---
ipcMain.handle('github:get-user-commits', async (event, { owner, repo, author }) => {
    try {
        return await repoService.getUserCommits(owner, repo, author);
    } catch (error) {
        console.warn('[Main] getUserCommits error:', error.message);
        return { error: error.message, data: [] };
    }
});

ipcMain.handle('github:get-commit-diff', async (event, { owner, repo, sha }) => {
    try {
        return await repoService.getCommitDiff(owner, repo, sha);
    } catch (error) {
        return { error: error.message };
    }
});

// --- FILE CONTENT (This handler was missing!) ---
ipcMain.handle('github:get-file-content', async (event, { owner, repo, path }) => {
    try {
        return await repoService.getFileContent(owner, repo, path);
    } catch (error) {
        return { error: error.message };
    }
});

// --- CACHE SERVICE HANDLERS ---
ipcMain.handle('cache:get-repo', async (event, { owner, repo }) => {
    try {
        return cacheService.getRepoCache(owner, repo);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('cache:set-repo', async (event, { owner, repo, data }) => {
    cacheService.setRepoCache(owner, repo, data);
    return { success: true };
});

ipcMain.handle('cache:needs-update', async (event, { owner, repo, filePath, sha }) => {
    try {
        return cacheService.needsUpdate(owner, repo, filePath, sha);
    } catch (error) {
        return true; // Assume needs update if error
    }
});

ipcMain.handle('cache:set-file-summary', async (event, { owner, repo, filePath, sha, summary, content }) => {
    cacheService.setFileSummary(owner, repo, filePath, sha, summary, content);
    return { success: true };
});

ipcMain.handle('cache:get-file-summary', async (event, { owner, repo, filePath }) => {
    try {
        return cacheService.getFileSummary(owner, repo, filePath);
    } catch (error) {
        return null;
    }
});

ipcMain.handle('cache:has-repo-changed', async (event, { owner, repo, treeSha }) => {
    try {
        return cacheService.hasRepoChanged(owner, repo, treeSha);
    } catch (error) {
        return true; // Assume changed if error
    }
});

ipcMain.handle('cache:set-repo-tree-sha', async (event, { owner, repo, treeSha }) => {
    cacheService.setRepoTreeSha(owner, repo, treeSha);
    return { success: true };
});

ipcMain.handle('cache:get-stats', async () => {
    try {
        return cacheService.getStats();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('cache:clear', async () => {
    cacheService.clearCache();
    return { success: true };
});

ipcMain.handle('cache:get-developer-dna', async (event, username) => {
    try {
        return cacheService.getDeveloperDNA(username);
    } catch (error) {
        return null;
    }
});

ipcMain.handle('cache:set-developer-dna', async (event, { username, dna }) => {
    cacheService.setDeveloperDNA(username, dna);
    return { success: true };
});

// --- DEV TOOLS & LOGGING ---

// --- NETWORK INTERCEPTOR: Fix Origin/Referer for Widgets ---
app.whenReady().then(() => {
    const { session } = require('electron');
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://*.vercel.app/*', 'https://*.herokuapp.com/*', 'https://*.githubusercontent.com/*'] },
        (details, callback) => {
            // Spoofing identity to look like a real browser from GitHub
            details.requestHeaders['Origin'] = 'https://github.com';
            details.requestHeaders['Referer'] = 'https://github.com/';
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            details.requestHeaders['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
            details.requestHeaders['Accept-Language'] = 'es-ES,es;q=0.9,en;q=0.8';
            details.requestHeaders['Sec-Fetch-Dest'] = 'image';
            details.requestHeaders['Sec-Fetch-Mode'] = 'no-cors';
            details.requestHeaders['Sec-Fetch-Site'] = 'cross-site';
            details.requestHeaders['DNT'] = '1';
            details.requestHeaders['Upgrade-Insecure-Requests'] = '1';

            // Sec-CH-UA headers (Modern Chrome identification)
            details.requestHeaders['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
            details.requestHeaders['sec-ch-ua-mobile'] = '?0';
            details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';

            callback({ requestHeaders: details.requestHeaders });
        }
    );
});

ipcMain.on('dev:export-prompt', (event, prompt) => {
    // Dev Tools Export
    console.log('[Dev] Export Prompt solicitado.');
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../scripts/current_prompt.json');
    try {
        fs.writeFileSync(filePath, JSON.stringify({ systemPrompt: prompt }, null, 4));
        console.log('[Dev] Prompt exportado a:', filePath);
    } catch (e) {
        console.error('[Dev] Error exportando prompt:', e);
    }
});

// --- IPC BRIDGE: Get Image as Base64 (Anti-Bot Bypass) ---
ipcMain.handle('utils:get-image-base64', async (event, url) => {
    const fetchWithHeaders = async (targetUrl, mode = 'github') => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        if (mode === 'github') {
            headers['Referer'] = 'https://github.com/';
            headers['Origin'] = 'https://github.com';
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            return await fetch(targetUrl, {
                headers,
                signal: controller.signal,
                redirect: 'follow'
            });
        } finally {
            clearTimeout(timeoutId);
        }
    };

    try {
        console.log(`[Main-Bridge] 🚀 Fetching: ${url}`);

        // Intento 1: Identidad GitHub
        let response = await fetchWithHeaders(url, 'github');

        // Intento 2: Navegador Limpio (Si 1 falla con 4xx o 5xx)
        if (!response.ok) {
            console.warn(`[Main-Bridge] ⚠️ Intento 1 falló (${response.status}). Reintentando como Navegador Limpio...`);
            response = await fetchWithHeaders(url, 'clean');
        }

        // Intento 3: Weserv Proxy (Estrategia Final)
        if (!response.ok) {
            console.warn(`[Main-Bridge] ⚠️ Intento 2 falló (${response.status}). Saltando a Weserv...`);
            const cleanUrl = url.replace(/^https?:\/\//, '');
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&nps=1&output=png`;
            response = await fetchWithHeaders(proxyUrl, 'clean');
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        const base64 = Buffer.from(buffer).toString('base64');

        console.log(`[Main-Bridge] ✅ ÉXITO TOTAL: ${url.substring(0, 50)}...`);
        return { success: true, data: `data:${contentType};base64,${base64}` };
    } catch (error) {
        console.error(`[Main-Bridge] ❌ FALLO FINAL para ${url}:`, error.message);
        return { success: false, error: error.message };
    }
});

// --- AI HEALTH MONITOR: Silent check from Main (v16.0) ---
let lastAIStatus = false;
async function performAIHealthCheck() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);

        const res = await fetch('http://localhost:8000/v1/models', {
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        const isOnline = res.ok;
        if (isOnline !== lastAIStatus) {
            lastAIStatus = isOnline;
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => win.webContents.send('ai:status-change', isOnline));
        }
        return isOnline;
    } catch (e) {
        if (lastAIStatus !== false) {
            lastAIStatus = false;
            const windows = BrowserWindow.getAllWindows();
            windows.forEach(win => win.webContents.send('ai:status-change', false));
        }
        return false;
    }
}

// Start periodic monitor
setInterval(performAIHealthCheck, 8000);

ipcMain.handle('utils:check-ai-health', async () => {
    return await performAIHealthCheck();
});

// LOG BRIDGE: Renderer -> Terminal
ipcMain.on('app:log', (event, msg) => {
    console.log(`[App Renderer] ${msg}`);
});


// --- CICLO DE VIDA DE LA APP ---

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#0d1117',
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, '../renderer/index.html'));

    // DEBUG: Solo abrir DevTools en desarrollo
    if (process.env.NODE_ENV !== 'production') {
        win.webContents.openDevTools({ mode: 'detach' });
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
