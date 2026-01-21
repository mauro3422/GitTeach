/**
 * PipelineParticleManager.js
 * Responsabilidad: Ciclo de vida de partículas, paquetes viajeros y pulsos.
 */

import { PIPELINE_NODES } from './PipelineConstants.js';
import { LayoutEngine } from './LayoutEngine.js';

export const PipelineParticleManager = {
    particles: [],
    travelingPackages: [],
    pulses: [],

    /**
     * Inicializar el manager de partículas
     */
    init() {
        this.particles = [];
        this.travelingPackages = [];
        this.pulses = [];
    },

    /**
     * Create a ripple pulse at a node to signal activity
     */
    addPulse(nodeId, color) {
        this.pulses.push({
            nodeId,
            color,
            startTime: Date.now(),
            duration: 1200
        });
    },

    /**
     * Spawn particles emanating from a node
     */
    addParticles(nodeId, color) {
        if (!LayoutEngine.positions[nodeId]) return;
        const pos = LayoutEngine.positions[nodeId];

        for (let i = 0; i < 6; i++) {
            this.particles.push({
                fromX: pos.x,
                fromY: pos.y,
                toX: pos.x + (Math.random() * 60 - 30),
                toY: pos.y + (Math.random() * 60 - 30),
                startTime: Date.now(),
                duration: 800 + Math.random() * 500,
                color: color
            });
        }
    },

    /**
     * Spawn a traveling package between nodes
     */
    addTravelingPackage(fromId, toId, file = null, type = 'RAW_FILE') {
        if (!PIPELINE_NODES[fromId] || !PIPELINE_NODES[toId]) return;

        // Speed variance for more organic highway feel
        const speed = 0.015 + Math.random() * 0.01;

        this.travelingPackages.push({
            from: fromId,
            to: toId,
            file: file,
            type: type,
            progress: 0,
            speed: speed
        });
    },

    /**
     * Update traveling packages (called from render loop)
     */
    updateTravelingPackages() {
        const packages = this.travelingPackages;
        for (let i = packages.length - 1; i >= 0; i--) {
            const pkg = packages[i];
            pkg.progress += pkg.speed || 0.02;
            if (pkg.progress >= 1) {
                packages.splice(i, 1);
            }
        }
    },

    /**
     * Clean particles and pulses that have finished their duration
     */
    cleanup() {
        const now = Date.now();
        this.particles = this.particles.filter(p => (now - p.startTime) < p.duration);
        this.pulses = this.pulses.filter(p => (now - p.startTime) < p.duration);
    },

    /**
     * Get all particles (for rendering)
     */
    getParticles() {
        return this.particles;
    },

    /**
     * Get all traveling packages (for rendering)
     */
    getTravelingPackages() {
        return this.travelingPackages;
    },

    /**
     * Get all pulses (for rendering)
     */
    getPulses() {
        return this.pulses;
    }
};
