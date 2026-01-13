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
}
