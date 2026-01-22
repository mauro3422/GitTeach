/**
 * InputManager.js
 * Gestión centralizada de input y eventos
 * Abstrae listeners, shortcuts y normaliza eventos cross-device
 */

export const InputManager = {
    /**
     * Estado actual del input
     */
    _state: {
        keysPressed: new Set(),
        mousePos: { x: 0, y: 0 },
        wheelDelta: 0,
        isPointerDown: false,
        activeModifiers: new Set()
    },

    /**
     * Mapa de shortcuts registrados
     */
    _shortcuts: new Map(),

    /**
     * Handlers registrados
     */
    _handlers: {},

    /**
     * Elemento DOM al que están asociados los listeners
     */
    _element: null,

    /**
     * Inicializa listeners en un elemento
     * @param {HTMLElement} element - Elemento DOM
     * @param {Object} handlers - Handlers de eventos
     * @param {Object} options - Opciones adicionales
     */
    init(element, handlers = {}, options = {}) {
        this._element = element;
        this._handlers = { ...handlers };
        this._windowMouseUp = options.windowMouseUp || false;

        // Limpiar listeners previos
        this._cleanup();

        // Configurar listeners unificados
        this._setupListeners();

        console.log('[InputManager] Inicializado con handlers:', Object.keys(handlers), 'windowMouseUp:', this._windowMouseUp);
    },

    /**
     * Registra un shortcut de teclado
     * @param {string|Array} keys - 'Ctrl+Z' o ['Control', 'z']
     * @param {string} actionName - Nombre para debugging
     * @param {Function} callback - Función a ejecutar
     */
    registerShortcut(keys, actionName, callback) {
        const keyCombo = this._normalizeKeyCombo(keys);
        this._shortcuts.set(keyCombo, { actionName, callback });
        console.log(`[InputManager] Shortcut registrado: ${keyCombo} → ${actionName}`);
    },

    /**
     * Remueve un shortcut
     * @param {string|Array} keys - Combinación de teclas
     */
    unregisterShortcut(keys) {
        const keyCombo = this._normalizeKeyCombo(keys);
        this._shortcuts.delete(keyCombo);
    },

    /**
     * Obtiene estado actual del input
     * @returns {Object} Estado del input
     */
    getCurrentState() {
        return { ...this._state };
    },

    /**
     * Fuerza actualización del estado del mouse
     * @param {MouseEvent} e - Evento del mouse
     */
    updateMousePos(e) {
        if (!this._element) return;

        const rect = this._element.getBoundingClientRect();
        this._state.mousePos = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    },

    /**
     * Configura todos los event listeners
     * @private
     */
    _setupListeners() {
        if (!this._element) return;

        // Mouse events
        this._element.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this._element.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this._element.addEventListener('dblclick', this._handleDoubleClick.bind(this));

        // Mouse up: element o window según opción
        if (this._windowMouseUp) {
            window.addEventListener('mouseup', this._handleMouseUp.bind(this));
        } else {
            this._element.addEventListener('mouseup', this._handleMouseUp.bind(this));
        }

        // Wheel event
        this._element.addEventListener('wheel', this._handleWheel.bind(this), { passive: false });

        // Touch events para soporte móvil
        this._element.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
        this._element.addEventListener('touchmove', this._handleTouchMove.bind(this), { passive: false });
        this._element.addEventListener('touchend', this._handleTouchEnd.bind(this));

        // Keyboard events
        window.addEventListener('keydown', this._handleKeyDown.bind(this));
        window.addEventListener('keyup', this._handleKeyUp.bind(this));

        // Context menu
        this._element.addEventListener('contextmenu', this._handleContextMenu.bind(this));

        // Pointer events como respaldo
        this._element.addEventListener('pointerdown', this._handlePointerDown.bind(this));
        this._element.addEventListener('pointermove', this._handlePointerMove.bind(this));
        this._element.addEventListener('pointerup', this._handlePointerUp.bind(this));
    },

    /**
     * Limpia todos los listeners
     * @private
     */
    _cleanup() {
        if (!this._element) return;

        // Remover listeners existentes (simplificado)
        this._element.replaceWith(this._element.cloneNode(true));
        this._element = null;
    },

    /**
     * Handlers de eventos del mouse
     */
    _handleMouseDown(e) {
        this._state.isPointerDown = true;
        this.updateMousePos(e);

        if (this._handlers.onMouseDown) {
            this._handlers.onMouseDown(this._normalizeMouseEvent(e));
        }
    },

    _handleMouseMove(e) {
        this.updateMousePos(e);

        if (this._handlers.onMouseMove) {
            this._handlers.onMouseMove(this._normalizeMouseEvent(e));
        }
    },

    _handleMouseUp(e) {
        this._state.isPointerDown = false;
        this.updateMousePos(e);

        if (this._handlers.onMouseUp) {
            this._handlers.onMouseUp(this._normalizeMouseEvent(e));
        }
    },

    _handleDoubleClick(e) {
        if (this._handlers.onDoubleClick) {
            this._handlers.onDoubleClick(this._normalizeMouseEvent(e));
        }
    },

    /**
     * Handler de wheel con normalización
     */
    _handleWheel(e) {
        e.preventDefault();

        // Normalizar delta entre navegadores
        const delta = this._normalizeWheelDelta(e);

        this._state.wheelDelta = delta;

        if (this._handlers.onWheel) {
            this._handlers.onWheel({
                deltaX: e.deltaX,
                deltaY: delta,
                deltaZ: e.deltaZ,
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                clientX: e.clientX,
                clientY: e.clientY
            });
        }
    },

    /**
     * Handlers de teclado
     */
    _handleKeyDown(e) {
        this._state.keysPressed.add(e.code);

        // Actualizar modificadores
        this._updateModifiers(e);

        // Procesar shortcuts
        const shortcut = this._findMatchingShortcut();
        if (shortcut) {
            e.preventDefault();
            shortcut.callback(e);
            return;
        }

        if (this._handlers.onKeyDown) {
            this._handlers.onKeyDown(this._normalizeKeyEvent(e));
        }
    },

    _handleKeyUp(e) {
        this._state.keysPressed.delete(e.code);
        this._updateModifiers(e);

        if (this._handlers.onKeyUp) {
            this._handlers.onKeyUp(this._normalizeKeyEvent(e));
        }
    },

    /**
     * Handlers de touch (simplificados)
     */
    _handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this._state.isPointerDown = true;
            this._state.mousePos = { x: touch.clientX, y: touch.clientY };

            if (this._handlers.onMouseDown) {
                this._handlers.onMouseDown({
                    button: 0,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    ctrlKey: false,
                    altKey: false,
                    shiftKey: false
                });
            }
        }
    },

    _handleTouchMove(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this._state.mousePos = { x: touch.clientX, y: touch.clientY };

            if (this._handlers.onMouseMove) {
                this._handlers.onMouseMove({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    ctrlKey: false,
                    altKey: false,
                    shiftKey: false
                });
            }
        }
    },

    _handleTouchEnd(e) {
        this._state.isPointerDown = false;

        if (this._handlers.onMouseUp) {
            this._handlers.onMouseUp({
                button: 0,
                clientX: this._state.mousePos.x,
                clientY: this._state.mousePos.y,
                ctrlKey: false,
                altKey: false,
                shiftKey: false
            });
        }
    },

    /**
     * Handlers de pointer (respaldo)
     */
    _handlePointerDown(e) {
        if (!this._handlers.onPointerDown) return;
        this._handlers.onPointerDown(this._normalizePointerEvent(e));
    },

    _handlePointerMove(e) {
        if (!this._handlers.onPointerMove) return;
        this._handlers.onPointerMove(this._normalizePointerEvent(e));
    },

    _handlePointerUp(e) {
        if (!this._handlers.onPointerUp) return;
        this._handlers.onPointerUp(this._normalizePointerEvent(e));
    },

    _handleContextMenu(e) {
        e.preventDefault(); // Prevenir menú contextual por defecto
    },

    /**
     * Utilidades de normalización
     */
    _normalizeMouseEvent(e) {
        return {
            button: e.button,
            buttons: e.buttons,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey
        };
    },

    _normalizeKeyEvent(e) {
        return {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            repeat: e.repeat
        };
    },

    _normalizePointerEvent(e) {
        return {
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            clientX: e.clientX,
            clientY: e.clientY,
            pressure: e.pressure,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey
        };
    },

    _normalizeWheelDelta(e) {
        // Normalizar wheel delta (Firefox usa diferente escala)
        const delta = e.deltaY;
        if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
            return delta * 16; // Aproximadamente 16px por línea
        } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
            return delta * 800; // Aproximadamente 800px por página
        }
        return delta;
    },

    _normalizeKeyCombo(keys) {
        if (typeof keys === 'string') {
            // Parsear string como "Ctrl+Z"
            return keys.toLowerCase().replace(/\s+/g, '');
        } else if (Array.isArray(keys)) {
            // Array como ['Control', 'KeyZ']
            return keys.map(k => k.toLowerCase()).sort().join('+');
        }
        return '';
    },

    _findMatchingShortcut() {
        const pressedKeys = Array.from(this._state.keysPressed).sort();
        const combo = pressedKeys.join('+').toLowerCase();

        // Buscar coincidencia exacta
        for (const [keyCombo, shortcut] of this._shortcuts) {
            if (keyCombo === combo) {
                return shortcut;
            }
        }

        return null;
    },

    _updateModifiers(e) {
        this._state.activeModifiers.clear();
        if (e.ctrlKey || e.metaKey) this._state.activeModifiers.add('ctrl');
        if (e.altKey) this._state.activeModifiers.add('alt');
        if (e.shiftKey) this._state.activeModifiers.add('shift');
    }
};
