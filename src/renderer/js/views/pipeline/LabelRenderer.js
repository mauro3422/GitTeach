/**
 * LabelRenderer.js
 * Specialized module for rendering labels, sublabels, and orbital satellites.
 * Focuses on readability, multiline support, and collision prevention.
 */
export const LabelRenderer = {
    /**
     * Draw main label and sublabel for a node
     */
    drawNodeLabel(ctx, node, x, y, isHovered) {
        if (!node.label) return;

        const isSatellite = node.isSatellite === true;
        const fontSize = isSatellite ? 8 : (isHovered ? 11 : 10);
        const subFontSize = isSatellite ? 6 : 8;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Split label into lines if it has a space and is long
        const lines = node.label.length > 12 ? node.label.split(' ') : [node.label];
        const labelY = y + (node.labelPosition === 'top' ? -58 : 55);

        // Draw Main Label
        ctx.font = `bold ${fontSize}px var(--font-mono), monospace`;
        ctx.fillStyle = isHovered ? '#ffffff' : (node.isSatellite ? (node.color || '#8b949e') : '#e6edf3');

        lines.forEach((line, idx) => {
            const lineOffset = idx * (fontSize + 3);
            ctx.fillText(line, x, labelY + lineOffset);
        });

        // Draw Sublabel
        if (node.sublabel) {
            const sublabelY = labelY + (lines.length * (fontSize + 3)) + 4;
            ctx.font = `${subFontSize}px var(--font-mono), monospace`;
            ctx.fillStyle = node.isSatellite ? 'rgba(139, 148, 158, 0.6)' : '#8b949e';
            ctx.fillText(node.sublabel, x, sublabelY);
        }

        ctx.restore();
    },

    /**
     * Draw an orbital satellite relative to its parent
     */
    drawSatellite(ctx, satellite, parentX, parentY, width, height, panOffset, isHovered) {
        // Orbital Math
        const radius = (satellite.orbitRadius || 0.10) * Math.min(width, height);
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
            fontSize = 8,
            color = '#8b949e',
            align = 'center',
            bold = false,
            baseline = 'middle'
        } = options;

        ctx.save();
        ctx.font = `${bold ? 'bold ' : ''}${fontSize}px var(--font-mono), monospace`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.fillText(text, x, y);
        ctx.restore();
    },

    /**
     * Draw node icon with consistent offset
     */
    drawNodeIcon(ctx, icon, x, y, isSatellite) {
        ctx.save();
        ctx.font = isSatellite ? '12px sans-serif' : '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; // Icons are usually white/colored emojis
        ctx.fillText(icon, x, y - (isSatellite ? 0 : 5));
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
