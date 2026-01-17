/**
 * AISlotPriorities - Priority constants for AI slot management
 * Extracted from AISlotManager to comply with SRP
 *
 * Priority levels determine queue ordering for AI calls:
 * - Lower numbers = Higher priority
 * - Used by AISlotManager for concurrency control
 */

export const AISlotPriorities = {
    URGENT: 0,    // Chat, Intent Routing (Sequential, highest priority)
    NORMAL: 1,    // AI Workers (Parallel processing)
    BACKGROUND: 2 // Deep Curation, Fidelity Summaries (Lowest priority)
};