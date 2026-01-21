/**
 * AIClient - Handles low-level AI HTTP communication and model configurations
 * Extracted from AIService to comply with SRP
 *
 * SOLID Principles:
 * - S: Only handles HTTP communication and retries
 * - O: Extensible to new endpoints/models
 * - L: N/A
 * - I: Clean interface for AI calls
 * - D: Depends on AIHealthMonitor for health tracking
 */

import { logManager } from '../../utils/logManager.js';
import { AIHealthMonitor } from './AIHealthMonitor.js';
import { AISlotManager, aiSlotManager, AISlotPriorities } from './AISlotManager.js';
import { aiConnectionKeepAlive } from './AIConnectionKeepAlive.js';
import { pipelineEventBus } from '../pipeline/PipelineEventBus.js';

export class AIClient {
    constructor() {
        this.logger = logManager.child({ component: 'AIClient' });
        this.healthMonitor = new AIHealthMonitor();
        this.healthMonitor.startHealthCheck();

        // Start connection keep-alive to prevent Windows HTTP timeout
        aiConnectionKeepAlive.startAll();

        // CPU Concurrency Control (Matches --parallel 4 in start_brain_cpu.bat)
        // Usage: 3 Mappers (parallel) + 1 Synthesizer (DNASynth/Evolution)
        this.cpuSlotManager = new AISlotManager(4);

        // Circuit Breaker state (Per endpoint)
        this.failures = {
            main: 0,
            cpu: 0
        };
        this.circuitOpenUntil = {
            main: 0,
            cpu: 0
        };
        this.FAILURE_THRESHOLD = 3;
        this.FATAL_THRESHOLD = 5;
        this.COOLDOWN_MS = 60000; // 1 minute
        this.isFatal = {
            main: false,
            cpu: false
        };
    }

    _checkCircuit(type = 'main') {
        if (this.isFatal[type]) {
            throw new Error(`CRITICAL_AI_FAILURE: AI Service (${type}) is definitively offline. Check server integrity.`);
        }
        if (this.circuitOpenUntil[type] > Date.now()) {
            const remaining = Math.ceil((this.circuitOpenUntil[type] - Date.now()) / 1000);
            throw new Error(`Circuit Breaker OPEN for ${type}. AI offline. Try again in ${remaining}s.`);
        }
    }

    _onFailure(type = 'main') {
        this.failures[type]++;
        const count = this.failures[type];

        if (count >= this.FAILURE_THRESHOLD) {
            this.circuitOpenUntil[type] = Date.now() + this.COOLDOWN_MS;
            this.logger.error(`🚨 CIRCUIT BREAKER OPENED for ${type} after ${count} failures.`);
        }

        if (count >= this.FATAL_THRESHOLD) {
            this.isFatal[type] = true;
            this.logger.error(`❌ FATAL AI FAILURE: ${type} server has failed ${count} times consecutively.`);
        }
    }

    _onSuccess(type = 'main') {
        if (this.failures[type] > 0) {
            this.logger.info(`Circuit reset for ${type} after success.`);
        }
        this.failures[type] = 0;
        this.circuitOpenUntil[type] = 0;
        this.isFatal[type] = false; // Reset fatal state ONLY for this type
    }

    /**
     * Prepare payload object according to format and schema
     */
    _preparePayload(config) {
        const payload = {
            model: "lfm2.5",
            messages: [{ role: "system", content: config.systemPrompt }, { role: "user", content: config.userMessage }],
            temperature: config.temperature,
            n_predict: 4096
        };

        if (config.format === 'json_object') {
            payload.response_format = { type: "json_object" };
            if (config.schema) payload.response_format.schema = config.schema;
        }

        return payload;
    }

