/**
 * NotesExtractor.js
 * Sistema para extraer y leer rápidamente notas del diseñador de pipeline
 * Busca tanto en notas adhesivas como en mensajes de nodos
 */

import { DesignerStore } from './DesignerStore.js';

export const NotesExtractor = {
    /**
     * Extrae todos los nodos que podrían contener notas o mensajes
     * @returns {Array} Lista de nodos con posibles notas/mensajes
     */
    getAllNoteSources() {
        const nodes = DesignerStore.state.nodes;
        return Object.values(nodes).filter(node =>
            node.isStickyNote || node.message || node.text
        );
    },

    /**
     * Extrae notas dentro de un contenedor específico
     * @param {string} containerId - ID del contenedor
     * @returns {Array} Lista de nodos con notas/mensajes encontrados dentro del contenedor
     */
    getNotesInContainer(containerId) {
        const nodes = DesignerStore.state.nodes;
        return Object.values(nodes).filter(node =>
            (node.isStickyNote || node.message || node.text) && node.parentId === containerId
        );
    },

    /**
     * Busca nodos con texto contenido en mensaje o texto
     * @param {string} searchText - Texto a buscar en los nodos
     * @returns {Array} Lista de nodos que contienen el texto
     */
    findNotesByText(searchText) {
        const allNoteSources = this.getAllNoteSources();
        return allNoteSources.filter(node =>
            (node.text && node.text.toLowerCase().includes(searchText.toLowerCase())) ||
            (node.message && node.message.toLowerCase().includes(searchText.toLowerCase()))
        );
    },

    /**
     * Busca nodos por contenedor
     * @param {string} containerLabel - Etiqueta del contenedor
     * @returns {Array} Lista de nodos encontrados en el contenedor
     */
    findNotesByContainer(containerLabel) {
        const nodes = DesignerStore.state.nodes;

        // Buscar el contenedor por etiqueta
        const container = Object.values(nodes).find(node =>
            node.label && node.label.toLowerCase().includes(containerLabel.toLowerCase()) && node.isRepoContainer
        );

        if (!container) {
            console.log(`[NotesExtractor] Contenedor "${containerLabel}" no encontrado`);
            return [];
        }

        console.log(`[NotesExtractor] Buscando nodos con notas/mensajes en contenedor: ${container.label} (ID: ${container.id})`);

        // Obtener todos los nodos con notas/mensajes en ese contenedor
        return this.getNotesInContainer(container.id);
    },

    /**
     * Extrae información detallada de un nodo con mensaje/nota
     * @param {Object} node - Objeto de nodo
     * @returns {Object} Información detallada del nodo
     */
    getNodeDetails(node) {
        const nodes = DesignerStore.state.nodes;

        // Obtener información del contenedor padre
        let parentContainer = null;
        if (node.parentId) {
            parentContainer = nodes[node.parentId];
        }

        // Buscar el contenedor raíz si hay jerarquía
        let rootNode = node;
        while (rootNode.parentId && nodes[rootNode.parentId]) {
            rootNode = nodes[rootNode.parentId];
        }

        return {
            id: node.id,
            text: node.text || '',
            message: node.message || '',
            label: node.label,
            position: { x: node.x, y: node.y },
            isStickyNote: node.isStickyNote || false,
            parentContainer: parentContainer ? {
                id: parentContainer.id,
                label: parentContainer.label
            } : null,
            rootNode: {
                id: rootNode.id,
                label: rootNode.label
            },
            createdAt: node.createdAt || 'Fecha desconocida'
        };
    },

    /**
     * Lee todos los nodos con mensajes/notas y muestra información resumida
     */
    readAllNoteSources() {
        const allNoteSources = this.getAllNoteSources();

        if (allNoteSources.length === 0) {
            console.log('[NotesExtractor] No se encontraron nodos con mensajes o notas en el sistema');
            return [];
        }

        console.log(`[NotesExtractor] Se encontraron ${allNoteSources.length} nodos con mensajes o notas:`);

        const details = allNoteSources.map(node => {
            const nodeDetails = this.getNodeDetails(node);
            console.log(`- Nodo ID: ${nodeDetails.id}`);
            console.log(`  Tipo: ${nodeDetails.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
            console.log(`  Etiqueta: "${nodeDetails.label}"`);
            if (nodeDetails.text) {
                console.log(`  Texto: "${nodeDetails.text.substring(0, 50)}${nodeDetails.text.length > 50 ? '...' : ''}"`);
            }
            if (nodeDetails.message) {
                console.log(`  Mensaje: "${nodeDetails.message.substring(0, 50)}${nodeDetails.message.length > 50 ? '...' : ''}"`);
            }
            console.log(`  Posición: (${nodeDetails.position.x}, ${nodeDetails.position.y})`);
            if (nodeDetails.parentContainer) {
                console.log(`  Contenedor Padre: ${nodeDetails.parentContainer.label} (ID: ${nodeDetails.parentContainer.id})`);
            }
            console.log(`  Nodo Raíz: ${nodeDetails.rootNode.label} (ID: ${nodeDetails.rootNode.id})`);
            console.log('  ---');
            return nodeDetails;
        });

        return details;
    },

    /**
     * Lee nodos específicos en el contenedor "Auditor" o "Content Auditor"
     */
    readAuditorNotes() {
        console.log('[NotesExtractor] Buscando nodos con mensajes/notas en el contenedor de Auditoría...');

        // Intentar buscar por diferentes variantes del nombre
        const possibleLabels = ['auditor', 'content auditor', 'audit'];

        for (const label of possibleLabels) {
            const nodes = this.findNotesByContainer(label);
            if (nodes.length > 0) {
                console.log(`[NotesExtractor] Encontrados ${nodes.length} nodos con mensajes/notas en el contenedor "${label}":`);

                nodes.forEach((node, index) => {
                    const details = this.getNodeDetails(node);
                    console.log(`\n${index + 1}. Nodo en "${details.parentContainer?.label || 'desconocido'}":`);
                    console.log(`   ID: ${details.id}`);
                    console.log(`   Etiqueta: ${details.label}`);
                    console.log(`   Tipo: ${details.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
                    if (details.text) {
                        console.log(`   Texto: "${details.text}"`);
                    }
                    if (details.message) {
                        console.log(`   Mensaje: "${details.message}"`);
                    }
                });

                return nodes;
            }
        }

        console.log('[NotesExtractor] No se encontraron nodos con mensajes/notas en contenedores de auditoría');
        return [];
    },

    /**
     * Busca un nodo específico por contenido en mensaje o texto
     * @param {string} content - Contenido a buscar
     * @returns {Object|null} Nodo encontrado o null si no se encuentra
     */
    findNodeByContent(content) {
        const allNoteSources = this.getAllNoteSources();
        const foundNode = allNoteSources.find(node =>
            (node.text && node.text.toLowerCase().includes(content.toLowerCase())) ||
            (node.message && node.message.toLowerCase().includes(content.toLowerCase()))
        );

        if (foundNode) {
            return this.getNodeDetails(foundNode);
        }

        return null;
    }
};