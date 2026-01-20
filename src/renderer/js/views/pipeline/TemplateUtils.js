/**
 * TemplateUtils.js
 * Human-readable formatters for status and labels
 * Extracted from PipelineUI.js to comply with SRP
 */

export class TemplateUtils {
    /**
     * Get slot label from slot ID
     */
    static getSlotLabel(slotId) {
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
    static getStatusText(state) {
        const statusMap = {
            'active': 'PROCESSING',
            'pending': 'HOLDING RESULT'
        };
        return statusMap[state] || state.toUpperCase();
    }

    /**
     * Format repository name for display
     */
    static formatRepoName(repoName) {
        if (!repoName) return 'System';
        // Extract repo name from full URL if needed
        const parts = repoName.split('/');
        return parts[parts.length - 1] || repoName;
    }

    /**
     * Format file path for display
     */
    static formatFilePath(filePath) {
        if (!filePath) return 'Unknown file';
        // Truncate long paths
        if (filePath.length > 50) {
            return '...' + filePath.slice(-47);
        }
        return filePath;
    }

    /**
     * Format timestamp for display
     */
    static formatTimestamp(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return timestamp;
        }
    }

    /**
     * Get appropriate icon for node type
     */
    static getNodeIcon(nodeType) {
        const icons = {
            'workers_hub': '⚙️',
            'coordinator': '🎯',
            'auditor': '🔍',
            'curator': '🧠',
            'memory': '💾',
            'worker_1': '⚡',
            'worker_2': '⚡',
            'worker_3': '⚡'
        };
        return icons[nodeType] || '📦';
    }

    /**
     * Get state color class
     */
    static getStateClass(state) {
        const stateClasses = {
            'active': 'state-active',
            'pending': 'state-pending',
            'idle': 'state-idle',
            'error': 'state-error',
            'complete': 'state-complete'
        };
        return stateClasses[state] || 'state-unknown';
    }
}

// Export singleton instance
export const templateUtils = TemplateUtils;
