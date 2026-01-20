/**
 * NavigationController - Handles click events on the Activity Bar
 * and translates them into navigation commands.
 */
export class NavigationController {
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
        this.navItems = null;
    }

    init() {
        this.setupEventListeners();
        console.log('[NavigationController] Initialized.');
    }

    setupEventListeners() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.navItems.forEach(item => {
            item.addEventListener('click', (event) => {
                this.handleNavigationClick(event);
            });
        });

        // Toggle global (e.g. from top menu someday)
        document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
            this.sidebarManager.panelStateManager.toggleSidebar(!this.sidebarManager.isExpanded);
        });
    }

    handleNavigationClick(event) {
        const tabId = event.target.closest('.nav-item')?.dataset.tab;
        if (!tabId) return;

        const activeTab = this.sidebarManager.activeTab;
        const isExpanded = this.sidebarManager.isExpanded;

        if (tabId === activeTab && isExpanded) {
            // Same tab clicked while expanded - collapse
            this.sidebarManager.panelStateManager.toggleSidebar(false);
        } else {
            // Different tab or collapsed - switch and expand
            this.sidebarManager.tabSwitcher.switchTab(tabId);
            this.sidebarManager.panelStateManager.toggleSidebar(true);
        }
    }

    updateActiveTabIndicator(tabId) {
        this.navItems?.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabId);
        });
    }
}
