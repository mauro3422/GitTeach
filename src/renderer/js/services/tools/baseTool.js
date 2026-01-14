/**
 * BaseTool - Interfaz base para todas las herramientas de la IA.
 * Sigue el principio de Responsabilidad Única y Segregación de Interfaces.
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
     * Lógica de ejecución de la herramienta.
     * @param {Object} params - Parámetros extraídos por la IA.
     * @param {string} username - Usuario actual.
     * @returns {Promise<{success: boolean, details: string}>}
     */
    async execute(params, username) {
        throw new Error("El método execute() debe ser implementado por la subclase.");
    }

    /**
     * Helper para obtener colores normalizados.
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
    async verifyWidget(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                mode: 'no-cors' // Important for opaque response if CORS is issues, but for availability check might be enough
            });
            clearTimeout(timeoutId);

            // With no-cors we can't check status 200 properly, but if it doesn't throw, it's likely reachable.
            // However, for SVG widgets often CORS is allowed. Let's try normal fetch first.
            return true;
        } catch (e) {
            // If fetch fails (network error, DNS), we assume it's down
            return false;
        }
    }

    /**
     * Helper to check status with a real GET if HEAD fails/CORS issues
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
