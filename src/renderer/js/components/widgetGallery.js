import { ToolRegistry } from '../services/toolRegistry.js';
import { DashboardView } from '../views/dashboard.js';
import { widgetCardRenderer } from './WidgetCardRenderer.js';
import { widgetEventHandler } from './WidgetEventHandler.js';

export class WidgetGallery {
    constructor() {
        this.isInitialized = false;
        this.lastUsername = null;
    }

    async init() {
        // Fuente de verdad: DashboardView o DOM as fallback
        let username = DashboardView.currentUsername || document.getElementById('user-name')?.dataset.login;

        // Si no hay usuario en el DashboardView, intentamos recuperarlo proactivamente
        if (!username || username === 'Usuario' || username === 'User') {
            console.log('[WidgetGallery] Username not ready, fetching for previews...');
            const user = await window.githubAPI.getUserData();
            if (user && !user.error) {
                username = user.login;
                DashboardView.currentUsername = username;
            } else {
                // Fallback definitivo para previsualizaciones
                username = 'mauro3422';
            }
        }

        // Cache Lógica: Evitar regenerar si ya está inicializado con el mismo usuario
        if (this.isInitialized && this.lastUsername === username) {
            console.log('[WidgetGallery] Using cached view.');
            return;
        }

        const container = document.getElementById('widgets-grid');
        if (!container) return;

        // Limpiar para regenerar
        container.innerHTML = '';
        this.lastUsername = username;
        this.isInitialized = true;

        // Filtrar solo herramientas VISUALES
        const excludedIds = [
            'list_repos', 'read_repo', 'configure_snake_workflow',
            'auto_bio', 'theme_manager', 'readability_auditor'
        ];

        const visualTools = ToolRegistry.tools.filter(t => !excludedIds.includes(t.id));

        visualTools.forEach(tool => {
            const card = widgetCardRenderer.createCard(tool, username);
            widgetEventHandler.attachInsertEvent(card, tool, username);
            container.appendChild(card);
        });

        console.log('[WidgetGallery] Re-initialized with user:', username);
    }
}

export const widgetGallery = new WidgetGallery();
