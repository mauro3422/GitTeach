/**
 * LayoutEngine.js
 * The "Cortex" of the Pipeline Visualizer.
 * Handles Physics (Repulsion/Attraction), Hitbox calculation, 
 * and coordinate transformations.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';

export const LayoutEngine = {
    // Current physical positions { id: { x, y, vx, vy } }
    positions: {},

    // Config constants
    DAMPING: 0.85,     // Smoother settle (was 0.7)
    REPULSION: 1800,   // Adjusted for refScale (was 3000)
    SPRING_K: 0.04,    // More liquid, less robotic snap (was 0.08)
    MIN_DISTANCE: 140, // More breathing room (was 110)
    STABILIZATION_THRESHOLD: 0.05, // Earlier stop

    /**
     * Initialize positions from PipelineConstants
     */
    init(width, height) {
        this.positions = {};
        const refScale = 1200; // Fixed reference scale for coordinate mapping
        Object.keys(PIPELINE_NODES).forEach(id => {
            const node = PIPELINE_NODES[id];
            this.positions[id] = {
                x: node.x * refScale,
                y: node.y * refScale,
                vx: 0,
                vy: 0,
                radius: node.isSatellite ? 15 : 30, // Standard hitboxes
                restX: node.x * refScale,
                restY: node.y * refScale
            };
        });
    },

    /**
     * Main Physics Loop (Delta Time based)
     */
    update(width, height, delta = 1) {
        const ids = Object.keys(this.positions);

        // 1. Reset rest positions
        const refScale = 1200;
        ids.forEach(id => {
            const node = PIPELINE_NODES[id];
            const p = this.positions[id];

            if (node.isSatellite && node.orbitParent) {
                // Orbital Rest Position Logic
                const parentPos = this.positions[node.orbitParent];
                if (parentPos) {
                    const radius = (node.orbitRadius || 0.18) * 800; // Standardize orbit scale
                    const angle = (node.orbitAngle || 0) * (Math.PI / 180);
                    p.restX = parentPos.x + radius * Math.cos(angle);
                    p.restY = parentPos.y + radius * Math.sin(angle);
                }
            } else {
                p.restX = node.x * refScale;
                p.restY = node.y * refScale;
            }
        });

        // 2. Calculate Repulsion Forces (Node-to-Node)
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const idA = ids[i];
                const idB = ids[j];
                const a = this.positions[idA];
                const b = this.positions[idB];

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distanceSq = dx * dx + dy * dy;
                const distance = Math.sqrt(distanceSq) || 1;

                const minSeparation = this.MIN_DISTANCE;
                if (distance < minSeparation) {
                    const overlap = minSeparation - distance;
                    // Linear repulsion is much more stable than quadratic
                    const force = overlap * 0.08;
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    a.vx -= fx;
                    a.vy -= fy;
                    b.vx += fx;
                    b.vy += fy;
                }
            }
        }

        // 3. Apply Spring Force (Pull back to rest position)
        ids.forEach(id => {
            const p = this.positions[id];
            const dx = p.restX - p.x;
            const dy = p.restY - p.y;

            p.vx += dx * this.SPRING_K;
            p.vy += dy * this.SPRING_K;

            // 4. Update Positions & Damping
            p.vx *= this.DAMPING;
            p.vy *= this.DAMPING;

            // Stabilization: If velocity is tiny, just stop to prevent microscopic jitter
            if (Math.abs(p.vx) > this.STABILIZATION_THRESHOLD) p.x += p.vx * delta;
            if (Math.abs(p.vy) > this.STABILIZATION_THRESHOLD) p.y += p.vy * delta;
        });
    },

    /**
     * Get computed coordinates for a specific node
     */
    getNodePos(id) {
        if (this.positions[id]) return this.positions[id];

        // Fallback for satellites if they aren't in the physics map (though they should be)
        const node = PIPELINE_NODES[id];
        if (node && node.isSatellite && node.orbitParent) {
            const parent = this.positions[node.orbitParent];
            if (parent) {
                const radius = (node.orbitRadius || 0.18) * 800;
                const angle = (node.orbitAngle || 0) * (Math.PI / 180);
                return {
                    x: parent.x + radius * Math.cos(angle),
                    y: parent.y + radius * Math.sin(angle),
                    radius: 15
                };
            }
        }
        return { x: 0, y: 0, radius: 30 };
    },

    /**
     * Get all active node positions for collision avoidance
     */
    getAllPositions() {
        return this.positions;
    },

    /**
     * Calculate the "Center of Gravity" for the camera to focus on
     */
    getFocalPoint(width, height, nodeStates, targetNodeId) {
        let totalX = 0;
        let totalY = 0;
        let count = 0;

        // Priority 1: Specific target (Selected or Hovered)
        if (targetNodeId && this.positions[targetNodeId]) {
            return { x: this.positions[targetNodeId].x, y: this.positions[targetNodeId].y };
        }

        // Priority 2: Active nodes
        Object.entries(nodeStates).forEach(([id, state]) => {
            if (state === 'active' && this.positions[id]) {
                totalX += this.positions[id].x;
                totalY += this.positions[id].y;
                count++;
            }
        });

        if (count > 0) {
            return { x: totalX / count, y: totalY / count };
        }

        // Default: Center of the pipeline (logical middle)
        const refScale = 1200;
        return { x: refScale / 2, y: (refScale * 0.5) / 2 };
    }
    ,
    /**
     * Softly keep a set of nodes inside a given axis-aligned bounding box.
     * This helps when resizing containers to avoid nodes jumping outside
     * their visual boxes by nudging them back with a gentle easing.
     *
     * ids: array of node IDs to constrain
     * bounds: { minX, minY, maxX, maxY, margin? }
     */
    enforceBoundsForNodes(ids, bounds) {
        if (!ids || ids.length === 0 || !bounds) return;
        const minX = bounds.minX, minY = bounds.minY, maxX = bounds.maxX, maxY = bounds.maxY;
        const margin = (bounds.margin ?? 40);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // For single-node clusters (like cache), position node at center of box
        const isSingleNodeCluster = ids.length === 1;
        
        ids.forEach(id => {
            const p = this.positions[id];
            if (!p) return;
            
            if (isSingleNodeCluster) {
                // Direct positioning to center for single-node clusters
                const driftFactor = 0.1;
                p.x += (centerX - p.x) * driftFactor;
                p.y += (centerY - p.y) * driftFactor;
                if (typeof p.vx === 'number') p.vx *= 0.9;
                if (typeof p.vy === 'number') p.vy *= 0.9;
                return;
            }
            
            // For multi-node clusters, apply bounds with easing
            const outsideHorizontal = p.x < minX + margin || p.x > maxX - margin;
            const outsideVertical = p.y < minY + margin || p.y > maxY - margin;
            
            // Use stronger correction for nodes that are significantly outside
            const correctionStrength = outsideHorizontal || outsideVertical ? 1.0 : 0.02;
            
            if (p.x < minX + margin) {
                p.x += (minX + margin - p.x) * correctionStrength;
            } else if (p.x > maxX - margin) {
                p.x += (maxX - margin - p.x) * correctionStrength;
            } else {
                p.x += (centerX - p.x) * 0.005;
            }
            
            if (p.y < minY + margin) {
                p.y += (minY + margin - p.y) * correctionStrength;
            } else if (p.y > maxY - margin) {
                p.y += (maxY - margin - p.y) * correctionStrength;
            } else {
                p.y += (centerY - p.y) * 0.005;
            }
            
            if (typeof p.vx === 'number') p.vx *= 0.95;
            if (typeof p.vy === 'number') p.vy *= 0.95;
        });
    }
};
