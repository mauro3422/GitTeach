/**
 * TracerFleetRenderer.js
 * Responsabilidad única: Renderizar el estado del fleet
 */

export const TracerFleetRenderer = {
    domCache: null,

    /**
     * Initialize with DOM cache reference
     */
    init(domCache) {
        this.domCache = domCache;
    },

    /**
     * Render the entire fleet state
     * @param {Object} state - { 8000: { online, total_slots, slots: [] }, ... }
     */
    render(state) {
        for (const port in state) {
            const data = state[port];
            if (!data.online) {
                this.renderOffline(port);
            } else {
                this.renderLive(port, data);
            }
        }
    },

    /**
     * Render offline state for a server
     */
    renderOffline(port) {
        const container = this.domCache.getFleet(port);
        if (!container) return;

        const statusEl = container.querySelector('.fleet-status');
        const slotsContainer = container.querySelector('.slots-grid');

        if (statusEl) {
            statusEl.textContent = 'OFFLINE';
            statusEl.style.color = '#8b949e';
        }
        if (slotsContainer) {
            slotsContainer.innerHTML = '';
        }
    },

    /**
     * Render live state for a server with slots
     */
    renderLive(port, data) {
        const container = this.domCache.getFleet(port);
        if (!container) return;

        const statusEl = container.querySelector('.fleet-status');
        const slotsContainer = container.querySelector('.slots-grid');

        if (statusEl) {
            statusEl.textContent = 'LIVE';
            statusEl.style.color = '#3fb950';
            statusEl.style.fontSize = '10px';
            statusEl.style.opacity = '0.7';
        }

        // Render slots grid
        if (slotsContainer) {
            slotsContainer.innerHTML = '';
            this.renderSlots(slotsContainer, data.slots, data.total_slots);
        }
    },

    /**
     * Render individual slots
     */
    renderSlots(container, slots, totalSlots) {
        if (slots && slots.length > 0) {
            // Render actual slots
            slots.forEach(slot => {
                const dot = document.createElement('div');
                dot.className = `slot-dot ${slot.state}`;
                dot.title = `Slot ${slot.id}: ${slot.state} ${slot.n_remain > 0 ? `(${slot.n_remain} rem)` : ''}`;
                container.appendChild(dot);
            });
        } else if (totalSlots > 0) {
            // If we know total_slots but slots array is empty (server just started)
            for (let i = 0; i < totalSlots; i++) {
                const dot = document.createElement('div');
                dot.className = 'slot-dot idle';
                container.appendChild(dot);
            }
        }
    }
};
