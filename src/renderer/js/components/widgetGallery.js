import { ToolRegistry } from '../services/toolRegistry.js';
import { AIToolbox } from '../services/aiToolbox.js';
import { DashboardView } from '../views/dashboard.js';

export const WidgetGallery = {
    init() {
        const container = document.getElementById('widgets-grid');
        if (!container) return;

        // Limpiar
        container.innerHTML = '';

        // Filtrar solo herramientas VISUALES (Widgets para el README)
        const excludedIds = [
            'list_repos', 'read_repo', 'configure_snake_workflow',
            'auto_bio', 'theme_manager', 'readability_auditor'
        ];

        const visualTools = ToolRegistry.tools.filter(t => !excludedIds.includes(t.id));

        visualTools.forEach(tool => {
            const card = this.createCard(tool);
            container.appendChild(card);
        });
    },

    createCard(tool) {
        const card = document.createElement('div');
        card.className = 'widget-card-item';

        // Fuente de verdad: DashboardView o DOM as fallback
        const username = DashboardView.currentUsername || document.getElementById('user-name')?.dataset.login || 'User';

        console.log(`[WidgetGallery] Cargando preview para ${tool.id} con usuario: ${username}`);

        const previewUrl = this.getPreviewUrl(tool, username);
        const hasVisualPreview = !!previewUrl;

        card.innerHTML = `
            <div class="widget-preview-container ${!hasVisualPreview ? 'no-preview' : ''}">
                ${hasVisualPreview
                ? `<img src="${previewUrl}" class="widget-preview-img" alt="${tool.name}" onerror="this.src='https://placehold.co/400x200/0d1117/white?text=${tool.name}'">`
                : `<div class="widget-icon-fallback">🧩</div>`
            }
                <div class="widget-badge">IA Ready</div>
            </div>
            <div class="widget-info">
                <h4>${tool.name}</h4>
                <p>${tool.description}</p>
            </div>
            <div class="widget-actions">
                <button class="github-btn btn-sm btn-primary-compact">✨ Insertar</button>
            </div>
        `;

        // Evento Insertar
        const btn = card.querySelector('button');
        btn.onclick = async () => {
            const usernameEl = document.getElementById('user-name');
            const username = usernameEl?.dataset.login || usernameEl?.textContent || 'User';

            // Parámetros por defecto para inserción rápida desde galería
            const defaultParams = {};

            btn.disabled = true;
            btn.textContent = '⏳...';

            const result = await tool.execute(defaultParams, username);

            if (result.success && result.content) {
                AIToolbox.applyContent(result.content);
                btn.textContent = '✅';
                setTimeout(() => {
                    btn.textContent = 'Insertar';
                    btn.disabled = false;
                }, 2000);
            } else {
                btn.textContent = '❌';
                setTimeout(() => {
                    btn.textContent = 'Insertar';
                    btn.disabled = false;
                }, 2000);
            }
        };

        return card;
    },

    getPreviewUrl(tool, username) {
        // Si el username es genérico o no existe, no intentamos cargar stats reales (evita 404s)
        if (!username || username === 'User' || username === 'Usuario') {
            return `https://placehold.co/400x200/0d1117/47848F?text=${tool.name}`;
        }

        // Mapeo de herramientas a URLs de previsualización reales/estáticas
        const previews = {
            'github_stats': `https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight`,
            'top_langs': `https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight`,
            'github_trophies': `https://github-profile-trophy.vercel.app/?username=${username}&theme=tokyonight`,
            'streak_stats': `https://github-readme-streak-stats.herokuapp.com/?user=${username}&theme=tokyonight`,
            'activity_graph': `https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=tokyonight`,
            'contribution_snake': `https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg`,
            'tech_stack': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron',
            'skills': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron',
            'profile_views': `https://komarev.com/ghpvc/?username=${username}&color=green`,
            'social_connect': `https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white`,
            'project_showcase': `https://github-readme-stats.vercel.app/api/pin/?username=${username}&repo=${username}&theme=tokyonight`,
            'welcome_header': 'https://capsule-render.vercel.app/render?type=wave&color=auto&height=200&section=header&text=Bienvenido&fontSize=70'
        };

        return previews[tool.id] || null;
    }
}
