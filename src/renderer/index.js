// src/renderer/index.js
import { AuthView } from './js/views/auth.js';

import { DashboardView } from './js/views/dashboard.js';
import { ChatComponent } from './js/components/chatComponent.js';
import { ResizableManager } from './js/utils/resizable_manager.js';
import { DropdownComponent } from './js/components/dropdownComponent.js';
import { WidgetGallery } from './js/components/widgetGallery.js';
import { ProfileAnalyzer } from './js/services/profileAnalyzer.js';

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
};

const editorTabs = {
    editor: document.getElementById('btn-show-editor'),
    preview: document.getElementById('btn-show-preview'),
    gallery: document.getElementById('btn-show-gallery'), // New Tab
    containers: {
        editor: document.getElementById('editor-container'),
        preview: document.getElementById('preview-container'),
        gallery: document.getElementById('gallery-container') // New Container
    }
};

function showView(viewName) {
    const updateDOM = () => {
        if (viewName === 'dashboard') {
            views.login.classList.add('hidden');
            views.dashboard.classList.remove('hidden');
        } else {
            views.login.classList.remove('hidden');
            views.dashboard.classList.add('hidden');
        }
    };

    // Usamos View Transition API para un efecto cinematográfico
    if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
    } else {
        updateDOM();
    }
}

// Inicialización de módulos
AuthView.init(async () => {
    // 1. Mostrar dashboard inmediatamente para feedback instantáneo
    showView('dashboard');

    // 2. Cargar datos en segundo plano
    await DashboardView.updateUserInfo();
    ChatComponent.init();

    const resizable = new ResizableManager('dashboard-view');
    resizable.init();
    DropdownComponent.init('btn-user-menu', 'user-dropdown');

    // --- ANÁLISIS AGÉNTICO EN SEGUNDO PLANO ---
    const username = DashboardView.currentUsername || 'User';

    if (username && username !== 'User') {
        const analyzer = new ProfileAnalyzer();
        const { AIService } = await import('./js/services/aiService.js');

        // 1. Saludo Proactivo
        ChatComponent.showInsight(`¡Hola **${username}**! 👋 Soy tu Director de Arte. He empezado a analizar tus repositorios para conocerte mejor.`);

        // 2. Ejecutar análisis con feedback en tiempo real
        analyzer.analyze(username, (data) => {
            // Manejo inteligente de notificaciones
            if (typeof data === 'object' && data.type === 'Progreso') {
                ChatComponent.updateProgress(data.percent, data.message);
            } else if (typeof data === 'string') {
                ChatComponent.showProactiveStep(data);
            } else if (data && data.message) {
                // Solo mostrar logs importantes en el chat
                if (data.type === 'Inventario inicializado' || data.type === 'Error') {
                    ChatComponent.showProactiveStep(`🎯 ${data.type}: ${data.message}`);
                }
            }
        }).then(results => {
            ChatComponent.hideProgress(); // Ocultar barra al finalizar
            if (results) {
                // 3. Construir contexto RICO para el chat
                // Incluir lenguajes, estructura de repos, y snippets de código
                const langList = results.mainLangs.length > 0
                    ? results.mainLangs.join(', ')
                    : 'varios lenguajes';

                // Construir detalles de cada repo con resúmenes de IA
                const repoDetails = results.deepScan.map(s => {
                    let detail = `### ${s.repo}\n- Estructura: ${s.structure}`;
                    if (Array.isArray(s.auditedSnippets) && s.auditedSnippets.length > 0) {
                        // Priorizar resúmenes de IA sobre snippets crudos
                        const summaries = s.auditedSnippets.slice(0, 5).map(f => {
                            if (f.aiSummary) {
                                return `  - ${f.file}: ${f.aiSummary}`;
                            }
                            return `  - ${f.file}`;
                        }).join('\n');
                        detail += `\n- Archivos:\n${summaries}`;
                    }
                    return detail;
                }).join('\n\n');

                // Contexto estructurado con límite de tamaño
                const context = `PERFIL: ${username}
LENGUAJES: ${langList}
RESUMEN: ${results.summary}

REPOSITORIOS ANALIZADOS:
${repoDetails.substring(0, 4000)}`; // Limitar a ~4K chars

                AIService.setSessionContext(context);

                // 4. Feedback final con conocimiento real
                setTimeout(() => {
                    const failedCount = results.failedFiles || 0;
                    if (failedCount > 0) {
                        ChatComponent.showInsight(`✨ **¡Análisis completado!** (con ${failedCount} archivos omitidos por error)`);
                    } else {
                        ChatComponent.showInsight(`✨ **¡Análisis completado!**`);
                    }

                    // Mostrar lo que aprendió
                    if (results.mainLangs.length > 0) {
                        ChatComponent.showInsight(`📊 Veo que trabajas principalmente con **${langList}**.`);
                    }

                    if (results.deepScan.length > 0) {
                        const topRepo = results.deepScan[0];
                        ChatComponent.showInsight(`📂 Tu proyecto más activo parece ser **${topRepo.repo}**.`);
                    }

                    ChatComponent.showInsight(`💡 ${results.summary}`);
                    ChatComponent.showInsight(`¿En qué te gustaría que te ayude? Puedo sugerirte widgets, mejorar tu bio, o analizar un proyecto específico.`);
                }, 500);
            }
        });
    }
});

