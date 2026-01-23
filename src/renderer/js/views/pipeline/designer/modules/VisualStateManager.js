import { ThemeManager } from '../../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';

export const VisualStateManager = {
    /**
     * Estados predefinidos para consistencia
     */
    STATES: {
        NORMAL: 'normal',
        HOVERED: 'hovered',
        SELECTED: 'selected',
        DRAGGING: 'dragging',
        CONNECTING: 'connecting',
        RESIZING: 'resizing'
    },

    /**
     * Calcula estado visual completo para un nodo
     * @param {Object} node - Nodo a evaluar
     * @param {Object} interactionState - Estado de interacción global
     * @returns {Object} {opacity, scale, glowIntensity, borderWidth, zIndex, state}
     */
    getVisualState(node, interactionState = {}) {
        const {
            hoveredNodeId: hoveredId,
            selectedNodeId: selectedId,
            draggingNodeId: draggingId,
            activeMode,
            resizingNodeId: resizingId
        } = interactionState;

        const isDrawing = activeMode === 'DRAW';

        const nodeId = node.id;
        let state = this.STATES.NORMAL;
        let opacity = DESIGNER_CONSTANTS.VISUAL.OPACITY.DEFAULT;
        let scale = 1.0;
        let glowIntensity = 0.0;
        let borderWidth = 1.0;
        let zIndex = 0;

        const glow = ThemeManager.effects.glow;

        const layers = ThemeManager.layers;

        // Determinar estado primario
        if (resizingId === nodeId) {
            state = this.STATES.RESIZING;
            glowIntensity = glow.high;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.RESIZING;
            zIndex = layers.resizing;
        } else if (draggingId === nodeId) {
            state = this.STATES.DRAGGING;
            glowIntensity = glow.medium;
            opacity = DESIGNER_CONSTANTS.VISUAL.OPACITY.DRAGGING;
            zIndex = layers.dragging;
        } else if (isDrawing && selectedId === nodeId) { // The node starting the connection
            state = this.STATES.CONNECTING;
            glowIntensity = glow.high;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.CONNECTING;
            zIndex = layers.connecting;
        } else if (selectedId === nodeId) {
            state = this.STATES.SELECTED;
            glowIntensity = glow.medium;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.SELECTED;
            zIndex = layers.select;
        } else if (hoveredId === nodeId) {
            state = this.STATES.HOVERED;
            glowIntensity = glow.low;
            borderWidth = DESIGNER_CONSTANTS.VISUAL.BORDER.HOVERED;
            zIndex = layers.hover;
        }

        // Aplicar efectos de contexto (dimming cuando otros elementos están activos)
        if (draggingId && draggingId !== nodeId) {
            // Durante drag, otros nodos se atenúan
            opacity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_DRAG_GLOBAL;
        }

        if (isDrawing && selectedId !== nodeId) {
            // Durante conexión, otros nodos se atenúan ligeramente
            opacity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_CONN_GLOBAL;
        }

        // Ajustes específicos por tipo de nodo
        if (node.isSatellite) {
            // Satellites son más sutiles
            glowIntensity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.SATELLITE_GLOW;
            scale *= 0.95;
        }

        if (node.isStickyNote) {
            // Sticky notes tienen glow más suave
            glowIntensity *= DESIGNER_CONSTANTS.VISUAL.OPACITY.STICKY_GLOW;
        }

        return {
            opacity: Math.max(0.1, opacity), // Mínimo para visibilidad
            scale,
            glowIntensity: Math.max(0, glowIntensity),
            borderWidth,
            zIndex,
            state
        };
    },

    /**
     * Determina si debe aplicarse efecto "dimmed" (ej: durante drag over container)
     * @param {Object} node - Nodo a evaluar
     * @param {Object} interactionState - Estado de interacción
     * @returns {number} Opacidad 0.0-1.0
     */
    getDimmedOpacity(node, interactionState = {}) {
        const { draggingNodeId: draggingId, activeMode } = interactionState;
        const isDrawing = activeMode === 'DRAW';
        const selectedId = interactionState.selectedNodeId;

        if (!draggingId && !activeConnectionId) return DESIGNER_CONSTANTS.VISUAL.OPACITY.DEFAULT;

        // Si este nodo está siendo interactuado, mantener opacidad total
        if (draggingId === node.id || activeConnectionId === node.id) {
            return 1.0;
        }

        // Durante drag, reducir opacidad de otros nodos
        if (draggingId) {
            return node.isRepoContainer ? DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_DRAG_CONTAINER : DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_DRAG_NODE;
        }

        // Durante conexión, reducción ligera
        if (isDrawing) {
            return DESIGNER_CONSTANTS.VISUAL.OPACITY.DIMMED_CONN_GLOBAL;
        }

        return 1.0;
    },

    /**
     * Calcula prioridad de renderizado (z-index efectivo)
     * @param {Object} node - Nodo a evaluar
     * @param {Object} interactionState - Estado de interacción
     * @returns {number} Z-index
     */
    getRenderPriority(node, interactionState = {}) {
        const state = this.getVisualState(node, interactionState);
        return state.zIndex;
    },

    /**
     * Determina si un nodo debe tener highlighting especial
     * @param {Object} node - Nodo a evaluar
     * @param {Object} interactionState - Estado de interacción
     * @returns {boolean}
     */
    shouldHighlight(node, interactionState = {}) {
        const { hoveredNodeId, selectedNodeId, activeMode } = interactionState;
        return [hoveredNodeId, selectedNodeId].includes(node.id) || (activeMode === 'DRAW' && selectedNodeId === node.id);
    },

    /**
     * Calcula color de borde dinámico basado en estado
     * @param {Object} node - Nodo
     * @param {Object} interactionState - Estado
     * @param {string} baseColor - Color base del nodo
     * @returns {string} Color de borde
     */
    getBorderColor(node, interactionState = {}, baseColor = null) {
        const state = this.getVisualState(node, interactionState);

        if (state.glowIntensity > 1.0) {
            return ThemeManager.colors.primary;
        }

        if (state.state === this.STATES.HOVERED) {
            return ThemeManager.colors.hoverBorder;
        }

        return baseColor || ThemeManager.colors.border;
    },

    /**
     * Obtiene configuración de animación para transiciones suaves
     * @param {string} state - Estado actual
     * @param {string} previousState - Estado anterior
     * @returns {Object} {duration, easing}
     */
    getTransitionConfig(state, previousState) {
        // Transiciones más rápidas para estados interactivos
        if ([this.STATES.HOVERED, this.STATES.CONNECTING].includes(state)) {
            return { duration: DESIGNER_CONSTANTS.VISUAL.TRANSITION.INTERACTIVE, easing: 'ease-out' };
        }

        // Transiciones más suaves para cambios de estado importantes
        if ([this.STATES.DRAGGING, this.STATES.RESIZING].includes(state)) {
            return { duration: DESIGNER_CONSTANTS.VISUAL.TRANSITION.MOVEMENT, easing: 'ease-in-out' };
        }

        return { duration: DESIGNER_CONSTANTS.VISUAL.TRANSITION.DEFAULT, easing: 'ease-in-out' };
    }
};
