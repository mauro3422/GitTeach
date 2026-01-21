import { LabelRenderer } from '../LabelRenderer.js';

export const DesignerCanvas = {
    ctx: null,

    init(ctx) {
        this.ctx = ctx;
    },

    /**
     * Calculate dynamic node radius based on zoom to maintain visual presence
     */
    getNodeRadius(node, zoomScale = 1) {
        const baseRadius = node.isSatellite ? 25 : 35;
        // Compensate partially for zoom: radius grows in world space as zoom decreases
        // At zoom 1.0 -> comp 1.0
        // At zoom 0.5 -> comp ~1.3
        // At zoom 0.2 -> comp ~1.9
        const comp = Math.pow(1 / zoomScale, 0.4);
        return baseRadius * Math.min(2.5, comp);
    },

    drawGrid(width, height, navState) {
        const ctx = this.ctx;
        const { panOffset, zoomScale } = navState;
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
        ctx.lineWidth = 1 / zoomScale;
        const size = 100;
        const startX = -Math.floor(panOffset.x / zoomScale / size) * size - size * 10;
        const endX = startX + (width / zoomScale) + size * 20;
        const startY = -Math.floor(panOffset.y / zoomScale / size) * size - size * 10;
        const endY = startY + (height / zoomScale) + size * 20;
        for (let x = startX; x <= endX; x += size) {
            ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
        }
        for (let y = startY; y <= endY; y += size) {
            ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
        }
        ctx.restore();
    },
    /**
     * Calculate the edge point of a node (circle or rectangle) towards a target
     */
    getEdgePoint(node, targetX, targetY, nodes) {
        const angle = Math.atan2(targetY - node.y, targetX - node.x);

        if (node.isRepoContainer) {
            // For rectangles, calculate intersection with border
            const bounds = this.getContainerBounds(node, nodes);
            const w = bounds.w / 2;
            const h = bounds.h / 2;

            // Calculate intersection with rectangle edges
            const tanAngle = Math.tan(angle);
            let edgeX, edgeY;

            // Check intersection with vertical edges (left/right)
            if (Math.abs(Math.cos(angle)) > 0.001) {
                const xSign = Math.cos(angle) > 0 ? 1 : -1;
                edgeX = node.x + w * xSign;
                edgeY = node.y + w * xSign * tanAngle;

                // Check if this point is within the horizontal bounds
                if (Math.abs(edgeY - node.y) <= h) {
                    return { x: edgeX, y: edgeY };
                }
            }

            // Otherwise intersect with horizontal edges (top/bottom)
            const ySign = Math.sin(angle) > 0 ? 1 : -1;
            edgeY = node.y + h * ySign;
            edgeX = node.x + h * ySign / tanAngle;
            return { x: edgeX, y: edgeY };
        } else {
            // For circles, use dynamic radius
            const radius = this.getNodeRadius(node, navState.zoomScale);
            return {
                x: node.x + radius * Math.cos(angle),
                y: node.y + radius * Math.sin(angle)
            };
        }
    },

    /**
     * Draw a persistent manual connection between two nodes
     */
    drawSimpleLine(fromNode, toNode, navState, nodes) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        // Get edge points for both nodes (handles circles and rectangles)
        const startPoint = this.getEdgePoint(fromNode, toNode.x, toNode.y, nodes);
        const endPoint = this.getEdgePoint(toNode, fromNode.x, fromNode.y, nodes);

        const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

        ctx.beginPath();
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.9;

        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        // Arrow head
        const headlen = 10;
        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle - Math.PI / 6), endPoint.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endPoint.x - headlen * Math.cos(angle + Math.PI / 6), endPoint.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = '#58a6ff';
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw the "ghost" line while the user is actively drawing a connection
     */
    drawActiveLine(fromNode, mouseWorldPos, navState) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(navState.panOffset.x, navState.panOffset.y);
        ctx.scale(navState.zoomScale, navState.zoomScale);

        const angle = Math.atan2(mouseWorldPos.y - fromNode.y, mouseWorldPos.x - fromNode.x);
        const fromRadius = fromNode.isSatellite ? 25 : 35;
        const startX = fromNode.x + fromRadius * Math.cos(angle);
        const startY = fromNode.y + fromRadius * Math.sin(angle);

        ctx.beginPath();
        ctx.strokeStyle = '#2f81f7';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
        ctx.stroke();

        ctx.restore();
    },

    // Unified logic to calculate container dimensions based on children
    getContainerBounds(node, nodes, zoomScale = 1.0) {
        const containerId = node.id;
        const isScaleUp = node.isDropTarget;
        // Tuned scale factor: 1.10 is subtler than 1.15 (~3-5px less in typical view)
        const scaleFactor = isScaleUp ? 1.10 : 1.0;

        // MANUAL MODE: If user has resized manually, use those dimensions
        if (node.manualWidth && node.manualHeight) {
            return {
                w: node.manualWidth * scaleFactor,
                h: node.manualHeight * scaleFactor,
                centerX: node.x,
                centerY: node.y
            };
        }

        const children = Object.values(nodes).filter(n => n.parentId === containerId);

        if (children.length === 0) {
            const config = { w: 140, h: 100 };
            return {
                w: config.w * scaleFactor,
                h: config.h * scaleFactor,
                centerX: node.x,
                centerY: node.y
            };
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        children.forEach(c => {
            const r = this.getNodeRadius(c, zoomScale);

            // Estimate label width in world space to avoid clipping
            // Base label font is 22px in screen space. Approx 0.6 units per char.
            const labelStr = c.label || "";
            const estimatedPixelWidth = labelStr.length * 13; // 13px per char avg for 22px mono
            const worldLabelWidth = estimatedPixelWidth / zoomScale;

            const effectiveHalfWidth = Math.max(r, worldLabelWidth / 2 + 10);

            minX = Math.min(minX, c.x - effectiveHalfWidth);
            maxX = Math.max(maxX, c.x + effectiveHalfWidth);
            minY = Math.min(minY, c.y - r);
            maxY = Math.max(maxY, c.y + r);
        });

        const padding = 60;
        const hPadding = 60; // Extra bottom space
        const w = ((maxX - minX) + padding) * scaleFactor;
        const h = ((maxY - minY) + hPadding + 40) * scaleFactor;
        return {
            w, h,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    },

    drawNodes(nodes, navState, activeSourceNodeId = null) {
        const ctx = this.ctx;
        const { panOffset, zoomScale } = navState;
        ctx.save();
        ctx.translate(panOffset.x, panOffset.y);
        ctx.scale(zoomScale, zoomScale);

        // --- PHASE 1: CONTAINERS (Background) ---
        Object.values(nodes).forEach(node => {
            if (!node.isRepoContainer) return;
            const { color, icon, label, isDropTarget } = node;
            const bounds = this.getContainerBounds(node, nodes, zoomScale);

            // Re-center container based on children ONLY if auto-sizing (not manual)
            const hasChildren = Object.values(nodes).some(n => n.parentId === node.id);
            const isAutoSize = !node.manualWidth && !node.manualHeight;
            if (hasChildren && isAutoSize && !node.isDragging) {
                node.x = bounds.centerX;
                node.y = bounds.centerY;
            }

            const x = node.x;
            const y = node.y;
            const w = bounds.w;
            const h = bounds.h;

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = isDropTarget ? 'rgba(35, 134, 54, 0.15)' : 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = isDropTarget ? '#3fb950' : color;
            ctx.lineWidth = isDropTarget ? 4 : 2;

            if (node.isDragging || node.isHovered) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = isDropTarget ? '#3fb950' : color;
                ctx.lineWidth = 3;
            }

            if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 12);
            else ctx.rect(x - w / 2, y - h / 2, w, h);
            ctx.fill();
            ctx.stroke();
            ctx.restore();


            // Specific logic for Cache folders inside the box removed.
            // They are now real child nodes managed by the designer.

            // Message Indicator Badge for containers
            if (node.message) {
                this.drawMessageBadge(ctx, x + w / 2 - 10, y - h / 2 + 10, color);
            }

            // Resize Handles (visible on hover only)
            if (node.isHovered) {
                const handleSize = 8;
                const corners = [
                    { x: x - w / 2, y: y - h / 2 }, // nw
                    { x: x + w / 2, y: y - h / 2 }, // ne
                    { x: x - w / 2, y: y + h / 2 }, // sw
                    { x: x + w / 2, y: y + h / 2 }  // se
                ];
                ctx.save();
                ctx.fillStyle = color;
                corners.forEach(pos => {
                    ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }
        });

        // --- PHASE 2: STICKY NOTES ---
        Object.values(nodes).forEach(node => {
            if (!node.isStickyNote) return;

            const { x, y, width, height, text, color } = node;
            const w = width || 180;
            const h = height || 100;

            ctx.save();

            // Background
            ctx.fillStyle = 'rgba(22, 27, 34, 0.92)';
            ctx.strokeStyle = color || '#3fb950';
            ctx.lineWidth = 2;
            ctx.shadowColor = color || '#3fb950';
            ctx.shadowBlur = node.isHovered ? 15 : 8;

            // Rounded rectangle
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 + radius, y - h / 2);
            ctx.lineTo(x + w / 2 - radius, y - h / 2);
            ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + radius);
            ctx.lineTo(x + w / 2, y + h / 2 - radius);
            ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - radius, y + h / 2);
            ctx.lineTo(x - w / 2 + radius, y + h / 2);
            ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - radius);
            ctx.lineTo(x - w / 2, y - h / 2 + radius);
            ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + radius, y - h / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Text and Word Wrap moved to Phase 4 (Screen Space)

            // Resize Handles (stay in world space)
            if (node.isHovered) {
                const handleSize = 8 / zoomScale; // keep handle size consistent
                const corners = [
                    { x: x - w / 2, y: y - h / 2 }, // nw
                    { x: x + w / 2, y: y - h / 2 }, // ne
                    { x: x - w / 2, y: y + h / 2 }, // sw
                    { x: x + w / 2, y: y + h / 2 }  // se
                ];
                ctx.save();
                ctx.fillStyle = color || '#3fb950';
                corners.forEach(pos => {
                    ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
                });
                ctx.restore();
            }

            ctx.restore();
        });

        // --- PHASE 3: NODES (Foreground) ---
        Object.values(nodes).forEach(node => {
            if (node.isRepoContainer || node.isStickyNote) return;

            const { x, y, color, icon, label, isSatellite } = node;
            const radius = this.getNodeRadius(node, zoomScale);


            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = 'rgba(22, 27, 34, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            if (node.isDragging || node.isHovered) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.lineWidth = 3;
            }
            if (activeSourceNodeId === node.id) {
                ctx.shadowBlur = 20; ctx.shadowColor = '#2f81f7';
                ctx.lineWidth = 4; ctx.strokeStyle = '#2f81f7';
            }

            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore(); // Restore from initial pan/zoom
    },



    // --- PHASE 4: UI LABELS (Screen Space / 1:1 Scale) ---
    // This is "Good Practice": UI elements that need to be readable stay at a constant
    // screen size regardless of the world transform zoom.
    drawUI(nodes, navState) {
        const ctx = this.ctx;
        if (!ctx) return;
        const { panOffset, zoomScale } = navState;

        Object.values(nodes).forEach(node => {
            const screenX = node.x * zoomScale + panOffset.x;
            const screenY = node.y * zoomScale + panOffset.y;

            if (node.isRepoContainer) {
                const bounds = this.getContainerBounds(node, nodes, zoomScale);
                const sW = bounds.w * zoomScale;
                const sH = bounds.h * zoomScale;
                LabelRenderer.drawStandardText(ctx, node.label.toUpperCase(), screenX, screenY - sH / 2 + 20, {
                    fontSize: 22, // Constant pixel size on screen
                    color: node.isHovered ? '#ffffff' : node.color,
                    bold: true
                });

                if (node.message) {
                    this.drawMessageBadge(ctx, screenX + sW / 2 - 15, screenY - sH / 2 + 15, node.color);
                }
            } else if (node.isStickyNote) {
                const sW = (node.width || 180) * zoomScale;
                const sH = (node.height || 100) * zoomScale;

                ctx.save();
                const fSize = 18;
                ctx.font = `${fSize}px var(--font-mono), monospace`;
                ctx.fillStyle = node.color || '#3fb950';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                const maxWidth = sW - 24;
                const words = (node.text || '').split(' ');
                let line = '';
                let yOff = screenY - sH / 2 + 20;

                for (const word of words) {
                    const testLine = line + word + ' ';
                    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
                        ctx.fillText(line, screenX - sW / 2 + 12, yOff);
                        line = word + ' ';
                        yOff += fSize + 6;
                        if (yOff > screenY + sH / 2 - 25) break;
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, screenX - sW / 2 + 12, yOff);
                ctx.restore();
            } else {
                // Regular Nodes
                const radius = this.getNodeRadius(node, zoomScale);
                LabelRenderer.drawNodeIcon(ctx, node.icon, screenX, screenY, node.isSatellite, zoomScale, radius);
                LabelRenderer.drawNodeLabel(ctx, node, screenX, screenY, node.isHovered, zoomScale, radius);

                if (node.message) {
                    const sRadius = radius * zoomScale;
                    this.drawMessageBadge(ctx, screenX + sRadius * 0.7, screenY - sRadius * 0.7, node.color);
                }

                // Tooltip in screen space for better readability
                if (node.isHovered && node.description) {
                    this.drawDescriptionTooltip(ctx, node, screenX, screenY, node.color, zoomScale);
                }
            }
        });
    },

    drawMessageBadge(ctx, x, y, color) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#f1e05a';
        ctx.fillStyle = '#f1e05a';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✎', x, y + 6);
    },

    drawDescriptionTooltip(ctx, node, screenX, screenY, color, zoomScale) {
        const radius = (node.isRepoContainer ? 75 : 45) * zoomScale;
        const tooltipX = screenX + radius;
        const tooltipY = screenY - radius;
        const maxWidth = 220;

        ctx.save();
        const fontSize = 15;
        ctx.font = `${fontSize}px var(--font-mono), monospace`;
        const words = (node.description || '').split(' ');
        let lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine);

        const tooltipH = (lines.length * (fontSize + 6)) + 20;
        const tooltipW = maxWidth + 20;

        ctx.beginPath();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.fillStyle = 'rgba(13, 17, 23, 0.98)';
        ctx.strokeStyle = color || '#8b949e';
        ctx.lineWidth = 2;
        if (ctx.roundRect) ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 10);
        else ctx.rect(tooltipX, tooltipY, tooltipW, tooltipH);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e6edf3';
        lines.forEach((line, i) => {
            ctx.fillText(line, tooltipX + 10, tooltipY + 10 + i * (fontSize + 6));
        });
        ctx.restore();
    }
};
