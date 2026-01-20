/**
 * DrawerManager.js
 * Lifecycle management of the pipeline-drawer DOM element
 * Extracted from PipelineUI.js to comply with SRP
 */
import { PIPELINE_NODES } from './PipelineConstants.js';

export class DrawerManager {
    constructor() {
        this.drawer = null;
    }

    /**
     * Initialize the drawer element
     */
    initialize(container) {
        this.drawer = document.getElementById('pipeline-drawer');
        if (!this.drawer) {
            this.drawer = document.createElement('div');
            this.drawer.id = 'pipeline-drawer';
            this.drawer.className = 'pipeline-drawer';
            container.appendChild(this.drawer);
        }
        return this.drawer;
    }

    /**
     * Show the inspection drawer for a specific node
     */
    show(container, selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        const drawer = this.initialize(container);
        drawer.classList.add('open');

        // Update content will be handled by PipelineUI facade
        return drawer;
    }

    /**
     * Update drawer content
     */
    updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        if (!this.drawer || !selectedNode) return;

        const node = PIPELINE_NODES[selectedNode];
        const stats = nodeStats[selectedNode] || { count: 0 };
        const history = nodeHistory[selectedNode] || [];
        const state = nodeStates[selectedNode] || 'idle';

        // Determine display title/subtitle
        const isSlot = selectedNode.startsWith('worker_') && selectedNode !== 'workers_hub';
        const displayTitle = (isSlot && stats.currentLabel) ? stats.currentLabel : node.label;
        const displaySubtitle = (isSlot && stats.repo) ? `Repo: ${stats.repo}` : (node.sublabel || 'Logical Agent');

        // Import history renderer for complete rendering
        import('./HistoryRenderer.js').then(({ historyRenderer }) => {
            const historyHtml = historyRenderer.renderHistory(selectedNode, history);

            // Header HTML
            const headerHtml = this.renderHeader(node, displayTitle, displaySubtitle, onClose);

            // Stats HTML
            const statsHtml = this.renderStats(stats, state);

            // Description HTML
            const descriptionHtml = node.description ? this.renderDescription(node.description) : '';

            // Activity section with history
            const activityTitle = selectedNode === 'workers_hub' ? '(BY WORKER SLOT)' : '(BY REPO)';
            const activityHtml = `
                <div class="drawer-section">
                    <h4>📋 RECENT ACTIVITY ${activityTitle}</h4>
                    <div class="drawer-history">
                        ${historyHtml}
                    </div>
                </div>
            `;

            this.drawer.innerHTML = `
                ${headerHtml}
                <div class="drawer-content">
                    ${descriptionHtml}
                    ${statsHtml}
                    ${activityHtml}
                </div>
            `;

            // Setup close handler
            this.setupCloseHandler(onClose);
        });
    }

    /**
     * Render drawer header
     */
    renderHeader(node, displayTitle, displaySubtitle, onClose) {
        return `
            <div class="drawer-header">
                <span class="drawer-icon">${node.icon}</span>
                <div class="drawer-title-group">
                    <div class="drawer-title">${displayTitle}</div>
                    <div class="drawer-subtitle">${displaySubtitle}</div>
                </div>
                <button class="drawer-close" id="drawer-close">×</button>
            </div>
        `;
    }

    /**
     * Render statistics section
     */
    renderStats(stats, state) {
        const statusText = this.getStatusText(state);
        const stateClass = `state-${state.toLowerCase()}`;

        return `
            <div class="drawer-section">
                <h4>📊 STATISTICS</h4>
                <div class="drawer-stat-grid">
                    <div class="drawer-stat">
                        <span class="stat-label">In Flight</span>
                        <span class="stat-value">${stats.count}</span>
                    </div>
                    <div class="drawer-stat">
                        <span class="stat-label">Status</span>
                        <span class="stat-value ${stateClass}">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render description section
     */
    renderDescription(description) {
        return `
            <div class="drawer-section drawer-description">
                <h4>📖 DESCRIPTION</h4>
                <p class="node-description">${description}</p>
            </div>
        `;
    }

    /**
     * Get human-readable status text
     */
    getStatusText(state) {
        const statusMap = {
            'active': 'PROCESSING',
            'pending': 'HOLDING RESULT'
        };
        return statusMap[state] || state.toUpperCase();
    }

    /**
     * Setup close button handler
     */
    setupCloseHandler(onClose) {
        const closeBtn = document.getElementById('drawer-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
                if (onClose) onClose();
            });
        }
    }

    /**
     * Close the inspection drawer
     */
    close() {
        if (this.drawer) {
            this.drawer.classList.remove('open');
        }
    }

    /**
     * Get the drawer element
     */
    getDrawer() {
        return this.drawer;
    }
}

// Export singleton instance
export const drawerManager = new DrawerManager();
