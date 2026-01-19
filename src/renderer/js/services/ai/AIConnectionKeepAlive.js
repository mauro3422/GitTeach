/**
 * AIConnectionKeepAlive - Prevents Windows HTTP timeout by maintaining active connections
 * 
 * Problem: Windows has a ~10 minute timeout for inactive HTTP connections.
 * Solution: Periodically ping the AI server's /health endpoint to keep the connection alive.
 * 
 * This module runs independently and ensures that the OS doesn't close our connections
 * while we're waiting for long-running inference tasks to complete.
 */

import { logManager } from '../../utils/logManager.js';

export class AIConnectionKeepAlive {
    constructor() {
        this.logger = logManager.child({ component: 'KeepAlive' });
        this.intervals = {};
        this.PING_INTERVAL_MS = 30000; // Ping every 30 seconds (well under 10 min timeout)

        // Endpoints to keep alive
        this.endpoints = {
            gpu: 'http://127.0.0.1:8000/health',
            cpu: 'http://127.0.0.1:8002/health',
            vectors: 'http://127.0.0.1:8001/health'
        };

        this.status = {
            gpu: false,
            cpu: false,
            vectors: false
        };
    }

    /**
     * Start keeping all AI connections alive
     */
    startAll() {
        Object.keys(this.endpoints).forEach(name => this.start(name));
        this.logger.info('🔗 Connection KeepAlive started for all AI servers');
    }

    /**
     * Start keeping a specific endpoint alive
     * @param {string} name - 'gpu', 'cpu', or 'vectors'
     */
    start(name) {
        if (this.intervals[name]) {
            return; // Already running
        }

        const endpoint = this.endpoints[name];
        if (!endpoint) {
            this.logger.warn(`Unknown endpoint: ${name}`);
            return;
        }

        // Immediate first ping
        this._ping(name, endpoint);

        // Set up periodic pings
        this.intervals[name] = setInterval(() => {
            this._ping(name, endpoint);
        }, this.PING_INTERVAL_MS);
    }

    /**
     * Stop keeping a specific endpoint alive
     */
    stop(name) {
        if (this.intervals[name]) {
            clearInterval(this.intervals[name]);
            delete this.intervals[name];
            this.logger.debug(`KeepAlive stopped for ${name}`);
        }
    }

    /**
     * Stop all keep-alive pings
     */
    stopAll() {
        Object.keys(this.intervals).forEach(name => this.stop(name));
        this.logger.info('🔗 Connection KeepAlive stopped');
    }

    /**
     * Internal ping function
     */
    async _ping(name, endpoint) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for ping

            const response = await fetch(endpoint, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Connection': 'keep-alive'
                }
            });

            clearTimeout(timeoutId);

            const wasOffline = !this.status[name];
            this.status[name] = response.ok;

            if (response.ok && wasOffline) {
                this.logger.info(`✅ ${name.toUpperCase()} server is now ONLINE`);
            } else if (!response.ok && !wasOffline) {
                this.logger.warn(`⚠️ ${name.toUpperCase()} server returned ${response.status}`);
            }
        } catch (error) {
            const wasOnline = this.status[name];
            this.status[name] = false;

            if (wasOnline) {
                this.logger.warn(`⚠️ ${name.toUpperCase()} server went OFFLINE: ${error.message}`);
            }
        }
    }

    /**
     * Get current status of all connections
     */
    getStatus() {
        return { ...this.status };
    }

    /**
     * Check if a specific server is online
     */
    isOnline(name) {
        return this.status[name] === true;
    }
}

// Singleton instance
export const aiConnectionKeepAlive = new AIConnectionKeepAlive();
