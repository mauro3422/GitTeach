/**
 * Gestor centralizado de animaciones
 * Unifica todos los loops de requestAnimationFrame para mejor rendimiento
 */
export const AnimationManager = {
    activeTweens: new Map(), // Changed to Map for ID-based lookup
    animationFrameId: null,
    onRender: null,

    /**
     * Registra un tween activo
     * @param {Object} tween - Objeto con id único y función de animación
     */
    registerTween(tween) {
        this.activeTweens.set(tween.id, tween);
        this.startAnimationLoop();
    },

    /**
     * Desregistra un tween
     * @param {string|Object} tween - El ID del tween o el objeto tween
     */
    unregisterTween(tweenOrId) {
        const id = typeof tweenOrId === 'string' ? tweenOrId : tweenOrId.id;
        this.activeTweens.delete(id);
        if (this.activeTweens.size === 0) {
            this.stopAnimationLoop();
        }
    },

    /**
     * Verifica si hay animaciones activas
     * @returns {boolean} true si hay animaciones corriendo
     */
    hasActiveAnimations() {
        return this.activeTweens.size > 0;
    },

    /**
     * Configura el callback de renderizado
     * @param {Function} onRender - Función a llamar en cada frame
     */
    setRenderCallback(onRender) {
        this.onRender = onRender;
    },

    /**
     * Inicia el loop de animación si no está corriendo
     */
    startAnimationLoop() {
        if (this.animationFrameId === null) {
            const animate = () => {
                // 1. Execute all active tweens
                this.activeTweens.forEach(tween => {
                    if (tween.animate) tween.animate();
                });

                // 2. Perform global render
                if (this.onRender) {
                    this.onRender();
                }

                if (this.activeTweens.size > 0) {
                    this.animationFrameId = requestAnimationFrame(animate);
                } else {
                    this.animationFrameId = null;
                }
            };
            this.animationFrameId = requestAnimationFrame(animate);
        }
    },

    /**
     * Detiene el loop de animación
     */
    stopAnimationLoop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    },

    /**
     * Fuerza un render inmediato (útil para cambios no animados)
     */
    forceRender() {
        if (this.onRender) {
            this.onRender();
        }
    }
};
