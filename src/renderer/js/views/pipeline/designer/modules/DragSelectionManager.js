/**
 * DragSelectionManager.js
 *
 * ROBUST PATTERN: Single Source of Truth for Drag and Selection
 *
 * Responsabilidad:
 * - Centraliza TODA la lógica de drag y selección
 * - Proporciona hit-testing preciso y consistente
 * - Sincroniza estado entre DesignerStore y DragStrategy
 * - Auto-valida estados inválidos
 *
 * Principios:
 * 1. ÚNICO lugar para selección y drag state
 * 2. Hit-testing consistente en todos los nodos
 * 3. Fallback robusto para casos edge
 * 4. Validación automática
 */

import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { BoundsCalculator } from '../utils/BoundsCalculator.js';
import { ScalingCalculator } from '../utils/ScalingCalculator.js';
import { HitTester } from './services/HitTester.js';

// Acceso a DesignerStore - ya está expuesto globalmente en window
function getDesignerStore() {
    if (typeof window === 'undefined' || !window.DesignerStore) {
        console.error('[DragSelectionManager] DesignerStore not available in window');
        return null;
    }
    return window.DesignerStore;
}

export const DragSelectionManager = {
    /**
     * CORE: Encuentra el nodo en una posición con hit-testing preciso
     * Single Source of Truth para hit detection
     *
     * @param {Array} nodeList - Lista de nodos (por orden de renderizado)
     * @param {Object} worldPos - Posición en world space {x, y}
     * @param {number} zoomScale - Current zoom level
     * @param {string} excludeId - ID de nodo a excluir (opcional)
     * @returns {Object|null} Nodo encontrado o null
     */
    findNodeAtPosition(nodeList, worldPos, zoomScale, excludeId = null) {
        if (!nodeList || nodeList.length === 0) return null;
        if (!worldPos) return null;

        // FIX: Ensure containers generally have correct flag if labelled 'Box'
        nodeList.forEach(node => {
            if (!node) return;
            if (typeof node.isRepoContainer === 'undefined' && node.label?.includes('Box')) {
                node.isRepoContainer = true;
            }
        });

        // Use the centralized HitTester which implements correct layering (Sticky -> Regular -> Container)
        // rather than re-implementing 3 loops here.
        // Convert array back to map if needed, but HitTester handles array-like objects if they have values()
        // Here we just pass the raw list disguised as values for HitTester or adapt HitTester to accept arrays better.
        // Actually HitTester expects an object where Object.values() works. 
        // If nodeList is array, Object.values(array) is the array itself. Correct.

        // However, HitTester signature is (worldPos, nodes, zoom, excludeId)
        // DragSelectionManager signature is (nodeList, worldPos, zoom, excludeId) -> nodeList is Array.

        // Single Source of Truth
        return HitTester.findNodeAt(worldPos, nodeList, zoomScale, excludeId);
    },

    /**
     * INTERNAL: Hit test para un nodo específico
     * Centraliza la lógica de detección
     *
     * @private
     */
    _hitTestNode(node, worldPos, zoomScale, hitBuffer, nodeType) {
        let bounds;

        // Issue #13: Use cached bounds when available
        const store = getDesignerStore();
        if (store && store.getCachedBounds && node.id) {
            bounds = store.getCachedBounds(node.id, zoomScale);
        }

        // Fallback: Compute bounds if not cached
        if (!bounds) {
            if (nodeType === 'sticky') {
                bounds = BoundsCalculator.getStickyNoteBounds(node, null, zoomScale);
            } else if (nodeType === 'container') {
                if (!store || !store.state || !store.state.nodes) {
                    console.warn('[DragSelectionManager] Cannot get container bounds: DesignerStore not available');
                    return false;
                }
                const nodes = store.state.nodes;
                bounds = BoundsCalculator.getContainerBounds(node, nodes, zoomScale);
            } else {
                // Regular node: usar radio
                const radius = ScalingCalculator.getNodeRadius(node, zoomScale);
                bounds = {
                    centerX: node.x,
                    centerY: node.y,
                    renderW: radius * 2,
                    renderH: radius * 2
                };
            }
        }

        if (!bounds) return false;

        // ROBUST: Usar límites visuales (renderW/renderH) para detección precisa
        const effectiveW = (bounds.renderW || bounds.w) + hitBuffer * 2;
        const effectiveH = (bounds.renderH || bounds.h) + hitBuffer * 2;
        const left = bounds.centerX - effectiveW / 2;
        const top = bounds.centerY - effectiveH / 2;
        const right = bounds.centerX + effectiveW / 2;
        const bottom = bounds.centerY + effectiveH / 2;

        return (
            worldPos.x >= left &&
            worldPos.x <= right &&
            worldPos.y >= top &&
            worldPos.y <= bottom
        );
    },

    /**
     * UNIFIED: Inicia selección y drag
     * Centraliza lógica que antes estaba en DesignerInteraction + DragStrategy
     *
     * @param {Object} node - Nodo a seleccionar y arrastrar
     * @param {Object} worldPos - Posición inicial
     * @param {string} actionType - 'DRAG' | 'SELECT'
     */
    startInteraction(node, worldPos, actionType = 'DRAG') {
        if (!node) return false;

        // CRITICAL: Crear savepoint ANTES de cualquier cambio
        getDesignerStore().savepoint('NODE_MOVE', { nodeId: node.id });

        // UNIFIED: Seleccionar nodo
        getDesignerStore().selectNode(node.id);

        // UNIFIED: Registrar estado de drag
        if (actionType === 'DRAG') {
            getDesignerStore().setDragging(node.id);
        }

        return true;
    },

    /**
     * UNIFIED: Cancela selección y drag
     */
    cancelInteraction() {
        getDesignerStore().clearSelection();
        getDesignerStore().setDragging(null);
    },

    /**
     * VALIDATION: Verifica que el estado sea válido
     * Auto-corrige inconsistencias
     */
    validateState() {
        const state = getDesignerStore().state.interaction;
        const nodes = getDesignerStore().state.nodes;

        // Validar que nodos referenciados existan
        if (state.selectedNodeId && !nodes[state.selectedNodeId]) {
            console.warn('[DragSelectionManager] Selected node no longer exists, clearing selection');
            getDesignerStore().clearSelection();
            return false;
        }

        if (state.draggingNodeId && !nodes[state.draggingNodeId]) {
            console.warn('[DragSelectionManager] Dragging node no longer exists, cancelling drag');
            getDesignerStore().setDragging(null);
            return false;
        }

        // Validar que hoveredNodeId sea válido
        if (state.hoveredNodeId && !nodes[state.hoveredNodeId]) {
            console.warn('[DragSelectionManager] Hovered node no longer exists, clearing hover');
            getDesignerStore().setHover(null);
            return false;
        }

        return true;
    },

    /**
     * HELPER: Obtiene información del nodo seleccionado
     */
    getSelectedNode() {
        const selectedId = getDesignerStore().state.interaction.selectedNodeId;
        if (!selectedId) return null;
        return getDesignerStore().state.nodes[selectedId];
    },

    /**
     * HELPER: Verifica si un nodo está siendo arrastrado
     */
    isDragging(nodeId = null) {
        if (nodeId) {
            return getDesignerStore().state.interaction.draggingNodeId === nodeId;
        }
        return getDesignerStore().state.interaction.draggingNodeId !== null;
    },

    /**
     * HELPER: Verifica si un nodo está seleccionado
     */
    isSelected(nodeId = null) {
        if (nodeId) {
            return getDesignerStore().state.interaction.selectedNodeId === nodeId;
        }
        return getDesignerStore().state.interaction.selectedNodeId !== null;
    }
};

