// src/renderer/index.js
import { AuthView } from './js/views/auth.js';
import { DashboardView } from './js/views/dashboard.js';
import {
    AppOrchestrator,
    SessionManager,
    DashboardManager
} from './js/core/index.js';

// 1. Module initialization
AuthView.init(async () => {
    // Show dashboard immediately
    AppOrchestrator.showView('dashboard');

    // Orchestrate full dashboard load
    await DashboardManager.load();
});

// 2. Global Event Listeners
document.addEventListener('click', async (e) => {
    if (e.target.closest('#menu-logout')) {
        await SessionManager.logout();
    }
});

// 3. App Bootstrap
DashboardView.init();
SessionManager.checkInitialSession();
