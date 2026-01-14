// src/main/index.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Importamos los servicios especializados (SOLID)
const authService = require('./services/authService');
const profileService = require('./services/profileService');
const repoService = require('./services/repoService');
const cacheService = require('./services/cacheService');

// --- NOTA: El modelo LFM 2.5 corre via llama-server.exe (llama.cpp) ---
// Endpoint: http://localhost:8000/v1/chat/completions

// --- MANEJADORES IPC ---

// Autenticación
ipcMain.handle('github:login', async () => {
    try {
        return await authService.login();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:check-auth', async () => {
    try {
        console.log('[Main] Petición github:check-auth recibida');
        return await authService.checkAuth();
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.on('github:logout', () => {
    console.log('[Main] Logout recibido');
    authService.logout();
});

// Perfil y Datos
ipcMain.handle('github:get-user', async () => {
    try {
        return await profileService.getUserData();
    } catch (error) {
        return { error: error.message };
    }
});

// README de Perfil
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

// Repositorios
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

// --- FILE CONTENT (Faltaba este handler!) ---
ipcMain.handle('github:get-file-content', async (event, { owner, repo, path }) => {
    try {
        return await repoService.getFileContent(owner, repo, path);
    } catch (error) {
        return { error: error.message };
    }
});

// --- CACHE SERVICE HANDLERS ---
ipcMain.handle('cache:get-repo', async (event, { owner, repo }) => {
    return cacheService.getRepoCache(owner, repo);
});

ipcMain.handle('cache:set-repo', async (event, { owner, repo, data }) => {
    cacheService.setRepoCache(owner, repo, data);
    return { success: true };
});

ipcMain.handle('cache:needs-update', async (event, { owner, repo, filePath, sha }) => {
    return cacheService.needsUpdate(owner, repo, filePath, sha);
});

ipcMain.handle('cache:set-file-summary', async (event, { owner, repo, filePath, sha, summary, content }) => {
    cacheService.setFileSummary(owner, repo, filePath, sha, summary, content);
    return { success: true };
});

ipcMain.handle('cache:get-file-summary', async (event, { owner, repo, filePath }) => {
    return cacheService.getFileSummary(owner, repo, filePath);
});

ipcMain.handle('cache:has-repo-changed', async (event, { owner, repo, treeSha }) => {
    return cacheService.hasRepoChanged(owner, repo, treeSha);
});

ipcMain.handle('cache:set-repo-tree-sha', async (event, { owner, repo, treeSha }) => {
    cacheService.setRepoTreeSha(owner, repo, treeSha);
    return { success: true };
});

ipcMain.handle('cache:get-stats', async () => {
    return cacheService.getStats();
});

ipcMain.handle('cache:clear', async () => {
    cacheService.clearCache();
    return { success: true };
});

// --- DEV TOOLS & LOGGING ---

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
