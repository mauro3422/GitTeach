/**
 * GeometryUtils.js
 * Responsabilidad: Hit-testing y fachada de geometría.
 * La lógica de layout elástico reside en LayoutUtils.
 */

import { ScalingCalculator } from './utils/ScalingCalculator.js';
// We do NOT import LayoutUtils here to avoid circularity.
// Methods that need LayoutUtils will assume it's available or be moved to LayoutUtils.

export const GeometryUtils = {
    _dummyCtx: null,

    getVisualScale(zoomScale) { return ScalingCalculator.getVisualScale(zoomScale); },
    getFontScale(zoomScale, baseFontSize = 18) { return ScalingCalculator.getFontScale(zoomScale, baseFontSize); },
    getDistance(p1, p2) { return ScalingCalculator.getDistance(p1, p2); },
    getNodeRadius(node, zoomScale = 1) { return ScalingCalculator.getNodeRadius(node, zoomScale); },

    /**
     * Calcula la posición de un nodo en órbita
     * Requerido por DesignerHydrator para satélites y por ConnectionRenderer
     */
    calculateOrbitPosition(center, radius, angleDeg) {
        if (!center) return { x: 0, y: 0 };
        const angleRad = angleDeg * (Math.PI / 180);
        return {
            x: (center.x || 0) + radius * Math.cos(angleRad),
            y: (center.y || 0) + radius * Math.sin(angleRad)
        };
    },

    /**
     * Calcula el ángulo entre dos puntos en radianes
     */
    calculateAngle(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    },

    /**
     * Verifica si un punto está dentro de un rectángulo
     * @param {Object} point - {x, y}
     * @param {Object} rect - {centerX, centerY, w, h}
     */
    isPointInRectangle(point, rect) {
        if (!point || !rect) return false;
        const centerX = rect.centerX !== undefined ? rect.centerX : rect.x;
        const centerY = rect.centerY !== undefined ? rect.centerY : rect.y;
        const w = rect.w;
        const h = rect.h;
        return point.x >= centerX - w / 2 && point.x <= centerX + w / 2 &&
            point.y >= centerY - h / 2 && point.y <= centerY + h / 2;
    },

    /**
     * Encuentra el punto en el borde del nodo más cercano a un objetivo
     * Soporta Círculos (nodos) y Cajas (contenedores/sticky)
     */
    getEdgePoint(node, targetX, targetY, nodes, camera) {
        const zoom = camera?.zoomScale || 1.0;

        if (node.isRepoContainer || node.isStickyNote) {
            const bounds = node.isRepoContainer
                ? this.getContainerBounds(node, nodes, zoom)
                : this.getStickyNoteBounds(node, null, zoom);

            const w = bounds.renderW || bounds.w || 180;
            const h = bounds.renderH || bounds.h || 100;
            const cx = bounds.centerX || node.x;
            const cy = bounds.centerY || node.y;

            const dx = targetX - cx;
            const dy = targetY - cy;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (dx === 0 && dy === 0) return { x: cx, y: cy };

            // Intersección AABB-Ray
            const scale = Math.min(w / (2 * absDx || 1), h / (2 * absDy || 1));
            return {
                x: cx + dx * scale,
                y: cy + dy * scale
            };
        } else {
            // Intersección Círculo
            const radius = this.getNodeRadius(node, zoom);
            const dx = targetX - node.x;
            const dy = targetY - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist === 0) return { x: node.x, y: node.y };

            return {
                x: node.x + (dx / dist) * radius,
                y: node.y + (dy / dist) * radius
            };
        }
    },

    getRectCorners(centerX, centerY, w, h) {
        return {
            'nw': { x: centerX - w / 2, y: centerY - h / 2 },
            'ne': { x: centerX + w / 2, y: centerY - h / 2 },
            'sw': { x: centerX - w / 2, y: centerY + h / 2 },
            'se': { x: centerX + w / 2, y: centerY + h / 2 }
        };
    },

    calculateResizeDelta(corner, startW, startH, dx, dy) {
        let w = startW, h = startH;
        switch (corner) {
            case 'se': w += dx * 2; h += dy * 2; break;
            case 'sw': w -= dx * 2; h += dy * 2; break;
            case 'ne': w += dx * 2; h -= dy * 2; break;
            case 'nw': w -= dx * 2; h -= dy * 2; break;
        }
        return { w, h };
    },

    /**
     * Delegado para obtener límites de contenedor.
     * Si necesitas lógica de auto-layout elástico, usa LayoutUtils directamente.
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null) {
        // En un sistema real, LayoutUtils se inyecta o se accede globalmente para evitar el ciclo.
        // Aquí usamos la referencia global si existe (en el navegador) o fallamos amablemente.
        const layout = (typeof window !== 'undefined' && window.LayoutUtils) || (typeof global !== 'undefined' && global.LayoutUtils);

        if (layout) {
            return layout.getContainerBounds(node, nodes, zoomScale, dropTargetId);
        }

        // Fallback básico si LayoutUtils no está cargado aún (útil durante bootstrap inicial)
        const w = node.dimensions?.w || 180;
        const h = node.dimensions?.h || 100;
        const bScale = this.getVisualScale(zoomScale);
        return {
            w, h,
            renderW: (node.dimensions?.animW || w) * bScale,
            renderH: (node.dimensions?.animH || h) * bScale,
            centerX: node.x,
            centerY: node.y
        };
    },

    getStickyNoteBounds(node, ctx, zoomScale = 1.0) {
        const w = node.dimensions?.w || 180;
        const h = node.dimensions?.h || 100;
        const padding = 15;
        const bScale = this.getVisualScale(zoomScale);
        const baseInflatedW = w * bScale;
        const baseInflatedH = h * bScale;

        if (!node.text) {
            return { w, h, renderW: baseInflatedW, renderH: baseInflatedH, centerX: node.x, centerY: node.y };
        }

        const fScale = this.getFontScale(zoomScale);
        const baseFontSize = 18;
        const worldFontSize = baseFontSize * fScale;
        const worldLineHeight = worldFontSize + 6;

        if (!this._dummyCtx && typeof document !== 'undefined') {
            try { this._dummyCtx = document.createElement('canvas').getContext('2d'); } catch (e) { }
        }
        const activeCtx = ctx || this._dummyCtx;

        if (!activeCtx) {
            return { w, h, renderW: Math.max(baseInflatedW, w + padding * 2), renderH: Math.max(baseInflatedH, h + padding * 2), centerX: node.x, centerY: node.y };
        }

        activeCtx.save();
        activeCtx.font = `${worldFontSize}px ${typeof window !== 'undefined' && window.ThemeManager ? window.ThemeManager.colors.fontMono : 'monospace'}`;
        const words = node.text.split(/[\s\n]+/);
        let maxWordWidth = 0;
        words.forEach(wd => {
            const width = activeCtx.measureText(wd).width;
            if (width > maxWordWidth) maxWordWidth = width;
        });

        const effectiveMaxWidth = Math.max(baseInflatedW - padding * 2, maxWordWidth);
        const wordsForLines = node.text.split(' ');
        let currentLine = '', linesCount = 0;
        wordsForLines.forEach(word => {
            const testLine = currentLine + word + ' ';
            if (activeCtx.measureText(testLine).width > effectiveMaxWidth && currentLine.length > 0) {
                linesCount++;
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine.trim()) linesCount++;
        activeCtx.restore();

        return {
            w, h,
            renderW: Math.max(baseInflatedW, maxWordWidth + padding * 2 + 10),
            renderH: Math.max(baseInflatedH, (linesCount * worldLineHeight) + padding * 2),
            centerX: node.x,
            centerY: node.y
        };
    },

    isPointInNode(point, node, zoomScale = 1) {
        const radius = this.getNodeRadius(node, zoomScale);
        const dist = this.getDistance(point, node);
        return dist < radius;
    },

    calculateArrowPoints(endPoint, angle, headlen = 10, headAngle = Math.PI / 6) {
        return [
            { x: endPoint.x - headlen * Math.cos(angle - headAngle), y: endPoint.y - headlen * Math.sin(angle - headAngle) },
            { x: endPoint.x - headlen * Math.cos(angle + headAngle), y: endPoint.y - headlen * Math.sin(angle + headAngle) }
        ];
    },

    isPointInContainer(point, container, nodes, zoomScale = 1) {
        if (!container.isRepoContainer && !container.isStickyNote) return false;
        const bounds = container.isRepoContainer ? this.getContainerBounds(container, nodes, zoomScale) : this.getStickyNoteBounds(container, null, zoomScale);
        const w = (bounds.renderW || bounds.w) + 10;
        const h = (bounds.renderH || bounds.h) + 10;
        const centerX = bounds.centerX || container.x;
        const centerY = bounds.centerY || container.y;
        return point.x >= centerX - w / 2 && point.x <= centerX + w / 2 && point.y >= centerY - h / 2 && point.y <= centerY + h / 2;
    },

    isPointNearLine(point, p1, p2, threshold = 10) {
        const dist = this.getPointToSegmentDistance(point, p1, p2);
        return dist < threshold;
    },

    getPointToSegmentDistance(p, v, w) {
        const l2 = this.getDistance(v, w) ** 2;
        if (l2 === 0) return this.getDistance(p, v);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return this.getDistance(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
    }
};
