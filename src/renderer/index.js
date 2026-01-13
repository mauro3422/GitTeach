// src/renderer/index.js
import { AuthView } from './js/views/auth.js';
import { AuthService } from './js/services/authService.js';
import { ProfileService } from './js/services/profileService.js';
import { RepoService } from './js/services/repoService.js';
import { DashboardView } from './js/views/dashboard.js';
import { ChatComponent } from './js/components/chatComponent.js';
import { ResizableManager } from './js/utils/resizable_manager.js';
import { DropdownComponent } from './js/components/dropdownComponent.js';
import { WidgetGallery } from './js/components/widgetGallery.js';

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
    await DashboardView.updateUserInfo();
    ChatComponent.init();

    // Inicializar resizers del Dashboard
    const resizable = new ResizableManager('dashboard-view');
    resizable.init();

    // Inicializar Menú de Usuario
    DropdownComponent.init('btn-user-menu', 'user-dropdown');

    showView('dashboard');
});

// Logout desde el menú
document.addEventListener('click', async (e) => {
    if (e.target.id === 'menu-logout') {
        e.preventDefault();
        // Llamamos al logout del dashboard view que ya maneja la pestaña y el token
        await window.githubAPI.logout();
        showView('login');
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
    editorTabs.gallery.addEventListener('click', () => switchTab('gallery'));
}

