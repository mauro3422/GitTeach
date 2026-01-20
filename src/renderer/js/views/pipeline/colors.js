/**
 * colors.js
 * Centralized UI color definitions for the pipeline visualizer.
 * Extracted from CSS and constants to improve maintainability.
 */

export const UI_COLORS = {
    // Node State Colors
    NEUTRAL: '#8b949e',
    NEUTRAL_ACTIVE: '#58a6ff',
    GREEN: '#3fb950',
    GREEN_ACTIVE: '#56d364',
    BLUE: '#2f81f7',
    BLUE_ACTIVE: '#58a6ff',
    YELLOW: '#f1e05a',
    YELLOW_ACTIVE: '#f8e96b',
    PURPLE: '#a371f7',
    PURPLE_ACTIVE: '#bc8cff',
    RED: '#da3633',
    RED_ACTIVE: '#f85149',

    // Event-specific Colors
    DISPATCHING: '#388bfd',
    RECEIVING: '#56d364',

    // Status Colors
    IDLE: '#8b949e',
    ACTIVE: '#3fb950',
    ERROR: '#ff7b72',
    PAUSED: '#f1e05a',
    STEPPING: '#2f81f7'
};
