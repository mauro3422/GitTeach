/**
 * PipelineUI.js
 * UI management for the Pipeline Visualizer.
 * Handles the inspection drawer and DOM-related components.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';

export const PipelineUI = {
    /**
     * Show the inspection drawer for a specific node
     */
    showDrawer(container, selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        let drawer = document.getElementById('pipeline-drawer');
        if (!drawer) {
            drawer = document.createElement('div');
            drawer.id = 'pipeline-drawer';
            drawer.className = 'pipeline-drawer';
            container.appendChild(drawer);
        }

        drawer.classList.add('open');
        this.updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose);
    },

    /**
     * Update drawer content
     */
    updateDrawer(selectedNode, nodeStats, nodeHistory, nodeStates, onClose) {
        const drawer = document.getElementById('pipeline-drawer');
        if (!drawer || !selectedNode) return;

        const node = PIPELINE_NODES[selectedNode];
        const stats = nodeStats[selectedNode] || { count: 0 };
        const history = nodeHistory[selectedNode] || [];
        const state = nodeStates[selectedNode] || 'idle';

        const isSlot = selectedNode.startsWith('worker_') && selectedNode !== 'workers_hub';
        const displayTitle = (isSlot && stats.currentLabel) ? stats.currentLabel : node.label;
        const displaySubtitle = (isSlot && stats.repo) ? `Repo: ${stats.repo}` : (node.sublabel || 'Logical Agent');

        drawer.innerHTML = `
            <div class="drawer-header">
                <span class="drawer-icon">${node.icon}</span>
                <div class="drawer-title-group">
                    <div class="drawer-title">${displayTitle}</div>
                    <div class="drawer-subtitle">${displaySubtitle}</div>
                </div>
                <button class="drawer-close" id="drawer-close">×</button>
            </div>
            <div class="drawer-content">
                <div class="drawer-section">
                    <h4>STATISTICS</h4>
                    <div class="drawer-stat-grid">
                        <div class="drawer-stat">
                            <span class="stat-label">In Flight</span>
                            <span class="stat-value">${stats.count}</span>
                        </div>
                        <div class="drawer-stat">
                            <span class="stat-label">Status</span>
                            <span class="stat-value state-${state.toLowerCase()}">${state === 'active' ? 'PROCESSING' :
                state === 'pending' ? 'HOLDING RESULT' :
                    state.toUpperCase()
            }</span>
                        </div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>RECENT ACTIVITY (BY REPO)</h4>
                    <div class="drawer-history">
                        ${history.length === 0 ? '<div class="history-empty">No events yet</div>' :
                (() => {
                    // Group history by repository
                    const groups = {};
                    history.forEach(h => {
                        const repo = h.repo || 'System';
                        if (!groups[repo]) groups[repo] = [];
                        groups[repo].push(h);
                    });

                    return Object.entries(groups).map(([repo, items]) => `
                        <div class="history-group">
                            <div class="history-group-header">${repo}</div>
                            <div class="history-group-items">
                                ${items.map(i => `
                                    <div class="history-item">
                                        <span class="history-time">${i.time}</span>
                                        <span class="history-display">${i.file}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('');
                })()}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('drawer-close')?.addEventListener('click', () => {
            this.closeDrawer();
            if (onClose) onClose();
        });
    },

    /**
     * Close the inspection drawer
     */
    closeDrawer() {
        const drawer = document.getElementById('pipeline-drawer');
        if (drawer) drawer.classList.remove('open');
    }
};
