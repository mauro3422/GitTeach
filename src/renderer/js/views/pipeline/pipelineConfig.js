/**
 * pipelineConfig.js
 * Centralized configuration for pipeline constants and limits.
 * Extracted to eliminate magic numbers and improve maintainability.
 */

export const PIPELINE_CONFIG = {
    // Worker Queue Limits
    MAX_WORKER_QUEUE_SIZE: 50000,
    MAX_CODE_SNIPPET_LENGTH: 3000,

    // Animation and Timing
    ANIMATION_DURATION: 1500,
    ONE_SHOT_DURATION: 2000,
    PAUSE_POLLING_MS: 300,

    // History and Limits
    HISTORY_LIMIT: 40,
    HIGH_FIDELITY_SEED_LIMIT: 5
};
