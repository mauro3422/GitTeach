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
    getUserCommits: (owner, repo, author) => ipcRenderer.invoke('github:get-user-commits', { owner, repo, author }),
    getCommitDiff: (owner, repo, sha) => ipcRenderer.invoke('github:get-commit-diff', { owner, repo, sha }),
    exportPrompt: (prompt) => ipcRenderer.send('dev:export-prompt', prompt),
    logToTerminal: (msg) => ipcRenderer.send('app:log', msg),
    onAIStatusChange: (callback) => ipcRenderer.on('ai:status-change', callback)
});

// Información básica del sistema si hace falta
contextBridge.exposeInMainWorld('systemInfo', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
});

// API de Cache para análisis incremental
contextBridge.exposeInMainWorld('cacheAPI', {
    getRepo: (owner, repo) => ipcRenderer.invoke('cache:get-repo', { owner, repo }),
    setRepo: (owner, repo, data) => ipcRenderer.invoke('cache:set-repo', { owner, repo, data }),
    needsUpdate: (owner, repo, filePath, sha) => ipcRenderer.invoke('cache:needs-update', { owner, repo, filePath, sha }),
    setFileSummary: (owner, repo, filePath, sha, summary, content) =>
        ipcRenderer.invoke('cache:set-file-summary', { owner, repo, filePath, sha, summary, content }),
    getFileSummary: (owner, repo, filePath) => ipcRenderer.invoke('cache:get-file-summary', { owner, repo, filePath }),
    hasRepoChanged: (owner, repo, treeSha) => ipcRenderer.invoke('cache:has-repo-changed', { owner, repo, treeSha }),
    setRepoTreeSha: (owner, repo, treeSha) => ipcRenderer.invoke('cache:set-repo-tree-sha', { owner, repo, treeSha }),
    getStats: () => ipcRenderer.invoke('cache:get-stats'),
    clear: () => ipcRenderer.invoke('cache:clear'),
    getDeveloperDNA: (username) => ipcRenderer.invoke('cache:get-developer-dna', username),
    setDeveloperDNA: (username, dna) => ipcRenderer.invoke('cache:set-developer-dna', { username, dna })
});

// Bridge de utilidad para bypass de red
contextBridge.exposeInMainWorld('utilsAPI', {
    getImageBase64: (url) => ipcRenderer.invoke('utils:get-image-base64', url),
    checkAIHealth: () => ipcRenderer.invoke('utils:check-ai-health')
});

// Información básica del sistema si hace falta
