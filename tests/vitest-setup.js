// tests/vitest-setup.js

// jsdom provides window and document, but we might need specific mocks
if (typeof window !== 'undefined') {
    window.__GITEACH_COLOR_CACHE__ = new Map();

    // Add specific browser mocks not in jsdom if needed
    if (!window.WheelEvent) {
        window.WheelEvent = class WheelEvent extends Event {
            static DOM_DELTA_PIXEL = 0;
            static DOM_DELTA_LINE = 1;
            static DOM_DELTA_PAGE = 2;
        };
    }
}

console.log('[vitest-setup] High-fidelity JSDOM environment initialized');