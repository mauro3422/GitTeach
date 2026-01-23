/**
 * DesignerConstants.js
 * Centralized constants for the Designer module.
 * Ensures consistency across hit-testing, rendering, and layout.
 */
export const DESIGNER_CONSTANTS = {
    DIMENSIONS: {
        STICKY_NOTE: {
            MIN_W: 180,
            MIN_H: 100,
            PADDING: 15
        },
        CONTAINER: {
            MIN_W: 140,
            MIN_H: 100,
            DEFAULT_W: 180,
            DEFAULT_H: 100
        },
        GRID: {
            SIZE: 50
        },
        DEFAULT_HYDRATION_SCALE: 1200
    },
    INTERACTION: {
        HIT_THRESHOLD: 14,
        HIT_MIN: 8,
        HIT_MAX: 200, // Increased to allow 14px screen-radius at 0.1x zoom
        DROP_TARGET_SCALE: 1.10,
        RESIZE_MARGIN: 40,
        CONNECTION_HIT_BUFFER: 10,
        NODE_HIT_BUFFER: 5,
        DRAG: {
            THRESHOLD: 3,
            UNPARENT_MARGIN: 20
        },
        ZOOM: {
            MIN: 0.3,
            MAX: 4.0,
            WHEEL_THROTTLE: 16,
            IN_DELTA: 1.1,
            OUT_DELTA: 0.9
        }
    },
    LAYOUT: {
        CONTAINER_PADDING: 60,
        TITLE_CHAR_WIDTH: 13,
        TITLE_PADDING: 10,
        CHILD_OFFSET_TOP: 100,
        AUTO_GROW_PADDING: 50,
        EXTRA_HEIGHT: 40
    },
    ANIMATION: {
        ELASTIC_DAMPING: 0.15,
        ELASTIC_EPSILON: 0.5,
        TRANSITION_DAMPING: 0.85,
        PAN_DURATION: 400,
        EPSILON_PX: 1.0,
        PULSE_EPSILON: 0.5
    },
    TYPOGRAPHY: {
        BASE_FONT_SIZE: 18,
        TITLE_FONT_SIZE: 24,
        CONTAINER_FONT_SIZE: 24,
        CONTAINER_SUB_FONT_SIZE: 20,
        STICKY_FONT_SIZE: 18,
        LINE_HEIGHT_OFFSET: 6
    },
    VISUAL: {
        CONNECTION: {
            DASH_PATTERN: [5, 5],
            ACTIVE_WIDTH: 2,
            ARROW_HEAD_LEN: 10,
            RING_OFFSET: 4
        },
        GLOW: {
            NORMAL: 1.0,
            HOVER: 1.2,
            ACTIVE: 1.8,
            SELECTED: 2.0,
            MIN_BLUR: 12,
            MAX_BLUR: 60,
            BASE_BLUR: 25,
            BASE_ALPHA: 0.7
        },
        PANEL_RADIUS: {
            CONTAINER: 12,
            STICKY: 8,
            TOOLTIP: 10
        },
        BADGE: {
            SIZE: 12,
            OFFSET: 15,
            LABEL_OFFSET_Y: 25,
            NODE_BADGE_RATIO: 0.7
        },
        TOOLTIP: {
            MAX_WIDTH: 220,
            PADDING: 10,
            OFFSET: 20,
            FONT_SIZE: 15
        },
        OPACITY: {
            DEFAULT: 1.0,
            DRAGGING: 0.9,
            DIMMED_DRAG_NODE: 0.5,
            DIMMED_DRAG_CONTAINER: 0.7,
            DIMMED_DRAG_GLOBAL: 0.6,
            DIMMED_CONN_GLOBAL: 0.8,
            SATELLITE_GLOW: 0.7,
            STICKY_GLOW: 0.8,
            ACTIVE_LINE: 0.7,
            CONNECTION_DEFAULT: 0.9
        },
        BORDER: {
            RESIZING: 4.0,
            CONNECTING: 3.5,
            SELECTED: 3.0,
            HOVERED: 2.0,
            CONNECTION_SELECTED: 4.0,
            CONNECTION_DEFAULT: 2.5
        },
        TRANSITION: {
            INTERACTIVE: 150,
            DEFAULT: 200,
            MOVEMENT: 100
        }
    }
};
