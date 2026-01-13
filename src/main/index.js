// src/main/index.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Importamos los servicios especializados (SOLID)
const authService = require('./services/authService');
const profileService = require('./services/profileService');
const repoService = require('./services/repoService');

// --- MANEJADORES IPC ---

// Autenticación
ipcMain.handle('github:login', async () => {
    return await authService.login();
});

ipcMain.handle('github:check-auth', async () => {
    console.log('[Main] Petición github:check-auth recibida');
    return await authService.checkAuth();
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
    return await profileService.getProfileReadme(username);
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
    return await repoService.listUserRepos();
});

ipcMain.handle('github:create-profile-repo', async (event, username) => {
    try {
        return await repoService.createProfileRepo(username);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.handle('github:get-file-content', async (event, { owner, repo, path }) => {
    try {
        return await repoService.getFileContent(owner, repo, path);
    } catch (error) {
        return { error: error.message };
    }
});

ipcMain.on('dev:export-prompt', (event, prompt) => {
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../scripts/current_prompt.json');
    fs.writeFileSync(filePath, JSON.stringify({ systemPrompt: prompt }, null, 4));
    console.log('[Dev] Prompt exportado a scripts/current_prompt.json');
    console.log('[Dev] Prompt exportado a scripts/current_prompt.json');
});

ipcMain.on('app:log', (event, arg) => {
    // Imprime directamente en la terminal donde corre "npm start"
    console.log('[App Renderer]', arg);
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
