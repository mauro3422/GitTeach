/**
 * Utilidades compartidas para cálculos de canvas y coordenadas
 * Centraliza lógica común para evitar duplicación
 */
export const CanvasUtils = {
    /**
     * Calcula la posición central del canvas en coordenadas mundiales
     * @param {HTMLCanvasElement} canvas - El elemento canvas
     * @param {Object} navState - Estado de navegación (panOffset, zoomScale)
     * @returns {Object} {x, y} posición central en mundo
     */
    getCanvasCenterWorldPos(canvas, navState) {
        return {
            x: (canvas.width / 2 - navState.panOffset.x) / navState.zoomScale,
            y: (canvas.height / 2 - navState.panOffset.y) / navState.zoomScale
        };
    },

    /**
     * Convierte coordenadas de pantalla a coordenadas mundiales
     * @param {Object} screenPos - {x, y} en pantalla
     * @param {Object} navState - Estado de navegación
     * @returns {Object} {x, y} en mundo
     */
    screenToWorld(screenPos, navState) {
        return {
            x: (screenPos.x - navState.panOffset.x) / navState.zoomScale,
            y: (screenPos.y - navState.panOffset.y) / navState.zoomScale
        };
    },

    /**
     * Convierte coordenadas mundiales a coordenadas de pantalla
     * @param {Object} worldPos - {x, y} en mundo
     * @param {Object} navState - Estado de navegación
     * @returns {Object} {x, y} en pantalla
     */
    worldToScreen(worldPos, navState) {
        return {
            x: worldPos.x * navState.zoomScale + navState.panOffset.x,
            y: worldPos.y * navState.zoomScale + navState.panOffset.y
        };
    },

    /**
     * Obtiene la posición del mouse en coordenadas mundiales
     * @param {MouseEvent} e - Evento del mouse
     * @param {HTMLCanvasElement} canvas - El canvas
     * @param {Object} navState - Estado de navegación
     * @returns {Object} {x, y} en mundo
     */
    getMouseWorldPos(e, canvas, navState) {
        const rect = canvas.getBoundingClientRect();
        const screenPos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        return this.screenToWorld(screenPos, navState);
    },

    /**
     * Obtiene la posición del mouse en coordenadas de pantalla
     * @param {MouseEvent} e - Evento del mouse
     * @param {HTMLCanvasElement} canvas - El canvas
     * @returns {Object} {x, y} en pantalla
     */
    getMouseScreenPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
};
