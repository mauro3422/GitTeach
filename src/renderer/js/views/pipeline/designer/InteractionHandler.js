/**
 * InteractionHandler.js
 * Clase base abstracta para todos los handlers de interacción
 * Proporciona una interfaz común y gestión de estado estandarizada
 */

export class InteractionHandler {
    constructor(controller) {
        this.controller = controller;
        this._isInteractionActive = false;
        this.state = {};
    }

    /**
     * Inicia la interacción
     * @param {MouseEvent} e - Evento del mouse
     * @param {Object} context - Contexto adicional (nodos, etc.)
     */
    start(e, context) {
        this._isInteractionActive = true;
        this.onStart(e, context);
    }

    /**
     * Actualiza la interacción en curso
     * @param {MouseEvent} e - Evento del mouse
     */
    update(e) {
        if (this._isInteractionActive) {
            this.onUpdate(e);
        }
    }

    /**
     * Finaliza la interacción
     * @param {MouseEvent} e - Evento del mouse
     */
    end(e) {
        if (this._isInteractionActive) {
            this._isInteractionActive = false;
            this.onEnd(e);
        }
    }

    /**
     * Cancela la interacción
     */
    cancel() {
        if (this._isInteractionActive) {
            this._isInteractionActive = false;
            this.onCancel();
        }
    }

    // Métodos abstractos que deben ser implementados por subclases

    /**
     * Lógica específica para iniciar la interacción
     * @param {MouseEvent} e
     * @param {Object} context
     */
    onStart(e, context) {
        throw new Error('InteractionHandler.onStart() must be implemented by subclass');
    }

    /**
     * Lógica específica para actualizar la interacción
     * @param {MouseEvent} e
     */
    onUpdate(e) {
        throw new Error('InteractionHandler.onUpdate() must be implemented by subclass');
    }

    /**
     * Lógica específica para finalizar la interacción
     * @param {MouseEvent} e
     */
    onEnd(e) {
        // Implementación por defecto vacía
    }

    /**
     * Lógica específica para cancelar la interacción
     */
    onCancel() {
        // Implementación por defecto vacía
    }

    /**
     * Verifica si la interacción está activa
     * @returns {boolean}
     */
    isActive() {
        return this._isInteractionActive;
    }

    /**
     * Obtiene el estado interno del handler
     * @returns {Object}
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Establece el estado interno del handler
     * @param {Object} newState
     */
    setState(newState) {
        Object.assign(this.state, newState);
    }

    /**
     * Limpia el estado interno
     */
    clearState() {
        this.state = {};
    }
}
