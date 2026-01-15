/**
 * AppOrchestrator - Manages view switching and transitions
 */
export class AppOrchestrator {
    static views = {
        login: document.getElementById('login-view'),
        dashboard: document.getElementById('dashboard-view')
    };

    static showView(viewName) {
        const updateDOM = () => {
            if (viewName === 'dashboard') {
                this.views.login.classList.add('hidden');
                this.views.dashboard.classList.remove('hidden');
            } else {
                this.views.login.classList.remove('hidden');
                this.views.dashboard.classList.add('hidden');
            }
        };

        // Use View Transition API for cinematic effect
        if (document.startViewTransition) {
            document.startViewTransition(updateDOM);
        } else {
            updateDOM();
        }
    }
}
