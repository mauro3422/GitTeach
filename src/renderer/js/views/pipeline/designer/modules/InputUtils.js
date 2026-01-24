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
     * Handles aliases like 'controlkey' -> 'control' for matching both ControlLeft and ControlRight
     */
    normalizeKeyCombo(keys) {
        if (typeof keys === 'string') {
            let combo = keys.toLowerCase().replace(/\s+/g, '');

            // CRITICAL FIX: Replace key aliases to match actual e.code values
            // e.code returns things like 'ControlLeft', 'KeyZ', 'ShiftRight', etc.
            // But shortcuts registered as 'controlkey+keyz' need to match
            combo = combo.replace(/\bcontrolkey\b/g, 'control');
            combo = combo.replace(/\bshiftkey\b/g, 'shift');
            combo = combo.replace(/\baltkey\b/g, 'alt');
            combo = combo.replace(/\bmetakey\b/g, 'meta');

            // Also normalize the key codes from 'key*' format
            // e.g., 'keyz' -> 'z', 'key1' -> '1'
            combo = combo.replace(/\bkey([a-z0-9])\b/g, '$1');

            return combo;
        } else if (Array.isArray(keys)) {
            return keys.map(k => k.toLowerCase()).sort().join('+');
        }
        return '';
    }
};