/**
 * DEBUG: Helper para analizar containers
 */
DragSelectionManager.debugContainers = function () {
    const store = getDesignerStore();
    if (!store || !store.state.nodes) {
        console.log('❌ DesignerStore not available');
        return;
    }

    const containers = Object.values(store.state.nodes).filter(n => n.isRepoContainer === true);
    const stickies = Object.values(store.state.nodes).filter(n => n.isStickyNote === true);
    const regular = Object.values(store.state.nodes).filter(n => !n.isRepoContainer && !n.isStickyNote);

    console.log(`
=== NODO STATS ===
Containers: ${containers.length}
${containers.map(c => `  - ${c.id}: (${c.x}, ${c.y}) isRepoContainer=${c.isRepoContainer}`).join('\n')}

Sticky Notes: ${stickies.length}
${stickies.map(s => `  - ${s.id}: (${s.x}, ${s.y}) isStickyNote=${s.isStickyNote}`).join('\n')}

Regular Nodes: ${regular.length}
${regular.map(r => `  - ${r.id}: (${r.x}, ${r.y})`).join('\n')}
    `);

    // Test hit detection
    console.log('\n=== HIT TEST SAMPLE ===');
    const testPos = { x: 100, y: 100 };
    const found = DragSelectionManager.findNodeAtPosition(Object.values(store.state.nodes), testPos, 1.0);
    console.log('Hit test at (100, 100):', found?.id || 'NO HIT');
};

/**
 * EXPORT: Exponer globalmente para debugging (solo en desarrollo)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.DragSelectionManager = DragSelectionManager;
}
