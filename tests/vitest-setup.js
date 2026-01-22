/**
 * vitest-setup.js
 * Global setup file for Vitest tests
 * Sets up DOM mocks before any module imports
 */

import { vi } from 'vitest';

// Mock window for Node.js environment
if (typeof window === 'undefined') {
    global.window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        __GITEACH_COLOR_CACHE__: new Map()
    };
}

// Mock document
if (typeof document === 'undefined') {
    global.document = {
        getElementById: vi.fn(() => null),
        createElement: vi.fn(() => ({
            style: {},
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        })),
        body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
        }
    };
}

// Mock WheelEvent
if (typeof WheelEvent === 'undefined') {
    global.WheelEvent = {
        DOM_DELTA_PIXEL: 0,
        DOM_DELTA_LINE: 1,
        DOM_DELTA_PAGE: 2
    };
}

console.log('[vitest-setup] Global DOM mocks initialized');
