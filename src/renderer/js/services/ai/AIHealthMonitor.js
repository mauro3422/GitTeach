/**
 * AIHealthMonitor - Monitors AI service health and connectivity
 * Extracted from AIService to comply with SRP
 *
 * Responsibilities:
 * - Track AI service online/offline status
 * - Update UI indicators for connectivity
 * - Handle health check initialization
 * - Manage status change notifications
 */

export class AIHealthMonitor {
    constructor() {
        this.isOnline = false;
        this.statusChangeCallbacks = [];
    }

    /**
     * Update the AI health status and notify listeners
     * @param {boolean} isOnline - Whether the AI service is online
     */
    updateHealth(isOnline) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;

        // Update global status
        if (typeof window !== 'undefined') {
            window.AI_OFFLINE = !isOnline;
        }

        // Update UI indicator
        this.updateStatusIndicator(isOnline);

        // Notify listeners of status change
        if (wasOnline !== isOnline) {
            this.notifyStatusChange(isOnline);
        }
    }

    /**
     * Update the visual status indicator in the UI
     * @param {boolean} isOnline - Current online status
     */
    updateStatusIndicator(isOnline) {
        if (typeof document === 'undefined') return;

        const dot = document.querySelector('.status-dot');
        if (dot) {
            if (isOnline) {
                dot.classList.remove('disconnected');
            } else {
                dot.classList.add('disconnected');
            }
        }
    }

    /**
     * Start the health monitoring system
     */
    startHealthCheck() {
        if (typeof window === 'undefined') return;

        // Initial health check
        this.performHealthCheck();

        // Set up periodic health checks if utilsAPI is available
        if (window.utilsAPI?.checkAIHealth) {
            window.utilsAPI.checkAIHealth().then(online => this.updateHealth(online));
        }

        // Listen for AI status changes
        if (window.githubAPI?.onAIStatusChange) {
            window.githubAPI.onAIStatusChange((e, online) => this.updateHealth(online));
        }
    }

    /**
     * Perform a manual health check
     * @returns {Promise<boolean>} Health status
     */
    async performHealthCheck() {
        try {
            if (typeof window === 'undefined' || !window.utilsAPI?.checkAIHealth) {
                return false;
            }

            const isOnline = await window.utilsAPI.checkAIHealth();
            this.updateHealth(isOnline);
            return isOnline;
        } catch (error) {
            console.warn('[AIHealthMonitor] Health check failed:', error.message);
            this.updateHealth(false);
            return false;
        }
    }

    /**
     * Get current health status
     * @returns {boolean} Whether the AI service is online
     */
    getHealthStatus() {
        return this.isOnline;
    }

    /**
     * Register a callback for status changes
     * @param {Function} callback - Function to call when status changes
     */
    onStatusChange(callback) {
        if (typeof callback === 'function') {
            this.statusChangeCallbacks.push(callback);
        }
    }

    /**
     * Remove a status change callback
     * @param {Function} callback - Callback to remove
     */
    offStatusChange(callback) {
        const index = this.statusChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.statusChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * Notify all registered callbacks of status change
     * @param {boolean} isOnline - New online status
     */
    notifyStatusChange(isOnline) {
        this.statusChangeCallbacks.forEach(callback => {
            try {
                callback(isOnline);
            } catch (error) {
                console.error('[AIHealthMonitor] Status change callback failed:', error);
            }
        });
    }

    /**
     * Force a health check and status update
     * @returns {Promise<boolean>} New health status
     */
    async forceHealthCheck() {
        return await this.performHealthCheck();
    }

    /**
     * Get detailed health information
     * @returns {Object} Health details
     */
    getHealthInfo() {
        return {
            isOnline: this.isOnline,
            lastChecked: new Date().toISOString(),
            callbacksRegistered: this.statusChangeCallbacks.length,
            hasUtilsAPI: typeof window !== 'undefined' && !!window.utilsAPI?.checkAIHealth,
            hasGithubAPI: typeof window !== 'undefined' && !!window.githubAPI?.onAIStatusChange
        };
    }

    /**
     * Reset the health monitor (for testing)
     */
    reset() {
        this.isOnline = false;
        this.statusChangeCallbacks = [];
        if (typeof window !== 'undefined') {
            window.AI_OFFLINE = true;
        }
        this.updateStatusIndicator(false);
    }
}