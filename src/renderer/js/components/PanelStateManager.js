/**
 * PanelStateManager - Manages the expansion/collapse state of the sidebar
 * and its persistence across sessions.
 */
export class PanelStateManager {
    constructor(sidebarManager) {
        this.sidebarManager = sidebarManager;
        this.isExpanded = true; // Default expanded
        this.storageKey = 'sidebar-expanded-state';
    }

    init() {
        this.loadPersistedState();
        this.applyCurrentState();
        console.log('[PanelStateManager] Initialized.');
    }

    loadPersistedState() {
        try {
            const persisted = localStorage.getItem(this.storageKey);
            if (persisted !== null) {
                this.isExpanded = JSON.parse(persisted);
            }
        } catch (error) {
            console.warn('[PanelStateManager] Failed to load persisted state:', error);
            this.isExpanded = true; // Fallback to expanded
        }
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.isExpanded));
        } catch (error) {
            console.warn('[PanelStateManager] Failed to save state:', error);
        }
    }

    toggleSidebar(show) {
        this.isExpanded = show;
        this.applyCurrentState();
        this.saveState();

        // Trigger layout update
        window.dispatchEvent(new Event('resize'));

        console.log(`[PanelStateManager] Sidebar ${show ? 'expanded' : 'collapsed'}`);
    }

    applyCurrentState() {
        const panel = document.getElementById('sidebar-panel');
        const resizer = document.getElementById('resizer-left');

        if (panel) {
            panel.classList.toggle('collapsed', !this.isExpanded);
        }

        if (resizer) {
            resizer.style.display = this.isExpanded ? 'block' : 'none';
        }
    }

    getState() {
        return {
            isExpanded: this.isExpanded
        };
    }
}
