/**
 * InputManager.js
 * Gestión centralizada de input y eventos
 * Abstrae listeners, shortcuts y normaliza eventos cross-device
 */

import { InputUtils } from './InputUtils.js';

export const InputManager = {
    _state: {
        keysPressed: new Set(),
        mousePos: { x: 0, y: 0 },
        wheelDelta: 0,
        isPointerDown: false,
        activeModifiers: new Set()
    },

    _shortcuts: new Map(),
    _handlers: {},
    _boundHandlers: {},
    _element: null,

    /**
     * Inicializa listeners en un elemento
     */
    init(element, handlers = {}, options = {}) {
        this._cleanup();
        this._element = element;
        this._handlers = { ...handlers };
        this._windowMouseUp = options.windowMouseUp || false;
        this._setupListeners();
        console.log('[InputManager] Inicializado');
    },

    /**
     * Registra un shortcut de teclado
     */
    registerShortcut(keys, actionName, callback) {
        const keyCombo = InputUtils.normalizeKeyCombo(keys);
        this._shortcuts.set(keyCombo, { actionName, callback });
        console.log(`[InputManager] Registered shortcut: ${actionName} → ${keyCombo}`);
    },

    unregisterShortcut(keys) {
        const keyCombo = InputUtils.normalizeKeyCombo(keys);
        this._shortcuts.delete(keyCombo);
    },

    getCurrentState() { return { ...this._state }; },

    updateMousePos(e) {
        if (!this._element) return;
        const rect = this._element.getBoundingClientRect();
        this._state.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },

    /**
     * Handlers de eventos
     */
    _handleMouseDown(e) {
        this._state.isPointerDown = true;
        this.updateMousePos(e);
        if (this._handlers.onMouseDown) this._handlers.onMouseDown(InputUtils.normalizeMouseEvent(e));
    },

    _handleMouseMove(e) {
        this.updateMousePos(e);
        if (this._handlers.onMouseMove) this._handlers.onMouseMove(InputUtils.normalizeMouseEvent(e));
    },

    _handleMouseUp(e) {
        this._state.isPointerDown = false;
        this.updateMousePos(e);
        if (this._handlers.onMouseUp) this._handlers.onMouseUp(InputUtils.normalizeMouseEvent(e));
    },

    _handleDoubleClick(e) {
        if (this._handlers.onDoubleClick) this._handlers.onDoubleClick(InputUtils.normalizeMouseEvent(e));
    },

    _handleWheel(e) {
        e.preventDefault();
        const delta = InputUtils.normalizeWheelDelta(e);
        this._state.wheelDelta = delta;
        if (this._handlers.onWheel) {
            this._handlers.onWheel({
                deltaX: e.deltaX, deltaY: delta, deltaZ: e.deltaZ,
                ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey,
                clientX: e.clientX, clientY: e.clientY,
                preventDefault: () => { }, stopPropagation: () => e.stopPropagation()
            });
        }
    },

    _handleKeyDown(e) {
        // Skip global shortcuts if user is typing in an input or textarea
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        this._state.keysPressed.add(e.code);
        this._updateModifiers(e);

        // CRITICAL FIX: Normalize the combo using the same function as registration
        // This fixes mismatch between 'controlkey+keyz' (registered) and 'controlleft+keyz' (detected)
        const rawCombo = Array.from(this._state.keysPressed).sort().join('+').toLowerCase();
        const combo = this._normalizeDetectedCombo(rawCombo);
        const shortcut = this._shortcuts.get(combo);

        if (shortcut) {
            e.preventDefault();
            console.log(`[InputManager] Shortcut executed: ${shortcut.actionName} (combo: ${combo})`);
            shortcut.callback(InputUtils.normalizeKeyEvent(e));
            return;
        }

        if (this._handlers.onKeyDown) this._handlers.onKeyDown(InputUtils.normalizeKeyEvent(e));
    },

    /**
     * Normalize detected combo from e.code values
     * Converts things like 'controlleft+keyz' to 'control+z' to match registered shortcuts
     * @private
     */
    _normalizeDetectedCombo(rawCombo) {
        let normalized = rawCombo;

        // Convert key code aliases to simple forms
        // ControlLeft/ControlRight -> control, ShiftLeft/ShiftRight -> shift, etc.
        normalized = normalized.replace(/\b(controlleft|controlright)\b/g, 'control');
        normalized = normalized.replace(/\b(shiftleft|shiftright)\b/g, 'shift');
        normalized = normalized.replace(/\b(altleft|altright)\b/g, 'alt');
        normalized = normalized.replace(/\b(metaleft|metaright)\b/g, 'meta');

        // Convert KeyX format to just X
        // keyz -> z, key1 -> 1, etc.
        normalized = normalized.replace(/\bkey([a-z0-9])\b/g, '$1');

        // Convert Digit format to just the number
        // digit1 -> 1, etc.
        normalized = normalized.replace(/\bdigit([0-9])\b/g, '$1');

        return normalized;
    },

    _handleKeyUp(e) {
        this._state.keysPressed.delete(e.code);
        this._updateModifiers(e);
        if (this._handlers.onKeyUp) this._handlers.onKeyUp(InputUtils.normalizeKeyEvent(e));
    },

    _handleResize(e) { if (this._handlers.onResize) this._handlers.onResize(e); },

    _updateModifiers(e) {
        this._state.activeModifiers.clear();
        if (e.ctrlKey || e.metaKey) this._state.activeModifiers.add('ctrl');
        if (e.altKey) this._state.activeModifiers.add('alt');
        if (e.shiftKey) this._state.activeModifiers.add('shift');
    },

    /**
     * Listeners Management
     */
    _setupListeners() {
        if (!this._element) return;
        this._boundHandlers = {
            mouseDown: this._handleMouseDown.bind(this),
            mouseMove: this._handleMouseMove.bind(this),
            doubleClick: this._handleDoubleClick.bind(this),
            mouseUp: this._handleMouseUp.bind(this),
            wheel: this._handleWheel.bind(this),
            keyDown: this._handleKeyDown.bind(this),
            keyUp: this._handleKeyUp.bind(this),
            resize: this._handleResize.bind(this)
        };

        const el = this._element;
        el.addEventListener('mousedown', this._boundHandlers.mouseDown);
        el.addEventListener('mousemove', this._boundHandlers.mouseMove);
        el.addEventListener('dblclick', this._boundHandlers.doubleClick);
        el.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
        el.addEventListener('contextmenu', e => e.preventDefault());

        if (this._windowMouseUp) window.addEventListener('mouseup', this._boundHandlers.mouseUp);
        else el.addEventListener('mouseup', this._boundHandlers.mouseUp);

        window.addEventListener('keydown', this._boundHandlers.keyDown);
        window.addEventListener('keyup', this._boundHandlers.keyUp);
        window.addEventListener('resize', this._boundHandlers.resize);
    },

    _cleanup() {
        if (!this._element || !this._boundHandlers.mouseDown) return;
        const el = this._element;
        el.removeEventListener('mousedown', this._boundHandlers.mouseDown);
        el.removeEventListener('mousemove', this._boundHandlers.mouseMove);
        el.removeEventListener('dblclick', this._boundHandlers.doubleClick);
        el.removeEventListener('mouseup', this._boundHandlers.mouseUp);
        el.removeEventListener('wheel', this._boundHandlers.wheel);

        window.removeEventListener('mouseup', this._boundHandlers.mouseUp);
        window.removeEventListener('keydown', this._boundHandlers.keyDown);
        window.removeEventListener('keyup', this._boundHandlers.keyUp);
        window.removeEventListener('resize', this._boundHandlers.resize);

        this._element = null;
        this._shortcuts.clear();
        this._handlers = {};
        this._state.keysPressed.clear();
    }
};
