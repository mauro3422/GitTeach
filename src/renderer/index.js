// src/renderer/index.js
import { AuthView } from './js/views/auth.js';
import { DashboardView } from './js/views/dashboard.js';
import { ChatComponent } from './js/components/chatComponent.js';
import { ResizableManager } from './js/utils/resizable_manager.js';
import { DropdownComponent } from './js/components/dropdownComponent.js';

const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');

function showView(viewName) {
    const updateDOM = () => {
        if (viewName === 'dashboard') {
            loginView.classList.add('hidden');
            dashboardView.classList.remove('hidden');
        } else {
            loginView.classList.remove('hidden');
            dashboardView.classList.add('hidden');
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

    // 2. Cambio de Pestañas (Editor vs Preview)
    const switchTab = (mode) => {
        if (mode === 'editor') {
            editorContainer.classList.remove('hidden');
            preview.classList.add('hidden');
            btnEditor.classList.add('active');
            btnPreview.classList.remove('active');
        } else {
            editorContainer.classList.add('hidden');
            preview.classList.remove('hidden');
            btnEditor.classList.remove('active');
            btnPreview.classList.add('active');
            render(); // Asegurar render al cambiar
        }
    };

    btnEditor.addEventListener('click', () => switchTab('editor'));
    btnPreview.addEventListener('click', () => switchTab('preview'));
}