    /**
     * Shared endpoint caller for both GPU and CPU AI calls
     */
    async _callEndpoint(config) {
        const { endpoint, port, useSlots, priority, type, timeout, maxRetries, keepAlive, slotManager } = config;
        const circuitType = type.includes('gpu') ? 'main' : 'cpu';

        this._checkCircuit(circuitType);

        if (useSlots) {
            await slotManager.acquire(priority);
        }

        const isUrgent = priority === AISlotPriorities.URGENT;
        const eventPayload = { port, type, priority };

        pipelineEventBus.emit(`ai:${type.split('-')[0]}:start`, eventPayload);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const payload = this._preparePayload(config);

            const response = await this._fetchWithRetry(endpoint, payload, controller, maxRetries, keepAlive);
            clearTimeout(timeoutId);

            if (!response.ok) {
                this.logger.error(`Response ERROR: ${response.status}`);
            } else if (!this._hasLoggedOnline) {
                this.logger.info(`✅ AI Server ONLINE`);
                this._hasLoggedOnline = true;
            }

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            this.updateHealth(true);
            this._onSuccess(circuitType);
            pipelineEventBus.emit(`ai:${type.split('-')[0]}:end`, { ...eventPayload, success: true });
            return data.choices[0].message.content;
        } catch (error) {
            this.updateHealth(false);
            this._onFailure(circuitType);
            pipelineEventBus.emit(`ai:${type.split('-')[0]}:end`, { ...eventPayload, success: false, error: error.message });

            if (error.message.includes('fetch failed')) {
                this.logger.error(`🚨 CRITICAL NETWORK FAILURE: Connection reset or server crash. Check llama.cpp.`);
            } else {
                this.logger.error(`AI Error: ${error.message}`);
            }
            throw error;
        } finally {
            if (useSlots) {
                slotManager.release(isUrgent);
            }
        }
    }

    /**
     * Fetch with retry logic
     */
    async _fetchWithRetry(endpoint, payload, controller, maxRetries, keepAlive) {
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                if (keepAlive) headers['Connection'] = 'keep-alive';

                const response = await fetch(endpoint, {
                    signal: controller.signal,
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload)
                });

                if (response.ok) return response;

                // If 4xx error (except 429), do not retry
                if (response.status >= 400 && response.status < 500 && response.status !== 429) return response;

                throw new Error(`Server returned ${response.status}`);
            } catch (err) {
                attempt++;

                const isNetworkError = err.message.includes('fetch failed') || err.message.includes('socket') || err.message.includes('reset');
                const isTimeout = err.name === 'AbortError';

                if (attempt >= maxRetries) {
                    if (isTimeout) throw new Error(`AI Timeout after ${maxRetries} attempts. Server is hanging.`);
                    throw err;
                }

                // Exponential backoff: 3s, 9s, 27s...
                const delay = Math.pow(3, attempt) * 1000;
                this.logger.warn(`AI [${isTimeout ? 'Timeout' : 'NetError'}] Retry ${attempt}/${maxRetries} in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    /**
     * Call AI on main endpoint (GPU)
     */
    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null, priority = AISlotPriorities.NORMAL) {
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const endpoint = (_window?.AI_CONFIG?.endpoint) || 'http://127.0.0.1:8000/v1/chat/completions';

        return this._callEndpoint({
            endpoint,
            port: 8000,
            useSlots: true,
            priority,
            type: 'gpu-inference',
            timeout: 180000,
            maxRetries: 4,
            keepAlive: true,
            slotManager: aiSlotManager,
            systemPrompt,
            userMessage,
            temperature,
            format,
            schema
        });
    }

    /**
     * Call AI on CPU server (Port 8002) - Dedicated for Mappers
     */
    async callAI_CPU(systemPrompt, userMessage, temperature, format = null, schema = null) {
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const endpoint = (_window?.AI_CONFIG?.mapperEndpoint) || 'http://127.0.0.1:8002/v1/chat/completions';

        return this._callEndpoint({
            endpoint,
            port: 8002,
            useSlots: true,
            priority: AISlotPriorities.NORMAL, // CPU doesn't use priority but needs the parameter
            type: 'cpu-inference',
            timeout: 900000,
            maxRetries: 2,
            keepAlive: false,
            slotManager: this.cpuSlotManager,
            systemPrompt,
            userMessage,
            temperature,
            format,
            schema
        });
    }

    /**
     * Update health status
     */
    updateHealth(isOnline) {
        this.healthMonitor.updateHealth(isOnline);
    }

    /**
     * Start health check
     */
    startHealthCheck() {
        this.healthMonitor.startHealthCheck();
    }
}
