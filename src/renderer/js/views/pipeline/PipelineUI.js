/**
 * PipelineUI.js
 * UI management for the Pipeline Visualizer.
 * Handles the inspection drawer and DOM-related components.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';

// =============================================
//   TEMPLATE HELPERS
// =============================================

/**
 * Get slot label from slot ID
 */
function getSlotLabel(slotId) {
    const labels = {
        'worker_1': '⚡ Slot 1',
        'worker_2': '⚡ Slot 2',
        'worker_3': '⚡ Slot 3'
    };
    return labels[slotId] || '⏳ In Queue';
}

/**
 * Get human-readable status text
 */
function getStatusText(state) {
    const statusMap = {
        'active': 'PROCESSING',
        'pending': 'HOLDING RESULT'
    };
    return statusMap[state] || state.toUpperCase();
}

/**
 * Group history items by key
 */
function groupHistoryBy(history, keyFn) {
    const groups = {};
    history.forEach(h => {
        const key = keyFn(h);
        if (!groups[key]) groups[key] = [];
        groups[key].push(h);
    });
    return groups;
}

/**
 * Render a single history item
 */
function renderHistoryItem(item) {
    const doneClass = item.done ? 'done' : '';
    const doneMark = item.done ? '<span class="done-mark">✅</span>' : '';
    return `
        <div class="history-item ${doneClass}">
            <span class="history-time">${item.time}</span>
            <span class="history-display">${item.file} ${doneMark}</span>
        </div>
    `;
}

/**
 * Render a collapsible history group
 */
function renderHistoryGroup(groupName, items, isSlotHeader = false, index = 0) {
    const headerClass = isSlotHeader ? 'slot-header' : '';
    return `
        <div class="history-group collapsible" data-group="${index}">
            <div class="history-group-header ${headerClass}" onclick="this.parentElement.classList.toggle('collapsed')">
                <span class="collapse-icon">▼</span>
                <span class="group-title">${groupName}</span>
                <span class="group-count">(${items.length})</span>
            </div>
            <div class="history-group-items">
                ${items.map(renderHistoryItem).join('')}
            </div>
        </div>
    `;
}

// =============================================
//   PIPELINE UI
// =============================================

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

        // Determine display title/subtitle
        const isSlot = selectedNode.startsWith('worker_') && selectedNode !== 'workers_hub';
        const displayTitle = (isSlot && stats.currentLabel) ? stats.currentLabel : node.label;
        const displaySubtitle = (isSlot && stats.repo) ? `Repo: ${stats.repo}` : (node.sublabel || 'Logical Agent');

        // Group and render history
        const historyHtml = this.renderHistory(selectedNode, history);

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
                ${node.description ? `
                <div class="drawer-section drawer-description">
                    <h4>📖 DESCRIPTION</h4>
                    <p class="node-description">${node.description}</p>
                </div>
                ` : ''}
                <div class="drawer-section">
                    <h4>📊 STATISTICS</h4>
                    <div class="drawer-stat-grid">
                        <div class="drawer-stat">
                            <span class="stat-label">In Flight</span>
                            <span class="stat-value">${stats.count}</span>
                        </div>
                        <div class="drawer-stat">
                            <span class="stat-label">Status</span>
                            <span class="stat-value state-${state.toLowerCase()}">${getStatusText(state)}</span>
                        </div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>📋 RECENT ACTIVITY ${selectedNode === 'workers_hub' ? '(BY WORKER SLOT)' : '(BY REPO)'}</h4>
                    <div class="drawer-history">
                        ${historyHtml}
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
     * Render history section based on node type
     */
    renderHistory(selectedNode, history) {
        if (history.length === 0) {
            return '<div class="history-empty">No events yet</div>';
        }

        let groups;
        let sortedEntries;
        const isWorkersHub = selectedNode === 'workers_hub';

        if (isWorkersHub) {
            // Group by slot destination
            groups = groupHistoryBy(history, h => getSlotLabel(h.slotId));

            // Sort: Slot 1, 2, 3, then In Queue
            const slotOrder = ['⚡ Slot 1', '⚡ Slot 2', '⚡ Slot 3', '⏳ In Queue'];
            sortedEntries = Object.entries(groups).sort((a, b) => {
                const aIdx = slotOrder.indexOf(a[0]);
                const bIdx = slotOrder.indexOf(b[0]);
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            });
        } else {
            // Group by repository
            groups = groupHistoryBy(history, h => h.repo || 'System');
            sortedEntries = Object.entries(groups);
        }

        return sortedEntries.map(([groupName, items], idx) =>
            renderHistoryGroup(groupName, items, isWorkersHub && groupName.includes('Slot'), idx)
        ).join('');
    },

    /**
     * Close the inspection drawer
     */
    closeDrawer() {
        const drawer = document.getElementById('pipeline-drawer');
        if (drawer) drawer.classList.remove('open');
    }
};
