/**
 * LabelRenderer.js
 * Specialized module for rendering labels, sublabels, and orbital satellites.
 * Focuses on readability, multiline support, and collision prevention.
 */
export const LabelRenderer = {
    /**
     * Draw main label and sublabel for a node
     */
    drawNodeLabel(ctx, node, x, y, isHovered, zoomScale = 1, dynamicRadius = null) {
        if (!node.label) return;

        const isSatellite = node.isSatellite === true;

        // STANDARD Screen-Space sizes
        const baseFontSize = isSatellite ? 14 : (isHovered ? 26 : 22);
        const baseSubFontSize = isSatellite ? 11 : 16;

        const fontSize = baseFontSize;
        const subFontSize = baseSubFontSize;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // RELATIVE offset based on scaled node radius
        const radius = (dynamicRadius || (isSatellite ? 25 : 35)) * zoomScale;
        const padding = 15; // screen space pixels
        const yOffset = node.labelPosition === 'top' ? -(radius + padding) : (radius + padding);
        const labelY = y + yOffset;

        // Configuration for high-visibility text
        const drawText = (txt, px, py, font, color, alpha = 1) => {
            ctx.font = font;
            // High contrast outline
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(txt, px, py);

            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fillText(txt, px, py);
            ctx.globalAlpha = 1;
        };

        // Split label
        const lines = node.label.length > 12 ? node.label.split(' ') : [node.label];
        const mainFont = `bold ${fontSize}px var(--font-mono), monospace`;
        const mainColor = isHovered ? '#ffffff' : (node.isSatellite ? (node.color || '#8b949e') : '#e6edf3');

        lines.forEach((line, idx) => {
            const lineOffset = idx * (fontSize + 6);
            drawText(line, x, labelY + lineOffset, mainFont, mainColor);
        });

        // Sublabel
        if (node.sublabel) {
            const sublabelY = labelY + (lines.length * (fontSize + 6)) + 10;
            const subFont = `${subFontSize}px var(--font-mono), monospace`;
            const subColor = node.isSatellite ? '#8b949e' : '#8b949e';
            drawText(node.sublabel, x, sublabelY, subFont, subColor, 0.9);
        }

        ctx.restore();
    },

    /**
     * Draw an orbital satellite relative to its parent
     */
    drawSatellite(ctx, satellite, parentX, parentY, isHovered) {
        // Orbital Math
        // Assuming a standard coordinate system where 1 unit = ~100px or similar
        // Let's use a fixed-ish radius that scales with the global transform
        const radius = (satellite.orbitRadius || 0.18) * 800;
        const angle = (satellite.orbitAngle || 0) * (Math.PI / 180);

        const x = parentX + radius * Math.cos(angle);
        const y = parentY + radius * Math.sin(angle);

        // Draw connection line (faint)
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(139, 148, 158, 0.2)';
        ctx.beginPath();
        ctx.moveTo(parentX, parentY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();

        // Draw Satellite Node Body
        const nodeRadius = isHovered ? 18 : 15;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
        ctx.strokeStyle = satellite.color || '#8b949e';
        ctx.lineWidth = 1.5;
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Icon
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(satellite.icon, x, y);

        // Label (Compact & Offset)
        ctx.font = 'bold 8px var(--font-mono), monospace';
        ctx.fillStyle = '#8b949e';
        const labelOffset = y > parentY ? 22 : -22;
        ctx.fillText(satellite.label, x, y + labelOffset);

        return { x, y }; // Return computed positions for interaction
    },

    /**
     * Draw standardized sector titles
     */
    drawSectorTitle(ctx, title, subTitle, centerX, yStart, yEnd, color) {
        ctx.save();
        ctx.textAlign = 'center';

        // Main Title
        ctx.font = 'bold 10px var(--font-mono), monospace';
        ctx.fillStyle = color;
        ctx.fillText(title, centerX, yStart + 16);

        // Subtitle/Port
        if (subTitle) {
            ctx.font = '7px var(--font-mono), monospace';
            ctx.fillStyle = `${color}cc`; // Slightly transparent
            ctx.fillText(subTitle, centerX, yEnd - 10);
        }
        ctx.restore();
    },

    /**
     * Draw small technical label with background (Optional)
     */
    drawStandardText(ctx, text, x, y, options = {}) {
        const {
            fontSize = 14,
            color = '#8b949e',
            align = 'center',
            bold = false,
            baseline = 'middle'
        } = options;

        ctx.save();
        ctx.font = `${bold ? 'bold ' : ''}${fontSize}px var(--font-mono), monospace`;

        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        // Contrast stroke (drawn first so fill is on top)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    },

    /**
     * Draw node icon with consistent offset
     */
    drawNodeIcon(ctx, icon, x, y, isSatellite, zoomScale = 1, dynamicRadius = null) {
        ctx.save();

        // Standard icon size
        const baseSize = isSatellite ? 18 : 28;
        const radius = (dynamicRadius || (isSatellite ? 25 : 35)) * zoomScale;

        // RE-CALCULATION: Keep icon relative to node but with readability limits
        const finalSize = Math.min(baseSize, Math.max(12, radius * 1.5));

        ctx.font = `${finalSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;

        ctx.fillText(icon, x, y);
        ctx.restore();
    },

    /**
     * Draw a count badge or indicator
     */
    drawBadge(ctx, text, x, y, color) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#0d1117';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
    }
};
