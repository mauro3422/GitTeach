import { NavigationController } from './NavigationController.js';
import { PanelStateManager } from './PanelStateManager.js';
import { TabSwitcher } from './TabSwitcher.js';

/**
 * SidebarManager - Minimal facade delegating to specialized controllers.
 * Coordinates navigation, panel state, and tab switching.
 */
export class SidebarManager {
    constructor() {
        this.activeTab = 'insights';
        this.isExpanded = true;

        // Initialize specialized controllers
        this.navigationController = new NavigationController(this);
        this.panelStateManager = new PanelStateManager(this);
        this.tabSwitcher = new TabSwitcher(this);
    }

    init() {
        // Initialize all controllers
        this.navigationController.init();
        this.panelStateManager.init();
        this.tabSwitcher.init();

        console.log('[SidebarManager] Initialized as facade.');
    }

    // Facade methods for external access
    switchTab(tabId) {
        this.tabSwitcher.switchTab(tabId);
        this.activeTab = tabId;
    }

    toggleSidebar(show) {
        this.panelStateManager.toggleSidebar(show);
        this.isExpanded = show;
    }

    // Getters for external access
    getState() {
        return {
            activeTab: this.activeTab,
            isExpanded: this.isExpanded,
            initializedPanels: this.tabSwitcher.getInitializedPanels()
        };
    }
}

export const sidebarManager = new SidebarManager();
