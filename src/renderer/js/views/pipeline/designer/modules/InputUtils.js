/**
 * InputUtils.js
 * Utilities for event normalization and key combo parsing
 */
export const InputUtils = {
    /**
     * Normalizes a MouseEvent for cross-browser consistency
     */
    normalizeMouseEvent(e) {
        return {
            button: e.button,
            buttons: e.buttons,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            // Polyfills for normalized events
            preventDefault: () => e.preventDefault?.(),
            stopPropagation: () => e.stopPropagation?.()
        };
    },

    /**
     * Normalizes a KeyboardEvent
     */
    normalizeKeyEvent(e) {
        return {
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            repeat: e.repeat,
            preventDefault: () => e.preventDefault?.(),
            stopPropagation: () => e.stopPropagation?.()
        };
    },

    /**
     * Normalizes a PointerEvent
     */
    normalizePointerEvent(e) {
        return {
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            clientX: e.clientX,
            clientY: e.clientY,
            pressure: e.pressure,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            preventDefault: () => e.preventDefault?.(),
            stopPropagation: () => e.stopPropagation?.()
        };
    },

    /**
     * Normalizes wheel delta across browsers (Chrome/Safari vs Firefox)
     */
    normalizeWheelDelta(e) {
        const delta = e.deltaY;
        if (e.deltaMode === 1) { // DOM_DELTA_LINE
            return delta * 16;
        } else if (e.deltaMode === 2) { // DOM_DELTA_PAGE
            return delta * 800;
        }
        return delta;
    },

    /**
     * Normalizes key combos for consistent lookup
     */
    normalizeKeyCombo(keys) {
        if (typeof keys === 'string') {
            return keys.toLowerCase().replace(/\s+/g, '');
        } else if (Array.isArray(keys)) {
            return keys.map(k => k.toLowerCase()).sort().join('+');
        }
        return '';
    }
};
