/**
 * VisualStateManager.js
 * Gestión centralizada de estados visuales
 * Calcula opacidades, escalas y prioridades de renderizado basados en interacción
 */

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
            hoveredId,
            selectedId,
            draggingId,
            activeConnectionId,
            resizingId
        } = interactionState;

        const nodeId = node.id;
        let state = this.STATES.NORMAL;
        let opacity = 1.0;
        let scale = 1.0;
        let glowIntensity = 0.0;
        let borderWidth = 1.0;
        let zIndex = 0;

        // Determinar estado primario
        if (resizingId === nodeId) {
            state = this.STATES.RESIZING;
            glowIntensity = 1.8;
            borderWidth = 3.0;
            zIndex = 50;
        } else if (draggingId === nodeId) {
            state = this.STATES.DRAGGING;
            glowIntensity = 1.2;
            opacity = 0.8;
            zIndex = 40;
        } else if (activeConnectionId === nodeId) {
            state = this.STATES.CONNECTING;
            glowIntensity = 1.5;
            borderWidth = 2.5;
            zIndex = 30;
        } else if (selectedId === nodeId) {
            state = this.STATES.SELECTED;
            glowIntensity = 1.0;
            borderWidth = 2.0;
            zIndex = 20;
        } else if (hoveredId === nodeId) {
            state = this.STATES.HOVERED;
            glowIntensity = 0.8;
            borderWidth = 1.5;
            zIndex = 10;
        }

        // Aplicar efectos de contexto (dimming cuando otros elementos están activos)
        if (draggingId && draggingId !== nodeId) {
            // Durante drag, otros nodos se atenúan
            opacity *= 0.6;
        }

        if (activeConnectionId && activeConnectionId !== nodeId) {
            // Durante conexión, otros nodos se atenúan ligeramente
            opacity *= 0.8;
        }

        // Ajustes específicos por tipo de nodo
        if (node.isSatellite) {
            // Satellites son más sutiles
            glowIntensity *= 0.7;
            scale *= 0.95;
        }

        if (node.isStickyNote) {
            // Sticky notes tienen glow más suave
            glowIntensity *= 0.8;
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
        const { draggingId, activeConnectionId } = interactionState;

        if (!draggingId && !activeConnectionId) return 1.0;

        // Si este nodo está siendo interactuado, mantener opacidad total
        if (draggingId === node.id || activeConnectionId === node.id) {
            return 1.0;
        }

        // Durante drag, reducir opacidad de otros nodos
        if (draggingId) {
            return node.isRepoContainer ? 0.7 : 0.5; // Containers menos afectados
        }

        // Durante conexión, reducción ligera
        if (activeConnectionId) {
            return 0.8;
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
        const { hoveredId, selectedId, activeConnectionId } = interactionState;
        return [hoveredId, selectedId, activeConnectionId].includes(node.id);
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
            return '#2f81f7'; // Color de acento para estados activos - TODO: usar ThemeManager.colors.primary
        }

        if (state.state === this.STATES.HOVERED) {
            return '#8b949e'; // Color ligeramente más claro para hover - TODO: usar ThemeManager.colors.hoverBorder
        }

        return baseColor || '#30363d'; // TODO: usar ThemeManager.colors.border
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
            return { duration: 150, easing: 'ease-out' };
        }

        // Transiciones más suaves para cambios de estado importantes
        if ([this.STATES.DRAGGING, this.STATES.RESIZING].includes(state)) {
            return { duration: 100, easing: 'ease-in-out' };
        }

        return { duration: 200, easing: 'ease-in-out' };
    }
};
