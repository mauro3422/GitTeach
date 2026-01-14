/**
 * BaseTool - Base interface for all AI tools.
 * Follows Single Responsibility and Interface Segregation principles.
 */
export class BaseTool {
    constructor(id, name, description, examples = [], schema = {}) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.examples = examples;
        this.schema = schema;
    }

    /**
     * Tool execution logic.
     * @param {Object} params - Parameters extracted by AI.
     * @param {string} username - Current user.
     * @returns {Promise<{success: boolean, details: string}>}
     */
    async execute(params, username) {
        throw new Error("The execute() method must be implemented by the subclass.");
    }

    /**
     * Helper to get normalized colors.
     */
    getColor(name) {
        const colors = {
            'red': 'ff5555', 'rojo': 'ff5555',
            'blue': '00aeff', 'azul': '00aeff',
            'green': '2ecc71', 'verde': '2ecc71',
            'purple': '9b59b6', 'violets': '9b59b6', 'violeta': '9b59b6',
            'orange': 'f39c12', 'naranja': 'f39c12',
            'black': '000000', 'negro': '000000',
            'white': 'ffffff', 'blanco': 'ffffff'
        };
        return colors[name?.toLowerCase()] || name || 'auto';
    }

    /**
     * Check if a widget URL is available.
     * Uses GET request with timeout for reliability.
     * @param {string} url - Widget URL to check
     * @returns {Promise<boolean>} - True if available
     */
    async isWidgetAvailable(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return res.ok;
        } catch (e) {
            console.warn(`Widget check failed for ${url}:`, e);
            return false;
        }
    }
}
