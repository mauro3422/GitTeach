// src/renderer/index.js
import { AuthView } from './js/views/auth.js';

import { DashboardView } from './js/views/dashboard.js';
import { ChatComponent } from './js/components/chatComponent.js';
import { ResizableManager } from './js/utils/resizable_manager.js';
import { DropdownComponent } from './js/components/dropdownComponent.js';
import { WidgetGallery } from './js/components/widgetGallery.js';
import { ProfileAnalyzer } from './js/services/profileAnalyzer.js';

import { EditorComponent } from './js/components/editorComponent.js';

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    dashboard: document.getElementById('dashboard-view')
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

    // Use View Transition API for cinematic effect
    if (document.startViewTransition) {
        document.startViewTransition(updateDOM);
    } else {
        updateDOM();
    }
}

// Module initialization
AuthView.init(async () => {
    // 1. Show dashboard immediately for instant feedback
    showView('dashboard');

    // 2. Load data in background
    await DashboardView.updateUserInfo();
    ChatComponent.init();
    EditorComponent.init(); // Modularized

    // Import modular components dynamically
    const { SidebarManager } = await import('./js/components/sidebar_manager.js');
    SidebarManager.init();

    const resizable = new ResizableManager('dashboard-view');
    resizable.init();

    DropdownComponent.init('btn-user-menu', 'user-dropdown');

    // --- AGENTIC ANALYSIS IN BACKGROUND ---
    const username = DashboardView.currentUsername || 'User';

    if (username && username !== 'User') {
        const analyzer = new ProfileAnalyzer();
        const { AIService } = await import('./js/services/aiService.js');

        // 1. Proactive greeting (NATURAL via AI)
        AIService.processIntent("SYSTEM_EVENT: INITIAL_GREETING", username).then(response => {
            ChatComponent.addMessage(response.message, 'ai');
        });

        // 2. Execute analysis with real-time feedback
        analyzer.analyze(username, (data) => {
            // Smart notification handling
            if (typeof data === 'object' && data.type === 'Progreso') {
                ChatComponent.updateProgress(data.percent, data.message);
            } else if (data && data.type === 'DeepMemoryReady') {
                // PHASE 12: Real Proactivity.
                // Instead of pre-cooked message, we tell AI: "You have the memory, say something."
                // We use a special prefix that AIService can intercept or process as system prompt.

                // Small delay to let UI breathe
                setTimeout(() => {
                    AIService.processIntent("SYSTEM_EVENT: DEEP_MEMORY_READY_ACKNOWLEDGE", username).then(response => {
                        // Response comes naturally from LLM
                        ChatComponent.addMessage(response.message, 'ai');
                    });
                }, 1000);
            } else if (typeof data === 'string') {
                ChatComponent.showProactiveStep(data);
            } else if (data && data.message) {
                // Only show important logs in chat
                if (data.type === 'Inventario inicializado' || data.type === 'Error') {
                    ChatComponent.showProactiveStep(`🎯 ${data.type}: ${data.message}`);
                }
            }
        }).then(results => {
            ChatComponent.hideProgress(); // Hide bar when finished
            if (results) {
                // 3. Build RICH context for chat
                // Include languages, repo structure, and code snippets
                const langList = results.mainLangs.length > 0
                    ? results.mainLangs.join(', ')
                    : 'varios lenguajes';

                // Build details for each repo with AI summaries
                const repoDetails = results.deepScan.map(s => {
                    let detail = `### ${s.repo}\n- Estructura: ${s.structure}`;
                    if (Array.isArray(s.auditedSnippets) && s.auditedSnippets.length > 0) {
                        // Prioritize AI summaries over raw snippets
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

                // NOTE: Context is already being set by ProfileAnalyzer internally
                // via the DeepMemoryReady callback. Don't override here.

                // 4. Final feedback (Simplified to let the AI Deep Memory shine)
                setTimeout(() => {
                    const failedCount = results.failedFiles || 0;
                    if (failedCount > 0) {
                        Logger.warn('ANALYZER', `Análisis completado con ${failedCount} fallos de lectura.`);
                    }
                }, 500);
            }
        });
    }
});

// Logout from menu
document.addEventListener('click', async (e) => {
    const logoutBtn = e.target.closest('#menu-logout');
    if (logoutBtn) {
        e.preventDefault();
        console.log("Logout triggered");

        // 1. Clear token in backend
        await window.githubAPI.logout();

        // 2. Reset UI
        // Safest is to reload app to clear in-memory state
        // but for fluidity:
        AuthView.showGuestState();
        showView('login');

        // Optional: Reload to be 100% clean
        window.location.reload();
    }
});

DashboardView.init();

// Initial session verification
async function checkInitialSession() {
    console.log('[App] Starting session verification...');
    showView('login'); // Show base login immediately

    // Initialize editor logic (Markdown Preview)
    initEditor();

    try {
        const user = await window.githubAPI.checkAuth();
        console.log('[App] Resultado checkAuth:', user);

        if (user && !user.error) {
            console.log('[App] User detected, showing persistent profile.');
            AuthView.showReturningUser(user);
        } else {
            console.log('[App] No active session or invalid token.');
        }
    } catch (error) {
        console.error('[App] Critical error in checkInitialSession:', error);
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

    // Mapping for tabs
    const editorTabs = {
        editor: document.getElementById('btn-show-editor'),
        preview: document.getElementById('btn-show-preview'),
        gallery: document.getElementById('btn-show-gallery')
    };

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
    const slidingContainer = document.getElementById('editor-sliding-container');

    function switchTab(activeTab) {
        // Reset classes for the buttons
        Object.values(editorTabs).forEach(el => {
            if (el instanceof HTMLElement) el.classList.remove('active');
        });

        // Sliding logic instead of .hidden
        if (activeTab === 'editor') {
            editorTabs.editor.classList.add('active');
            if (slidingContainer) slidingContainer.style.transform = 'translateX(0%)';
        } else if (activeTab === 'preview') {
            editorTabs.preview.classList.add('active');
            if (slidingContainer) slidingContainer.style.transform = 'translateX(-33.333%)';
            render(); // Activar renderizado
        } else if (activeTab === 'gallery') {
            editorTabs.gallery.classList.add('active');
            if (slidingContainer) slidingContainer.style.transform = 'translateX(-66.666%)';
            WidgetGallery.init(); // Cargar widgets
        }
    }

    editorTabs.editor.addEventListener('click', () => switchTab('editor'));
    editorTabs.preview.addEventListener('click', () => switchTab('preview'));
    if (editorTabs.gallery) {
        editorTabs.gallery.addEventListener('click', () => switchTab('gallery'));
    }
}

