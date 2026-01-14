import { ToolRegistry } from '../services/toolRegistry.js';
import { AIToolbox } from '../services/aiToolbox.js';
import { DashboardView } from '../views/dashboard.js';

export const WidgetGallery = {
    isInitialized: false,
    lastUsername: null,

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
            const card = this.createCard(tool, username);
            container.appendChild(card);
        });

        console.log('[WidgetGallery] Re-initialized with user:', username);
    },

    createCard(tool, username) {
        const card = document.createElement('div');
        card.className = 'widget-card-item';
        card.dataset.id = tool.id;

        const previewUrl = this.getPreviewUrl(tool, username);
        const hasVisualPreview = !!previewUrl;

        card.innerHTML = `
            <div class="widget-preview-container ${!hasVisualPreview ? 'no-preview' : ''}">
                <div class="widget-preview-area" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    ${hasVisualPreview
                ? `<img src="${previewUrl}" 
                        class="widget-preview-img" 
                        alt="${tool.name}" 
                        referrerPolicy="no-referrer"
                        style="opacity: 1;"
                        onload="console.log('[WidgetGallery] ✅ EXITO Directo:', '${tool.id}');"
                        onerror="window.WidgetGallery.handleImageError(this, '${tool.id}', '${previewUrl}')">`
                : `<div class="widget-icon-fallback">🧩</div>`
            }
                </div>
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
            btn.disabled = true;
            btn.textContent = '⏳...';

            const result = await tool.execute({}, username);

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

    // Manejador estático para permitir fallback vía IPC Bridge
    async handleImageError(imgElement, id, url) {
        console.warn(`[WidgetGallery] 🔄 Fallback activado para: ${id}. Intentando vía IPC Bridge...`);
        try {
            const result = await window.utilsAPI.getImageBase64(url);
            if (result.success && result.data) {
                imgElement.src = result.data;
                console.log(`[WidgetBridge] ✅ CARGADO vía Bridge: ${id}`);
            } else {
                throw new Error(result.error || 'Bridge returned no data');
            }
        } catch (e) {
            console.error(`[WidgetBridge] ❌ FALLO TOTAL en: ${id} | Error:`, e.message);
            imgElement.style.display = 'none';
            imgElement.parentElement.innerHTML = '<div class="widget-icon-fallback">⚠️</div>';
        }
    },

    getPreviewUrl(tool, username) {
        // Mapeo de herramientas a URLs de previsualización reales/estáticas
        const previews = {
            'github_stats': `https://github-readme-stats-sigma-five.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true`,
            'top_langs': `https://github-readme-stats-sigma-five.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_title=true`,
            'github_trophies': `https://github-profile-trophy-alpha.vercel.app/?username=${username}&theme=tokyonight&margin-w=5`,
            'streak_stats': `https://github-readme-streak-stats.herokuapp.com/?user=${username}&theme=tokyonight&hide_border=true`,
            'activity_graph': `https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=tokyonight&hide_border=true&area=true`,
            'contribution_snake': `https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg`,
            'tech_stack': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron&perline=8',
            'skills': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron&perline=8',
            'profile_views': `https://komarev.com/ghpvc/?username=${username}&color=green`,
            'social_connect': `https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white`,
            'project_showcase': `https://github-readme-stats-sigma-five.vercel.app/api/pin/?username=${username}&repo=${username}&theme=tokyonight`,
            'welcome_header': `https://capsule-render.vercel.app/api?type=wave&color=auto&height=120&text=GitTeach&fontSize=50`
        };

        return previews[tool.id] || null;
    }
};
// Guardamos referencia global para que el onerror pueda llamarla
window.WidgetGallery = WidgetGallery;