// Logout desde el menú
// Logout desde el menú
document.addEventListener('click', async (e) => {
    const logoutBtn = e.target.closest('#menu-logout');
    if (logoutBtn) {
        e.preventDefault();
        console.log("Logout triggered");

        // 1. Borrar token en backend
        await window.githubAPI.logout();

        // 2. Resetear UI Check
        // Lo más seguro es recargar la app para limpiar estado en memoria
        // pero si queremos fluidez:
        AuthView.showGuestState();
        showView('login');

        // Optional: Reload to be 100% clean
        window.location.reload();
    }
});

DashboardView.init();

// Verificación inicial de sesión
async function checkInitialSession() {
    console.log('[App] Iniciando verificación de sesión...');
    showView('login'); // Mostrar login base inmediatamente

    // Inicializar lógica del editor (Markdown Preview)
    initEditor();

    try {
        const user = await window.githubAPI.checkAuth();
        console.log('[App] Resultado checkAuth:', user);

        if (user && !user.error) {
            console.log('[App] Usuario detectado, mostrando perfil persistente.');
            AuthView.showReturningUser(user);
        } else {
            console.log('[App] No hay sesión activa o token inválido.');
        }
    } catch (error) {
        console.error('[App] Error crítico en checkInitialSession:', error);
    }
}

checkInitialSession();

// Lógica del Editor y Preview
function initEditor() {
    const editor = document.getElementById('readme-editor');
    const preview = document.getElementById('preview-container');
    const btnEditor = document.getElementById('btn-show-editor');
    const btnPreview = document.getElementById('btn-show-preview');
    const editorContainer = document.getElementById('editor-container');

    if (!editor || !preview) return;

    // 1. Renderizado en tiempo real (Live Preview)
    const render = () => {
        const text = editor.value;
        // Usamos 'marked' que ya está cargado por CDN en index.html
        preview.innerHTML = window.marked ? window.marked.parse(text) : text;
    };

    // Escuchar input manual Y programático (dispatchEvent)
    editor.addEventListener('input', render);

    // Render inicial
    render();

    // --- TABS DEL EDITOR ---
    function switchTab(activeTab) {
        // Reset classes
        Object.values(editorTabs).forEach(el => {
            if (el instanceof HTMLElement) el.classList.remove('active');
        });
        Object.values(editorTabs.containers).forEach(el => el.classList.add('hidden'));

        // Activate selected
        if (activeTab === 'editor') {
            editorTabs.editor.classList.add('active');
            editorTabs.containers.editor.classList.remove('hidden');
        } else if (activeTab === 'preview') {
            editorTabs.preview.classList.add('active');
            editorTabs.containers.preview.classList.remove('hidden');
            render(); // Activar renderizado
        } else if (activeTab === 'gallery') {
            editorTabs.gallery.classList.add('active');
            editorTabs.containers.gallery.classList.remove('hidden');
            WidgetGallery.init(); // Cargar widgets
        }
    }

    editorTabs.editor.addEventListener('click', () => switchTab('editor'));
    editorTabs.preview.addEventListener('click', () => switchTab('preview'));
    if (editorTabs.gallery) {
        editorTabs.gallery.addEventListener('click', () => switchTab('gallery'));
    }
}

