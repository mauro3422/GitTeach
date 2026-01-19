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
     * Call AI on main endpoint (GPU)
     */
    async callAI(systemPrompt, userMessage, temperature, format = null, schema = null, priority = AISlotPriorities.NORMAL) {
        this._checkCircuit('main');
        const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
        const ENDPOINT = (_window?.AI_CONFIG?.endpoint) || 'http://127.0.0.1:8000/v1/chat/completions';
        const isUrgent = priority === AISlotPriorities.URGENT;
        const eventPayload = {
            port: 8000,
            type: 'gpu-inference',
            priority
        };

        await aiSlotManager.acquire(priority);
        // NUEVO: Emitir evento de inicio
        pipelineEventBus.emit('ai:gpu:start', eventPayload);
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
            const maxRetries = 4; // Increased retries

            while (attempt < maxRetries) {
                try {
                    response = await fetch(ENDPOINT, {
                        signal: controller.signal,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Connection': 'keep-alive'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) break;

                    // If 4xx error (except 429), do not retry
                    if (response.status >= 400 && response.status < 500 && response.status !== 429) break;

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
            this._onSuccess('main');
            // NUEVO: Emitir evento de fin exitoso
            pipelineEventBus.emit('ai:gpu:end', { ...eventPayload, success: true });
            return data.choices[0].message.content;
        } catch (error) {
            this.updateHealth(false);
            this._onFailure('main');
            // NUEVO: Emitir evento de fin con error
            pipelineEventBus.emit('ai:gpu:end', { ...eventPayload, success: false, error: error.message });

            if (error.message.includes('fetch failed')) {
                this.logger.error(`🚨 CRITICAL NETWORK FAILURE: Connection reset or server crash. Check llama.cpp.`);
            } else {
                this.logger.error(`AI Error: ${error.message}`);
            }
            throw error;
        } finally {
            aiSlotManager.release(isUrgent);
        }
    }

    /**
     * Call AI on CPU server (Port 8002) - Dedicated for Mappers
     * Does NOT use slot manager since CPU has its own dedicated slots
     */
    async callAI_CPU(systemPrompt, userMessage, temperature, format = null, schema = null) {
        this._checkCircuit('cpu');

        await this.cpuSlotManager.acquire();
        const startTime = Date.now();
        const eventPayload = {
            port: 8002,
            type: 'cpu-inference'
        };

        // NUEVO: Emitir evento de inicio
        pipelineEventBus.emit('ai:cpu:start', eventPayload);

        try {
            const _window = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global.window : {});
            const CPU_ENDPOINT = (_window?.AI_CONFIG?.mapperEndpoint) || 'http://127.0.0.1:8002/v1/chat/completions';

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                const elapsed = Date.now() - startTime;
                this.logger.warn(`CPU AI request timing out after ${elapsed}ms...`);
                controller.abort();
            }, 900000); // Increased to 15 minutes for dense synthesis

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
            const maxRetries = 2;

            while (attempt < maxRetries) {
                try {
                    response = await fetch(CPU_ENDPOINT, {
                        signal: controller.signal,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) break;
                    if (response.status >= 400 && response.status < 500) break;
                    throw new Error(`Server returned ${response.status}`);
                } catch (err) {
                    attempt++;
                    if (attempt >= maxRetries || err.name === 'AbortError') throw err;
                    const delay = attempt * 3000;
                    this.logger.warn(`CPU AI Retry ${attempt}/${maxRetries} after ${delay}ms: ${err.message}`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                const elapsed = Date.now() - startTime;
                this.logger.error(`CPU Response ERROR: ${response.status} after ${elapsed}ms`);
                this._onFailure('cpu');
                throw new Error(`CPU Status: ${response.status}`);
            }

            const data = await response.json();
            const elapsed = Date.now() - startTime;
            this.logger.info(`CPU AI Success in ${elapsed}ms`);
            this._onSuccess('cpu');
            // NUEVO: Emitir evento de fin exitoso
            pipelineEventBus.emit('ai:cpu:end', { ...eventPayload, success: true });
            return data.choices[0].message.content;
        } catch (error) {
            const elapsed = Date.now() - startTime;
            // NUEVO: Emitir evento de fin con error
            pipelineEventBus.emit('ai:cpu:end', { ...eventPayload, success: false, error: error.message });
            if (error.name === 'AbortError') {
                this.logger.error(`❌ CPU AI ABORTED after ${elapsed}ms. Reason: ${error.message}`);
            } else {
                this.logger.error(`❌ CPU AI Error after ${elapsed}ms: ${error.message}`);
            }
            this._onFailure('cpu');
            throw error;
        } finally {
            this.cpuSlotManager.release();
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
