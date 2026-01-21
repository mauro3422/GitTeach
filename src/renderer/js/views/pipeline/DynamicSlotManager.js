/**
 * DynamicSlotManager.js
 * Manages dynamic repository slots for unlimited repo processing.
 * Handles dynamicRepoSlots assignments, states, and counter.
 */

export class DynamicSlotManager {
    constructor() {
        this.assignments = {};  // { 'GitTeach': 'repo_0', 'OtherRepo': 'repo_1', ... }
        this.states = {};       // { 'repo_0': { repo: 'GitTeach', filesCount: 0, status: 'detected', index: 0 } }
        this.counter = 0;       // Auto-increment counter for unique IDs
    }

    /**
     * Reset dynamic slots on initialization
     */
    reset() {
        this.assignments = {};
        this.states = {};
        this.counter = 0;
    }

    /**
     * Crea o retorna el slot asignado a un repo.
     * NO HAY LÍMITE - cada repo tiene su propio nodo.
     */
    assignRepoToSlot(repoName) {
        // Si ya está asignado, retornar el slot existente
        if (this.assignments[repoName]) {
            return this.assignments[repoName];
        }

        // Crear nuevo slot dinámico
        const slotId = `repo_${this.counter}`;
        const slotIndex = this.counter;
        this.counter++;

        this.assignments[repoName] = slotId;
        this.states[slotId] = {
            repo: repoName,
            filesCount: 0,
            status: 'detected',
            index: slotIndex
        };

        console.log(`[DynamicSlotManager] Created dynamic slot: ${slotId} for repo: ${repoName}`);
        return slotId;
    }

    /**
     * Update the state of a repo slot
     */
    updateRepoSlotState(repoName, updates) {
        const slotId = this.assignments[repoName];
        if (!slotId) return null;

        const current = this.states[slotId] || {};
        this.states[slotId] = { ...current, ...updates };

        return slotId;
    }

    /**
     * Get the state of a specific slot
     */
    getRepoSlotState(slotId) {
        return this.states[slotId] || null;
    }

    /**
     * Release a repo slot (mark as complete)
     */
    releaseRepoSlot(repoName) {
        const slotId = this.assignments[repoName];
        if (slotId && this.states[slotId]) {
            this.states[slotId].status = 'complete';
        }
    }

    /**
     * Get all dynamic slots data
     */
    getDynamicSlots() {
        return {
            assignments: this.assignments,
            states: this.states,
            counter: this.counter
        };
    }

    /**
     * Retorna todos los slots activos para renderizado
     */
    getActiveRepoSlots(nodeStates, nodeStats) {
        return Object.entries(this.states)
            .filter(([_, state]) => state !== null)
            .map(([slotId, state]) => ({
                slotId,
                ...state,
                nodeState: nodeStates[slotId] || 'idle',
                nodeStats: nodeStats[slotId] || {}
            }));
    }

    /**
     * Check if a repo has an assigned slot
     */
    hasAssignedSlot(repoName) {
        return !!this.assignments[repoName];
    }

    /**
     * Get slot ID for a repo
     */
    getSlotForRepo(repoName) {
        return this.assignments[repoName] || null;
    }

    /**
     * Get total number of active slots
     */
    getActiveSlotCount() {
        return Object.keys(this.states).length;
    }
}

export const dynamicSlotManager = new DynamicSlotManager();
