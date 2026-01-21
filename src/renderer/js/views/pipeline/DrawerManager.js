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
    initialize(container, id = 'pipeline-drawer', className = 'pipeline-drawer') {
        this.drawer = document.getElementById(id);
        if (!this.drawer) {
            this.drawer = document.createElement('div');
            this.drawer.id = id;
            this.drawer.className = className;
            container.appendChild(this.drawer);
        }
        return this.drawer;
    }

    /**
     * Show the inspection drawer for a specific node
     */
    show(container, id = 'pipeline-drawer', className = 'pipeline-drawer') {
        const drawer = this.initialize(container, id, className);
        drawer.classList.add('open');
        return drawer;
    }

    /**
     * Compatibility: Show the inspection drawer for a specific node
     */
    showInspection(container, selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        return this.show(container);
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
        import('./HistoryRenderer.js').then(async ({ historyRenderer }) => {
            const historyHtml = historyRenderer.renderHistory(selectedNode, history);

            // Header HTML
            const headerHtml = this.renderHeader(node, displayTitle, displaySubtitle, onClose);

            // Stats HTML
            const statsHtml = this.renderStats(stats, state);

            // Description HTML
            const descriptionHtml = node.description ? this.renderDescription(node.description) : '';

            // Factory components (Internal Classes)
            const componentsHtml = node.internalClasses && node.internalClasses.length > 0
                ? this.renderInternalComponents(node.internalClasses)
                : '';

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

            // SPECIAL: Persistence node shows DB status
            let dbStatusHtml = '';
            if (selectedNode === 'persistence') {
                dbStatusHtml = await this.renderPersistenceStatus();
            }

            this.drawer.innerHTML = `
                ${headerHtml}
                <div class="drawer-content">
                    ${descriptionHtml}
                    ${componentsHtml}
                    ${statsHtml}
                    ${dbStatusHtml}
                    ${activityHtml}
                </div>
            `;

            // Setup close handler
            this.setupCloseHandler(onClose);
        });
    }

    /**
     * Render persistence node special status - shows what's saved in DB
     */
    async renderPersistenceStatus() {
        try {
            // Import CacheRepository dynamically
            const { CacheRepository } = await import('../../utils/cacheRepository.js');

            // Get all repo blueprints
            let blueprints = await CacheRepository.getAllRepoBlueprints();
            if (!Array.isArray(blueprints)) blueprints = [];

            // Get all repo metrics (from our new incremental system)
            let metricsMap = await CacheRepository.repoCache?.getAllRepoMetrics();
            if (!(metricsMap instanceof Map)) metricsMap = new Map();

            // Build HTML for each repo
            let reposHtml = '';
            if (blueprints.length === 0 && metricsMap.size === 0) {
                reposHtml = '<div class="db-empty">No data persisted yet</div>';
            } else {
                // Combine data from blueprints and metrics
                const allRepos = new Set([
                    ...blueprints.map(bp => bp.repoName),
                    ...metricsMap.keys()
                ]);

                for (const repoName of allRepos) {
                    const blueprint = blueprints.find(bp => bp.repoName === repoName);
                    const metrics = metricsMap.get(repoName);

                    const filesAnalyzed = blueprint?.volume?.analyzedFiles || metrics?.files || 0;
                    const batches = metrics?.batches || 0;
                    const lastUpdated = metrics?.lastUpdated || blueprint?.timestamp || 'N/A';
                    const logicScore = blueprint?.metrics?.logic?.solid || metrics?.logic?.solid || '—';

                    reposHtml += `
                        <div class="db-repo-card">
                            <div class="db-repo-header">
                                <span class="db-repo-name">📁 ${repoName}</span>
                                <span class="db-repo-files">${filesAnalyzed} files</span>
                            </div>
                            <div class="db-repo-details">
                                <div class="db-metric">
                                    <span class="db-label">Batches:</span>
                                    <span class="db-value">${batches}</span>
                                </div>
                                <div class="db-metric">
                                    <span class="db-label">SOLID:</span>
                                    <span class="db-value">${typeof logicScore === 'number' ? logicScore.toFixed(1) : logicScore}</span>
                                </div>
                                <div class="db-metric">
                                    <span class="db-label">Updated:</span>
                                    <span class="db-value db-time">${this._formatTime(lastUpdated)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }

            return `
                <div class="drawer-section db-status-section">
                    <h4>💾 DATABASE STATUS</h4>
                    <div class="db-summary">
                        <span>Repos: ${blueprints.length}</span>
                        <span>Metrics: ${metricsMap.size}</span>
                    </div>
                    <div class="db-repos-list">
                        ${reposHtml}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('[DrawerManager] Failed to render persistence status:', e);
            return `
                <div class="drawer-section db-status-section">
                    <h4>💾 DATABASE STATUS</h4>
                    <div class="db-error">Error loading DB status: ${e.message}</div>
                </div>
            `;
        }
    }

    /**
     * Format timestamp for display
     */
    _formatTime(isoString) {
        if (!isoString || isoString === 'N/A') return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'N/A';
        }
    }

    /**
     * Render drawer header
     */
    renderHeader(node, displayTitle, displaySubtitle, onClose, closeBtnId = 'drawer-close') {
        return `
            <div class="drawer-header">
                <span class="drawer-icon" id="drawer-icon-id">${node.icon || '📝'}</span>
                <div class="drawer-title-group">
                    <div class="drawer-title" id="drawer-title-id">${displayTitle}</div>
                    <div class="drawer-subtitle" id="drawer-subtitle-id">${displaySubtitle}</div>
                </div>
                <button class="drawer-close" id="${closeBtnId}">×</button>
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
     * Render factory internal components (classes)
     */
    renderInternalComponents(classes) {
        const items = classes.map(c => `<li><code>${c}</code></li>`).join('');
        return `
            <div class="drawer-section internal-components">
                <h4>🏗️ INTERNAL COMPONENTS</h4>
                <ul class="components-list">
                    ${items}
                </ul>
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
