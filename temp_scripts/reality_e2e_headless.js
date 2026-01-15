const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function runRealTest() {
    console.log(' INICIANDO TEST E2E HEADLESS...');
    
    // Simular el entorno del renderer dentro del proceso principal para usar las clases reales
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Inyectar el código de test directamente en la ventana oculta
    const testScript = \
        (async () => {
            try {
                const { AIService } = await import('file:///\');
                const { ProfileAnalyzer } = await import('file:///\');
                const { CacheRepository } = await import('file:///\');

                console.log('[HEADLESS] Entorno Renderer listo');
                
                // Mocks necesarios
                window.githubAPI = {
                    listRepos: async () => [{ name: 'TestRepo', full_name: 'mauro3422/TestRepo', language: 'JavaScript' }],
                    getProfileReadme: async () => 'Impact Profile Test',
                    getRepoTree: async () => ({ tree: [{ path: 'main.js', type: 'blob', size: 500, sha: 's1' }], sha: 't1' }),
                    getFileContent: async () => ({ content: btoa('console.log("Real Logic Test");'), sha: 'f1' }),
                    checkAuth: async () => ({ login: 'mauro3422' })
                };
                window.utilsAPI = { checkAIHealth: async () => true };
                window.AI_CONFIG = { endpoint: 'http://localhost:8000/v1/chat/completions' };

                const analyzer = new ProfileAnalyzer();
                console.log('[HEADLESS] Iniciando análisis real...');
                
                const results = await analyzer.analyze('mauro3422', (p) => {
                    console.log(\\\[PROGRESO] \\\\\\);
                });

                if (analyzer.fullIntelligencePromise) {
                    console.log('[HEADLESS] Esperando Workers e Inteligencia Profunda...');
                    await analyzer.fullIntelligencePromise;
                }

                console.log('--- RESULTADO FINAL ---');
                console.log('Summary length:', results.summary?.length);
                console.log('--- TEST EXITOSO ---');
            } catch (e) {
                console.error('[HEADLESS ERROR]', e);
            }
        })();
    \;

    win.webContents.on('console-message', (event, level, message) => {
        console.log(message);
    });

    await win.loadURL('about:blank');
    await win.webContents.executeJavaScript(testScript);
    
    // Mantener vivo para ver la salida hasta completar
    setTimeout(() => app.quit(), 30000); 
}

app.whenReady().then(runRealTest);
