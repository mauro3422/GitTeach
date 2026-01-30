/**
 * BoundsCalculator.js
 * Responsabilidad: Cálculos puros de dimensiones lógicas y visuales.
 * Único punto de verdad para el tamaño de nodos, notas y contenedores.
 * Sin dependencias circulares (No importa GeometryUtils).
 */

import { ScalingCalculator } from './ScalingCalculator.js';
import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { TextScalingManager } from './TextScalingManager.js';

export const BoundsCalculator = {

    /**
     * Calcula los límites de una Sticky Note basándose en texto y zoom
     */
    getStickyNoteBounds(node, ctx = null, zoomScale = 1.0) {
        const { MIN_W, MIN_H, PADDING } = DESIGNER_CONSTANTS.DIMENSIONS.STICKY_NOTE;
        const w = node.dimensions?.w || MIN_W;
        const h = node.dimensions?.h || MIN_H;
        const bScale = ScalingCalculator.getVisualScale(zoomScale);

        const baseInflatedW = w * bScale;
        const baseInflatedH = h * bScale;

        if (!node.text) {
            return { w, h, renderW: baseInflatedW, renderH: baseInflatedH, centerX: node.x, centerY: node.y };
        }

        // ROBUST PATTERN: Use TextScalingManager (Single Source of Truth)
        const { STICKY_FONT_SIZE, LINE_HEIGHT_OFFSET } = DESIGNER_CONSTANTS.TYPOGRAPHY;
        const worldFontSize = TextScalingManager.getWorldFontSize(STICKY_FONT_SIZE, zoomScale);
        const worldLineHeight = worldFontSize + LINE_HEIGHT_OFFSET;

        // Measurement: Calculate max word width
        const words = node.text.split(/[\s\n]+/);
        let maxWordWidth = 0;
        words.forEach(wd => {
            const width = TextScalingManager.measureTextWidth(ctx, wd, worldFontSize);
            if (width > maxWordWidth) maxWordWidth = width;
        });

        // Calculate wrapped lines
        const effectiveMaxWidth = Math.max(baseInflatedW - PADDING * 2, maxWordWidth);
        const lines = TextScalingManager.calculateWrappedLines(ctx, node.text, effectiveMaxWidth, worldFontSize);
        const linesCount = lines.length;

        const renderW = Math.max(baseInflatedW, maxWordWidth + PADDING * 2 + 10);
        const renderH = Math.max(baseInflatedH, (linesCount * worldLineHeight) + PADDING * 2);

        return { w, h, renderW, renderH, centerX: node.x, centerY: node.y };
    },

    /**
     * Calcula los límites de un contenedor (auto-grow + elástico)
     * QUERY PURA: No modifica el estado del nodo ni avanza la animación.
     */
    getContainerBounds(node, nodes, zoomScale = 1.0, dropTargetId = null, excludeNodeId = null) {
        const containerId = node.id;
        const isScaleUp = node.id === dropTargetId;
        const scaleFactor = isScaleUp ? DESIGNER_CONSTANTS.INTERACTION.DROP_TARGET_SCALE : 1.0;

        // 1. Asegurar estructura de dimensiones (Punto de Verdad)
        this.ensureDimensionObject(node);

        const dims = node.dimensions;
        const vScale = ScalingCalculator.getVisualScale(zoomScale);

        // 2. Calcular Tamaño Lógico actual (Pure Calculation)
        // FIX: Handle case where nodes list is null (e.g. active connection preview)
        const children = (nodes && typeof nodes === 'object')
            ? Object.values(nodes).filter(n => n.parentId === containerId && n.id !== excludeNodeId)
            : [];

        const target = this._calculateTargetSize(node, children, zoomScale);

        // 3. Establecer mínimos de contenido (Cache lógico para hit-testing y resize)
        const titleMinW = this.calculateTitleMinWidth(node.label, zoomScale);
        dims.contentMinW = Math.max(target.targetW / vScale, titleMinW / vScale);
        dims.contentMinH = target.targetH / vScale;

        // 4. Modo MANUAL (Resize del usuario)
        if (dims.isManual) {
            const baseW = Math.max(dims.w, DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_W);
            const baseH = Math.max(dims.h, DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER.MIN_H);

            return {
                w: baseW, h: baseH,
                renderW: baseW * vScale * scaleFactor,
                renderH: baseH * vScale * scaleFactor,
                centerX: node.x, centerY: node.y
            };
        }

        // 5. Modo AUTOMÁTICO (Layout Elástico) - Lee animW/animH existentes
        return {
            w: target.targetW / vScale,
            h: target.targetH / vScale,
            renderW: dims.animW * scaleFactor,
            renderH: dims.animH * scaleFactor,
            centerX: node.x,
            centerY: node.y
        };
    },

    /**
     * Sincroniza el estado de animación y crecimiento de un contenedor.
     * DEBE LLAMARSE EXACTAMENTE UNA VEZ POR FRAME.
     */
    syncContainerAnimation(node, nodes, zoomScale = 1.0, draggingNodeId = null) {
        if (!node.isRepoContainer || node.dimensions?.isManual) return;

        this.ensureDimensionObject(node);
        const dims = node.dimensions;
        const containerId = node.id;

        // Filter valid children for bounds calculation
        const children = Object.values(nodes).filter(n =>
            n.parentId === containerId && n.id !== draggingNodeId
        );

        // 1. Detectar cambios bruscos para disparar "transition padding" (efecto pop)
        const currentCount = children.length;
        if (dims._lastChildCount !== undefined && currentCount > dims._lastChildCount) {
            dims.transitionPadding = DESIGNER_CONSTANTS.LAYOUT.AUTO_GROW_PADDING;
        }
        dims._lastChildCount = currentCount;
        dims.transitionPadding = dims.transitionPadding || 0;

        // 2. Calcular Tamaño Objetivo
        const target = this._calculateTargetSize(node, children, zoomScale);
        dims.targetW = target.targetW + dims.transitionPadding;
        dims.targetH = target.targetH + dims.transitionPadding;

        // 3. Aplicar paso de animación elástica (Modifica animW/animH)
        this._updateElasticStep(node);

        // 4. Amortiguar el padding de transición
        dims.transitionPadding *= DESIGNER_CONSTANTS.ANIMATION.TRANSITION_DAMPING;
        if (dims.transitionPadding < 0.1) dims.transitionPadding = 0;
    },

    /**
     * Asegura que el nodo tenga el objeto de dimensiones inicializado
     */
    ensureDimensionObject(node) {
        if (!node.dimensions) {
            const { CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: CONTAINER.DEFAULT_W,
                h: CONTAINER.DEFAULT_H,
                animW: CONTAINER.DEFAULT_W,
                animH: CONTAINER.DEFAULT_H,
                targetW: CONTAINER.DEFAULT_W,
                targetH: CONTAINER.DEFAULT_H,
                isManual: false,
                transitionPadding: 0,
                _lastChildCount: 0
            };
        }
    },

    /**
     * Calcula el tamaño objetivo basado en hijos (Internal)
     */
    _calculateTargetSize(containerNode, childrenNodes, zoomScale) {
        const layout = DESIGNER_CONSTANTS.LAYOUT;
        const dims = DESIGNER_CONSTANTS.DIMENSIONS.CONTAINER;
        const vScale = ScalingCalculator.getVisualScale(zoomScale);

        if (!childrenNodes || childrenNodes.length === 0) {
            return {
                targetW: dims.MIN_W * vScale,
                targetH: dims.MIN_H * vScale
            };
        }

        let minX = containerNode.x, maxX = containerNode.x;
        let minY = containerNode.y, maxY = containerNode.y;

        childrenNodes.forEach(child => {
            const radius = ScalingCalculator.getNodeRadius(child, zoomScale);
            // Heuristic for labels inside containers if they are nodes
            const labelStr = child.label || "";
            const estimatedPixelWidth = (labelStr.length * layout.TITLE_CHAR_WIDTH) * vScale;
            const effectiveHalfWidth = Math.max(radius, estimatedPixelWidth / 2 + (layout.TITLE_PADDING * vScale));

            minX = Math.min(minX, child.x - effectiveHalfWidth);
            maxX = Math.max(maxX, child.x + effectiveHalfWidth);
            minY = Math.min(minY, child.y - radius);
            maxY = Math.max(maxY, child.y + radius);
        });

        const basePadding = (layout.CONTAINER_PADDING + Math.min(childrenNodes.length * 5, 50)) * vScale;

        // Symmetrical growth
        const maxDistX = Math.max(Math.abs(maxX - containerNode.x), Math.abs(minX - containerNode.x));
        const maxDistY = Math.max(Math.abs(maxY - containerNode.y), Math.abs(minY - containerNode.y));

        const requiredW = (maxDistX * 2) + basePadding;
        const requiredH = (maxDistY * 2) + basePadding + (layout.EXTRA_HEIGHT * vScale);

        return {
            targetW: Math.max(dims.MIN_W * vScale, requiredW),
            targetH: Math.max(dims.MIN_H * vScale, requiredH)
        };
    },

    /**
     * Paso de convergencia elástica
     */
    _updateElasticStep(node) {
        const dims = node.dimensions;
        const damping = DESIGNER_CONSTANTS.ANIMATION.ELASTIC_DAMPING;
        const epsilon = DESIGNER_CONSTANTS.ANIMATION.ELASTIC_EPSILON;

        if (Math.abs(dims.animW - dims.targetW) > epsilon) {
            dims.animW += (dims.targetW - dims.animW) * damping;
        } else {
            dims.animW = dims.targetW;
        }

        if (Math.abs(dims.animH - dims.targetH) > epsilon) {
            dims.animH += (dims.targetH - dims.animH) * damping;
        } else {
            dims.animH = dims.targetH;
        }
    },

    /**
     * ROBUST: Calcula ancho mínimo del título teniendo en cuenta el zoom
     * UNIFIED: Usa TextScalingManager (Single Source of Truth)
     */
    calculateTitleMinWidth(label, zoomScale = 1.0, ctx = null) {
        // ROBUST PATTERN: Delegar a TextScalingManager (único punto de verdad)
        return TextScalingManager.calculateContainerTitleWidth(label, zoomScale, ctx);
    }
};
