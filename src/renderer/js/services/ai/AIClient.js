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

import { AIHealthMonitor } from './AIHealthMonitor.js';
import { aiSlotManager } from './AISlotManager.js';

export class AIClient {
    constructor() {
        this.healthMonitor = new AIHealthMonitor();
        this.healthMonitor.startHealthCheck();

        // Circuit Breaker state
        this.consecutiveFailures = 0;
        this.circuitOpenUntil = 0;
        this.FAILURE_THRESHOLD = 3;
        this.COOLDOWN_MS = 60000; // 1 minute
    }

    _checkCircuit() {
        if (this.circuitOpenUntil > Date.now()) {
            const remaining = Math.ceil((this.circuitOpenUntil - Date.now()) / 1000);
            throw new Error(`Circuit Breaker OPEN. AI offline. Try again in ${remaining}s.`);
        }
    }

    _onFailure() {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
            this.circuitOpenUntil = Date.now() + this.COOLDOWN_MS;
            console.error(`[AIClient] 🚨 CIRCUIT BREAKER OPENED for ${this.COOLDOWN_MS}ms after ${this.consecutiveFailures} failures.`);
        }
    }

    _onSuccess() {
        if (this.consecutiveFailures > 0) {
            console.log(`[AIClient] Circuit reset after success.`);
        }
        this.consecutiveFailures = 0;
        this.circuitOpenUntil = 0;
    }

    /**
     * Call AI on main endpoint (GPU)
     */
    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null, priority = 'URGENT') {
        this._checkCircuit();
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const ENDPOINT = (_window?.AI_CONFIG?.endpoint) || 'http://localhost:8000/v1/chat/completions';

        await aiSlotManager.acquire(priority);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const payload = {
                model: "lfm2.5",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                temperature,
                n_predict: 4096
            };

            if (format === 'json_object') {
                payload.response_format = { type: "json_object" };
                if (schema) payload.response_format.schema = schema;
            }

            let response;
            let attempt = 0;
            const maxRetries = 3;

            while (attempt < maxRetries) {
                try {
                    response = await fetch(ENDPOINT, {
                        signal: controller.signal,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) break;

                    // If 4xx error, do not retry (client error)
                    if (response.status >= 400 && response.status < 500) break;

                    throw new Error(`Server returned ${response.status}`);
                } catch (err) {
                    attempt++;
                    if (attempt >= maxRetries) throw err;

                    // Exponential backoff: 1s, 2s, 4s...
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.warn(`[AIClient] Retry ${attempt}/${maxRetries} after ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[AIClient] ❌ Response ERROR: ${response.status}`);
            } else if (!this._hasLoggedOnline) {
                console.log(`[AIClient] ✅ AI Server ONLINE`);
                this._hasLoggedOnline = true;
            }

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            this.updateHealth(true);
            this._onSuccess();
            return data.choices[0].message.content;
        } catch (error) {
            this.updateHealth(false);
            this._onFailure();
            console.error("[AIClient] ❌ AI Error:", error.message);
            throw error;
        } finally {
            aiSlotManager.release();
        }
    }

    /**
     * Call AI on CPU server (Port 8002) - Dedicated for Mappers
     * Does NOT use slot manager since CPU has its own dedicated slots
     */
    async callAI_CPU(systemPrompt, userMessage, temperature, format = null, schema = null) {
        this._checkCircuit();
        const CPU_ENDPOINT = 'http://localhost:8002/v1/chat/completions';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);

            const payload = {
                model: "lfm2.5",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
                temperature,
                n_predict: 4096
            };

            if (format === 'json_object') {
                payload.response_format = { type: "json_object" };
                if (schema) payload.response_format.schema = schema;
            }

            const response = await fetch(CPU_ENDPOINT, {
                signal: controller.signal,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`[AIClient] ❌ CPU Response ERROR: ${response.status}`);
                this._onFailure();
                throw new Error(`CPU Status: ${response.status}`);
            }

            const data = await response.json();
            this._onSuccess();
            return data.choices[0].message.content;
        } catch (error) {
            this._onFailure();
            console.error("[AIClient] ❌ CPU AI Error:", error.message);
            throw error;
        }
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
