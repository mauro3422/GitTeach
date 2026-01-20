/**
 * HistoryRenderer.js
 * Logic for grouping events by repository/slot and generating HTML templates
 * Extracted from PipelineUI.js to comply with SRP
 */

export class HistoryRenderer {
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
            groups = this.groupHistoryBy(history, h => this.getSlotLabel(h.slotId));

            // Sort: Slot 1, 2, 3, then In Queue
            const slotOrder = ['⚡ Slot 1', '⚡ Slot 2', '⚡ Slot 3', '⏳ In Queue'];
            sortedEntries = Object.entries(groups).sort((a, b) => {
                const aIdx = slotOrder.indexOf(a[0]);
                const bIdx = slotOrder.indexOf(b[0]);
                return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
            });
        } else {
            // Group by repository
            groups = this.groupHistoryBy(history, h => h.repo || 'System');
            sortedEntries = Object.entries(groups);
        }

        return sortedEntries.map(([groupName, items], idx) =>
            this.renderHistoryGroup(groupName, items, isWorkersHub && groupName.includes('Slot'), idx)
        ).join('');
    }

    /**
     * Group history items by key
     */
    groupHistoryBy(history, keyFn) {
        const groups = {};
        history.forEach(h => {
            const key = keyFn(h);
            if (!groups[key]) groups[key] = [];
            groups[key].push(h);
        });
        return groups;
    }

    /**
     * Render a collapsible history group
     */
    renderHistoryGroup(groupName, items, isSlotHeader = false, index = 0) {
        const headerClass = isSlotHeader ? 'slot-header' : '';
        return `
            <div class="history-group collapsible" data-group="${index}">
                <div class="history-group-header ${headerClass}" onclick="this.parentElement.classList.toggle('collapsed')">
                    <span class="collapse-icon">▼</span>
                    <span class="group-title">${groupName}</span>
                    <span class="group-count">(${items.length})</span>
                </div>
                <div class="history-group-items">
                    ${items.map(item => this.renderHistoryItem(item)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render a single history item
     */
    renderHistoryItem(item) {
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
     * Get slot label from slot ID
     */
    getSlotLabel(slotId) {
        const labels = {
            'worker_1': '⚡ Slot 1',
            'worker_2': '⚡ Slot 2',
            'worker_3': '⚡ Slot 3'
        };
        return labels[slotId] || '⏳ In Queue';
    }
}

// Export singleton instance
export const historyRenderer = new HistoryRenderer();
