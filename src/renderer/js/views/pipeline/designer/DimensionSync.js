/**
 * DimensionSync.js
 * Responsabilidad: Centralizar la obtención de dimensiones lógicas y visuales
 * Punto de entrada único para asegurar que el renderizado y los handles usen los mismos datos.
 */

import { GeometryUtils } from './GeometryUtils.js';
import { SyncGuard } from './utils/SyncGuard.js';
import { DESIGNER_CONSTANTS } from './DesignerConstants.js';

export const DimensionSync = {
    /**
     * Obtiene las dimensiones "sincronizadas" para un nodo.
     * Si el entorno es seguro, devuelve dimensiones visuales infladas.
     * Si no, recurre a dimensiones lógicas puras.
     * @returns {Object} { w, h, centerX, centerY, isVisual }
     */
    getSyncDimensions(node, nodes = {}, zoom = 1.0) {
        const isSafe = SyncGuard.isVisualSafe();

        // 1. Intentar obtener dimensiones visuales si es seguro
        if (isSafe) {
            try {
                const bounds = node.isRepoContainer
                    ? GeometryUtils.getContainerBounds(node, nodes, zoom)
                    : node.isStickyNote
                        ? GeometryUtils.getStickyNoteBounds(node, null, zoom)
                        : null;

                if (bounds && SyncGuard.isValidBounds(bounds)) {
                    return {
                        w: bounds.renderW || bounds.w,
                        h: bounds.renderH || bounds.h,
                        centerX: bounds.centerX !== undefined ? bounds.centerX : node.x,
                        centerY: bounds.centerY !== undefined ? bounds.centerY : node.y,
                        isVisual: true
                    };
                }
            } catch (e) {
                console.warn(`[DimensionSync] Fallback a lógica para nodo ${node.id}:`, e);
            }
        }

        // 2. Fallback a dimensiones lógicas puras
        const vScale = GeometryUtils.getVisualScale(zoom);
        const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
        const logicalW = node.dimensions?.w || (node.isStickyNote ? STICKY_NOTE.MIN_W : CONTAINER.DEFAULT_W);
        const logicalH = node.dimensions?.h || (node.isStickyNote ? STICKY_NOTE.MIN_H : CONTAINER.DEFAULT_H);

        return {
            w: logicalW * vScale,
            h: logicalH * vScale,
            centerX: node.x,
            centerY: node.y,
            isVisual: false
        };
    },

    /**
     * Obtiene las esquinas calculadas para handles basadas en el sistema sincronizado
     */
    getHandleCorners(node, nodes, zoom) {
        const dims = this.getSyncDimensions(node, nodes, zoom);
        return GeometryUtils.getRectCorners(dims.centerX, dims.centerY, dims.w, dims.h);
    },

    /**
     * Legacy support: Mapped to getSyncDimensions for backward compatibility
     */
    getVisualDimensions(node, zoom, nodes = {}) {
        const sync = this.getSyncDimensions(node, nodes, zoom);
        const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
        return {
            logicalW: node.dimensions?.w || (node.isStickyNote ? STICKY_NOTE.MIN_W : CONTAINER.DEFAULT_W),
            logicalH: node.dimensions?.h || (node.isStickyNote ? STICKY_NOTE.MIN_H : CONTAINER.DEFAULT_H),
            visualW: sync.w,
            visualH: sync.h,
            centerX: sync.centerX,
            centerY: sync.centerY
        };
    }
};