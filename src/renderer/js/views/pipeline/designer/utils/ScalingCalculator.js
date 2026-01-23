/**
 * ScalingCalculator.js
 * Responsabilidad: Cálculos de inflación visual puros.
 * Sin dependencias externas para evitar ciclos.
 */

export const ScalingConstants = {
    BODY_INF_POWER: 0.35,
    TEXT_INF_POWER: 0.75, // Ligeramente mayor para compensar antes
    MAX_BODY_INFLATION: 2.5, // Aumentado para contenedores grandes
    MAX_TEXT_INFLATION: 10.0, // Aumentado significativamente para zoom extremo
    MIN_PHYSICAL_TEXT_SIZE: 11.0 // Píxeles físicos mínimos en pantalla
};

export const ScalingCalculator = {
    /**
     * Obtiene la escala visual para cuerpos (nodos, cajas)
     */
    getVisualScale(zoomScale) {
        const comp = Math.pow(1 / zoomScale, ScalingConstants.BODY_INF_POWER);
        return Math.min(ScalingConstants.MAX_BODY_INFLATION, comp);
    },

    /**
     * Obtiene la escala visual para texto
     * Incluye protección de tamaño físico mínimo
     */
    getFontScale(zoomScale, baseFontSize = 18) {
        // 1. Inflación matemática base
        const comp = Math.pow(1 / zoomScale, ScalingConstants.TEXT_INF_POWER);

        // 2. Cálculo de escala necesaria para mantener el mínimo físico
        // (fontSize * scale * zoom) = MIN_PHYSICAL_TEXT_SIZE
        const minScaleForLegibility = (ScalingConstants.MIN_PHYSICAL_TEXT_SIZE / baseFontSize) / zoomScale;

        // Elegimos el mayor de ambos para garantizar visibilidad
        const finalScale = Math.max(comp, minScaleForLegibility);

        return Math.min(ScalingConstants.MAX_TEXT_INFLATION, finalScale);
    },

    /**
     * Calcula la distancia entre dos puntos
     */
    getDistance(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    },

    /**
     * Calcula el radio dinámico de un nodo basado en zoom
     */
    getNodeRadius(node, zoomScale = 1) {
        const baseRadius = node.isSatellite ? 25 : 35;
        return baseRadius * this.getVisualScale(zoomScale);
    }
};
