/**
 * ChatStateManager - Manages AI connection status, retry logic,
 * and session-specific states for the chat system.
 */
export class ChatStateManager {
    constructor() {
        this.connectionStatus = 'idle'; // idle, connecting, connected, error
        this.retryCount = 0;
        this.maxRetries = 3;
        this.sessionId = this.generateSessionId();
        this.lastActivity = Date.now();
        this.messageHistory = [];
        this.isProcessing = false;

        // Connection health tracking
        this.connectionHealth = {
            lastSuccessfulRequest: null,
            consecutiveFailures: 0,
            averageResponseTime: 0,
            totalRequests: 0
        };
    }

    init() {
        this.startHealthCheck();
        console.log('[ChatStateManager] Initialized.');
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Connection Status Management
    setConnectionStatus(status) {
        this.connectionStatus = status;
        this.lastActivity = Date.now();
        console.log(`[ChatStateManager] Connection status: ${status}`);
    }

    getConnectionStatus() {
        return this.connectionStatus;
    }

    // Processing State
    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
        if (isProcessing) {
            this.lastActivity = Date.now();
        }
    }

    isCurrentlyProcessing() {
        return this.isProcessing;
    }

    // Retry Logic
    shouldRetry() {
        return this.retryCount < this.maxRetries;
    }

    incrementRetryCount() {
        this.retryCount++;
    }

    resetRetryCount() {
        this.retryCount = 0;
    }

    getRetryCount() {
        return this.retryCount;
    }

    // Session Management
    getSessionId() {
        return this.sessionId;
    }

    newSession() {
        this.sessionId = this.generateSessionId();
        this.messageHistory = [];
        this.retryCount = 0;
        this.connectionStatus = 'idle';
        console.log(`[ChatStateManager] New session started: ${this.sessionId}`);
    }

    // Message History
    addToHistory(message, type, timestamp = Date.now()) {
        this.messageHistory.push({
            message,
            type,
            timestamp
        });

        // Keep only last 50 messages
        if (this.messageHistory.length > 50) {
            this.messageHistory.shift();
        }
    }

    getMessageHistory() {
        return [...this.messageHistory];
    }

    clearHistory() {
        this.messageHistory = [];
    }

    // Connection Health Monitoring
    recordSuccessfulRequest(responseTime) {
        this.connectionHealth.lastSuccessfulRequest = Date.now();
        this.connectionHealth.consecutiveFailures = 0;
        this.connectionHealth.totalRequests++;
        this.updateAverageResponseTime(responseTime);
    }

    recordFailedRequest() {
        this.connectionHealth.consecutiveFailures++;
        this.connectionHealth.totalRequests++;
    }

    updateAverageResponseTime(responseTime) {
        const current = this.connectionHealth.averageResponseTime;
        const total = this.connectionHealth.totalRequests;
        this.connectionHealth.averageResponseTime = ((current * (total - 1)) + responseTime) / total;
    }

    getConnectionHealth() {
        return { ...this.connectionHealth };
    }

    isConnectionHealthy() {
        const now = Date.now();
        const timeSinceLastSuccess = now - (this.connectionHealth.lastSuccessfulRequest || 0);
        const hasRecentSuccess = timeSinceLastSuccess < 30000; // 30 seconds
        const lowFailureRate = this.connectionHealth.consecutiveFailures < 3;

        return hasRecentSuccess && lowFailureRate;
    }

    // Health Check Loop
    startHealthCheck() {
        setInterval(() => {
            if (!this.isConnectionHealthy() && this.connectionStatus !== 'error') {
                this.setConnectionStatus('error');
                console.warn('[ChatStateManager] Connection health degraded');
            }
        }, 10000); // Check every 10 seconds
    }

    // Activity Monitoring
    getLastActivity() {
        return this.lastActivity;
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    // State Serialization for Persistence
    getState() {
        return {
            sessionId: this.sessionId,
            connectionStatus: this.connectionStatus,
            retryCount: this.retryCount,
            messageHistory: this.messageHistory,
            connectionHealth: this.connectionHealth,
            lastActivity: this.lastActivity
        };
    }

    loadState(state) {
        if (state.sessionId) this.sessionId = state.sessionId;
        if (state.connectionStatus) this.connectionStatus = state.connectionStatus;
        if (state.retryCount !== undefined) this.retryCount = state.retryCount;
        if (state.messageHistory) this.messageHistory = state.messageHistory;
        if (state.connectionHealth) this.connectionHealth = state.connectionHealth;
        if (state.lastActivity) this.lastActivity = state.lastActivity;
    }
}
