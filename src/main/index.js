// src/main/index.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Importamos los servicios especializados (SOLID)
const authService = require('./services/authService');
const profileService = require('./services/profileService');
const repoService = require('./services/repoService');

// --- OPTIMIZACIÓN GPU PARA AGENTES PARALELOS ---
// Configuramos el entorno para que Ollama permita múltiples slots (Workers)
process.env.OLLAMA_NUM_PARALLEL = "4"; // Permite hasta 4 inferencias simultáneas
process.env.OLLAMA_MAX_LOADED_MODELS = "2"; // Permite tener el modelo de visión y chat cargados

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

    // DEBUG: Abrir consola para ver errores del Renderer
    win.webContents.openDevTools({ mode: 'detach' });
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
