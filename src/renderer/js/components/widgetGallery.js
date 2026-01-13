import { ToolRegistry } from '../services/toolRegistry.js';
import { AIToolbox } from '../services/aiToolbox.js';

export const WidgetGallery = {
    init() {
        const container = document.getElementById('widgets-grid');
        if (!container) return;

        // Limpiar
        container.innerHTML = '';

        // Filtrar solo herramientas visuales (las que tienen ejemplos visuales o ID relevantes)
        // Ignoramos 'list_repos' y 'read_repo' ya que son de análisis, no visuales para el readme
        const visualTools = ToolRegistry.tools.filter(t =>
            !['list_repos', 'read_repo'].includes(t.id)
        );

        visualTools.forEach(tool => {
            const card = this.createCard(tool);
            container.appendChild(card);
        });
    },

    createCard(tool) {
        const card = document.createElement('div');
        card.className = 'widget-card-item';

        // Icono basado en ID (Emoji map simple)
        const icons = {
            'welcome_header': '👋',
            'github_stats': '📊',
            'tech_stack': '🛠️',
            'top_langs': '🥧',
            'contribution_snake': '🐍',
            'github_trophies': '🏆',
            'streak_stats': '🔥',
            'profile_views': '👀'
        };

        const icon = icons[tool.id] || '🧩';

        card.innerHTML = `
            <div class="widget-icon">${icon}</div>
            <div class="widget-info">
                <h4>${tool.name}</h4>
                <p>${tool.description.substring(0, 60)}...</p>
            </div>
            <button class="github-btn btn-sm">Insertar</button>
        `;

        // Evento Insertar
        const btn = card.querySelector('button');
        btn.onclick = async () => {
            // Simulamos params por defecto para "Insertar Rápido"
            // En una v2 podríamos abrir un modal para pedir color/texto
            const defaultParams = {
                type: 'waving',
                color: 'auto',
                text: 'Welcome',
                theme: 'tokyonight'
            };

            const username = document.getElementById('user-name')?.textContent || 'User';

            const result = await AIToolbox.insertBanner(tool.id, username, defaultParams);
            if (result.success) {
                // Feedback visual simple
                btn.textContent = '¡Hecho!';
                setTimeout(() => btn.textContent = 'Insertar', 2000);
            }
        };

        return card;
    }
};
