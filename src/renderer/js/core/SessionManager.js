import { AuthView } from '../views/auth.js';
import { AppOrchestrator } from './AppOrchestrator.js';

/**
 * SessionManager - Handles auth checks and logout flows
 */
export class SessionManager {
    static async checkInitialSession() {
        console.log('[SessionManager] Starting session verification...');
        AppOrchestrator.showView('login');

        try {
            const user = await window.githubAPI.checkAuth();
            console.log('[SessionManager] Result:', user);

            if (user && !user.error) {
                console.log('[SessionManager] User detected.');
                AuthView.showReturningUser(user);
                // The callback in AuthView.init will trigger the dashboard load
            }
        } catch (error) {
            console.error('[SessionManager] Critical error:', error);
        }
    }

    static async logout() {
        console.log("[SessionManager] Logout triggered");

        // 1. Clear token in backend
        await window.githubAPI.logout();

        // 2. Reset UI
        AuthView.showGuestState();
        AppOrchestrator.showView('login');

        // Reload to be 100% clean
        window.location.reload();
    }
}
