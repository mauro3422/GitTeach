/**
 * NodeVisualManager.js
 *
 * ROBUST PATTERN: Single Source of Truth for Node Visuals
 *
 * Responsabilidad:
 * - Centraliza TODA la lógica visual de nodos
 * - Calcula opacity, glow, colors para cada estado
 * - Proporciona información visual a renderers
 * - Auto-validación de estados
 *
 * Principios:
 * 1. ÚNICO lugar para estados visuales
 * 2. Aislado de DesignerStore (acceso vía parámetros)
 * 3. Funciones puras (no mutan estado)
 * 4. Helpers para queries de estado
 */

import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const NodeVisualManager = {
    /**
     * CORE: Calcula estado visual completo para un nodo
     * Single Source of Truth para determinar cómo renderizar
     *
     * @param {Object} node - Nodo a evaluar
     * @param {Object} interactionState - Estado de interacción global
     * @returns {Object} {opacity, scale, glowIntensity, borderWidth, zIndex, state, glowColor}
     */
    getNodeVisualState(node, interactionState = {}) {
        if (!node) return this.getDefaultVisualState();

        const {
            hoveredNodeId,
            selectedNodeId,
            draggingNodeId,
            activeMode,
            resizingNodeId
        } = interactionState;

        const nodeId = node.id;
        const isDrawing = activeMode === 'DRAW';

        // Inicializar valores por defecto
        let state = 'normal';
        let opacity = DESIGNER_CONSTANTS.VISUAL.OPACITY.DEFAULT;
        let scale = 1.0;
        let glowIntensity = 0.0;
        let borderWidth = 1.0;
        let zIndex = 0;

        const glow = ThemeManager.effects.glow;
        const layers = ThemeManager.layers;

        // ========== ESTADO PRIMARIO ==========
        if (resizingNodeId === nodeId) {
            state = 'RESIZING';
            glowIntensity = glow.high;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.RESIZING;
            zIndex = layers.resizing;
        } else if (draggingNodeId === nodeId) {
            state = 'DRAGGING';
            glowIntensity = glow.medium;
            opacity = DESIGNER_CONSTANTS.VISUAL.OPACITY.DRAGGING;
            zIndex = layers.dragging;
        } else if (isDrawing && selectedNodeId === nodeId) {
            state = 'CONNECTING';
            glowIntensity = glow.high;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.CONNECTING;
            zIndex = layers.connecting;
        } else if (selectedNodeId === nodeId) {
            state = 'SELECTED';
            glowIntensity = glow.medium;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.SELECTED;
            zIndex = layers.select;
        } else if (hoveredNodeId === nodeId) {
            state = 'HOVERED';
            glowIntensity = glow.low;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.HOVERED;
            zIndex = layers.hover;
        }

        // ========== EFECTOS DE CONTEXTO ==========
        // ROBUST FIX: No atenuar nodos satélite (siempre visibles)
        if (!node.isSatellite) {
            if (draggingNodeId && draggingNodeId !== nodeId) {
                opacity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_DRAG_GLOBAL;
            }

            if (isDrawing && selectedNodeId !== nodeId) {
                opacity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_CONN_GLOBAL;
            }
        }

        // ========== AJUSTES POR TIPO ==========
        if (node.isSatellite) {
            glowIntensity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.SATELLITE_GLOW;
            scale *= 0.95;
        }

        if (node.isStickyNote) {
            glowIntensity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.STICKY_GLOW;
        }

        // Garantizar opacidad mínima
        opacity = Math.max(0.1, opacity);
        glowIntensity = Math.max(0, glowIntensity);

        // Color del glow (nodo + propiedades)
        const glowColor = node.color || ThemeManager.colors.accent;

        // Multiplicador de brillo si está seleccionado
        const glowMultiplier = state === 'SELECTED' ? 2.5 : 1.0;

        return {
            opacity,
            scale,
            glowIntensity,
            glowMultiplier,
            borderWidth,
            zIndex,
            state,
            glowColor,
            isSelected: state === 'SELECTED',
            isHovered: state === 'HOVERED',
            isDragging: state === 'DRAGGING',
            isResizing: state === 'RESIZING'
        };
    },

    /**
     * HELPER: Estado visual por defecto
     */
    getDefaultVisualState() {
        return {
            opacity: DESIGNER_CONSTANTS.VISUAL.OPACITY.DEFAULT,
            scale: 1.0,
            glowIntensity: 0.0,
            glowMultiplier: 1.0,
            borderWidth: 1.0,
            zIndex: 0,
            state: 'normal',
            glowColor: ThemeManager.colors.accent,
            isSelected: false,
            isHovered: false,
            isDragging: false,
            isResizing: false
        };
    },

    /**
     * HELPER: Calcula valores de sombra/glow para canvas
     */
    getGlowConfig(visual) {
        if (!visual || visual.glowIntensity <= 0) {
            return {
                shadowBlur: 0,
                shadowColor: 'transparent'
            };
        }

        const { GLOW } = DESIGNER_CONSTANTS.VISUAL;
        return {
            shadowBlur: GLOW.BASE_BLUR * visual.glowIntensity * visual.glowMultiplier,
            shadowColor: visual.glowColor
        };
    },

    /**
     * HELPER: Verifica si nodo es visible (opacity > threshold)
     */
    isVisible(node, interactionState) {
        const visual = this.getNodeVisualState(node, interactionState);
        return visual.opacity > 0.05;
    },

    /**
     * HELPER: Compara estados visuales (para detectar cambios)
     */
    hasVisualChanged(prevVisual, currentVisual) {
        if (!prevVisual || !currentVisual) return true;

        return (
            prevVisual.opacity !== currentVisual.opacity ||
            prevVisual.glowIntensity !== currentVisual.glowIntensity ||
            prevVisual.state !== currentVisual.state ||
            prevVisual.glowColor !== currentVisual.glowColor
        );
    },

    /**
     * HELPER: Obtiene label color según estado
     */
    getLabelColor(node, visual) {
        if (!visual) return ThemeManager.colors.text;

        if (visual.isSelected || visual.isHovered) {
            return ThemeManager.colors.text;
        }

        return visual.glowColor;
    },

    /**
     * VALIDATION: Valida que propiedades visuales sean correctas
     */
    validateVisualState(visual) {
        if (!visual) return false;

        // Validar rangos
        if (visual.opacity < 0 || visual.opacity > 1) {
            console.warn('[NodeVisualManager] Invalid opacity:', visual.opacity);
            return false;
        }

        if (visual.glowIntensity < 0) {
            console.warn('[NodeVisualManager] Invalid glowIntensity:', visual.glowIntensity);
            return false;
        }

        if (!visual.glowColor) {
            console.warn('[NodeVisualManager] Missing glowColor');
            return false;
        }

        return true;
    },

    /**
     * DEBUG: Helper para inspeccionar estado visual
     */
    debugVisualState(node, interactionState) {
        const visual = this.getNodeVisualState(node, interactionState);
        console.log(`[NodeVisualManager] ${node.id}:`, {
            state: visual.state,
            opacity: visual.opacity.toFixed(2),
            glowIntensity: visual.glowIntensity.toFixed(2),
            glowColor: visual.glowColor,
            zIndex: visual.zIndex
        });
        return visual;
    }
};

/**
 * EXPORT: Exponer globalmente para debugging (solo en desarrollo)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.NodeVisualManager = NodeVisualManager;
}
