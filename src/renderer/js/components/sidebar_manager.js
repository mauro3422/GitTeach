/**
 * SidebarManager - Handles the VSCode-style navigation system.
 * Manages states for the Activity Bar and Sidebar Panel.
 */
export const SidebarManager = {
    activeTab: 'insights',
    isExpanded: true,

    init() {
        this.setupEventListeners();
        console.log('[SidebarManager] Initialized.');
    },

    setupEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.dataset.tab;
                if (tabId === this.activeTab && this.isExpanded) {
                    this.toggleSidebar(false);
                } else {
                    this.switchTab(tabId);
                    this.toggleSidebar(true);
                }
            });
        });

        // Toggle global (e.g. from top menu someday)
        document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
            this.toggleSidebar(!this.isExpanded);
        });
    },

    switchTab(tabId) {
        this.activeTab = tabId;

        // Update Icons UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabId);
        });

        // Update Panel Content
        const title = document.getElementById('sidebar-title');
        const insightsPanel = document.getElementById('insights-panel');
        const galleryPanel = document.getElementById('gallery-panel');

        if (title) {
            const labels = {
                'insights': '📊 Insights',
                'gallery': '✨ Galería',
                'inbox': '📥 Inbox',
                'settings': '⚙️ Settings'
            };
            title.innerText = labels[tabId] || 'Panel';
        }

        // Toggle Panels
        if (insightsPanel) insightsPanel.classList.toggle('hidden', tabId !== 'insights');
        if (galleryPanel) {
            galleryPanel.classList.toggle('hidden', tabId !== 'gallery');
            if (tabId === 'gallery') {
                // Initialize Gallery logic when shown
                import('./widgetGallery.js').then(m => m.WidgetGallery.init());
            }
        }

        console.log(`[SidebarManager] Switched to tab: ${tabId}`);
    },

    toggleSidebar(show) {
        const panel = document.getElementById('sidebar-panel');
        const resizer = document.getElementById('resizer-left');

        this.isExpanded = show;

        if (panel) {
            panel.classList.toggle('collapsed', !show);
        }

        if (resizer) {
            resizer.style.display = show ? 'block' : 'none';
        }

        // Trigger layout update if needed
        window.dispatchEvent(new Event('resize'));
    }
};
