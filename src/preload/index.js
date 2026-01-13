const { contextBridge, ipcRenderer } = require('electron');

// Exponemos una API segura enfocada en GitHub
contextBridge.exposeInMainWorld('githubAPI', {
    login: () => ipcRenderer.invoke('github:login'),
    logout: () => ipcRenderer.send('github:logout'),
    getUserData: () => ipcRenderer.invoke('github:get-user'),
    getProfileReadme: (username) => ipcRenderer.invoke('github:get-profile-readme', username),
    getRepoReadme: (owner, repo) => ipcRenderer.invoke('github:get-repo-readme', { owner, repo }),
    updateProfileReadme: (username, content, sha) => ipcRenderer.invoke('github:update-profile-readme', { username, content, sha }),
    createProfileRepo: (username) => ipcRenderer.invoke('github:create-profile-repo', username),
    listRepos: () => ipcRenderer.invoke('github:list-repos'),
    getRepoTree: (owner, repo, recursive) => ipcRenderer.invoke('github:get-repo-tree', { owner, repo, recursive }),
    getFileContent: (owner, repo, path) => ipcRenderer.invoke('github:get-file-content', { owner, repo, path }),
    checkAuth: () => ipcRenderer.invoke('github:check-auth'),
    createWorkflow: (username, content) => ipcRenderer.invoke('github:create-workflow', { username, content }),
    exportPrompt: (prompt) => ipcRenderer.send('dev:export-prompt', prompt),
    logToTerminal: (msg) => ipcRenderer.send('app:log', msg)
});

// Información básica del sistema si hace falta
contextBridge.exposeInMainWorld('systemInfo', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});
