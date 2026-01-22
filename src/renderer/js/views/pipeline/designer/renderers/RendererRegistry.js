/**
 * RendererRegistry.js
 * Registry to handle renderer dependencies and avoid circular imports
 * ISP/DIP: Provides clean interface for renderer interactions
 */

// Import renderers statically to avoid circular dependencies
import { TextRenderer } from './TextRenderer.js';

export const RendererRegistry = {
    _renderers: new Map(),

    /**
     * Register a renderer by name
     * @param {string} name - Renderer name
     * @param {Object} renderer - Renderer instance
     */
    register(name, renderer) {
        this._renderers.set(name, renderer);
    },

    /**
     * Get a registered renderer by name
     * @param {string} name - Renderer name
     * @returns {Object|null} Renderer instance or null
     */
    get(name) {
        return this._renderers.get(name) || null;
    },

    /**
     * Check if a renderer is registered
     * @param {string} name - Renderer name
     * @returns {boolean}
     */
    has(name) {
        return this._renderers.has(name);
    },

    /**
     * Get all registered renderer names
     * @returns {string[]}
     */
    getRegisteredNames() {
        return Array.from(this._renderers.keys());
    }
};

// Register core renderers
RendererRegistry.register('TextRenderer', TextRenderer);
