/**
 * TabSwitcher - Orchestrates the visibility of different panels
 * (Insights, Gallery, Settings) and their lazy-loading.
 */
export class TabSwitcher {
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
        this.activeTab = 'insights';
        this.initializedPanels = new Set();
    }

    init() {
        console.log('[TabSwitcher] Initialized.');
    }

    switchTab(tabId) {
        if (this.activeTab === tabId) return;

        this.activeTab = tabId;

        // Update navigation indicator
        this.sidebarManager.navigationController.updateActiveTabIndicator(tabId);

        // Update panel title
        this.updatePanelTitle(tabId);

        // Toggle panel visibility
        this.togglePanelVisibility(tabId);

        // Lazy-load panel content if needed
        this.lazyLoadPanel(tabId);

        console.log(`[TabSwitcher] Switched to tab: ${tabId}`);
    }

    updatePanelTitle(tabId) {
        const title = document.getElementById('sidebar-title');
        if (!title) return;

        const labels = {
            'insights': '📊 Insights',
            'gallery': '✨ Galería',
            'inbox': '📥 Inbox',
            'settings': '⚙️ Settings'
        };
        title.innerText = labels[tabId] || 'Panel';
    }

    togglePanelVisibility(tabId) {
        const insightsPanel = document.getElementById('insights-panel');
        const galleryPanel = document.getElementById('gallery-panel');

        if (insightsPanel) {
            insightsPanel.classList.toggle('hidden', tabId !== 'insights');
        }

        if (galleryPanel) {
            galleryPanel.classList.toggle('hidden', tabId !== 'gallery');
        }
    }

    async lazyLoadPanel(tabId) {
        if (this.initializedPanels.has(tabId)) return;

        switch (tabId) {
            case 'gallery':
                await this.initializeGalleryPanel();
                break;
            case 'insights':
                await this.initializeInsightsPanel();
                break;
            case 'inbox':
                await this.initializeInboxPanel();
                break;
            case 'settings':
                await this.initializeSettingsPanel();
                break;
        }

        this.initializedPanels.add(tabId);
    }

    async initializeGalleryPanel() {
        try {
            const { WidgetGallery } = await import('./widgetGallery.js');
            WidgetGallery.init();
            console.log('[TabSwitcher] Gallery panel initialized');
        } catch (error) {
            console.error('[TabSwitcher] Failed to initialize gallery panel:', error);
        }
    }

    async initializeInsightsPanel() {
        // Insights panel initialization logic
        console.log('[TabSwitcher] Insights panel initialized');
    }

    async initializeInboxPanel() {
        // Inbox panel initialization logic
        console.log('[TabSwitcher] Inbox panel initialized');
    }

    async initializeSettingsPanel() {
        // Settings panel initialization logic
        console.log('[TabSwitcher] Settings panel initialized');
    }

    getActiveTab() {
        return this.activeTab;
    }

    getInitializedPanels() {
        return Array.from(this.initializedPanels);
    }
}
