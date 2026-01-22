/**
 * CanvasCamera.js
 * Clase dedicada a manejar la matemática de transformación de coordenadas para zoom/pan.
 * Elimina duplicación y centraliza lógica de coordenadas screen↔world.
 */

export class CanvasCamera {
    constructor() {
        this.pan = { x: 0, y: 0 };
        this.zoom = 1.0;
    }

    /**
     * Aplica la transformación completa (pan + zoom) al contexto del canvas.
     */
    apply(ctx) {
        ctx.save();
        ctx.translate(this.pan.x, this.pan.y);
        ctx.scale(this.zoom, this.zoom);
    }

    /**
     * Restaura el contexto después de apply().
     */
    restore(ctx) {
        ctx.restore();
    }

    /**
     * Convierte coordenadas de Pantalla -> Mundo
     * Útil para eventos del mouse.
     */
    toWorld(screenX, screenY) {
        return {
            x: (screenX - this.pan.x) / this.zoom,
            y: (screenY - this.pan.y) / this.zoom
        };
    }

    /**
     * Convierte coordenadas de Mundo -> Pantalla
     * Útil para overlays HTML sobre elementos del canvas.
     */
    toScreen(worldX, worldY) {
        return {
            x: worldX * this.zoom + this.pan.x,
            y: worldY * this.zoom + this.pan.y
        };
    }

    /**
     * Getters para compatibilidad temporal con navState
     */
    get zoomScale() {
        return this.zoom;
    }

    get panOffset() {
        return this.pan;
    }

    /**
     * Setters para compatibilidad temporal
     */
    set zoomScale(value) {
        this.zoom = value;
    }

    set panOffset(value) {
        this.pan = value;
    }
}
