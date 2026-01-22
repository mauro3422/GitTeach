/**
 * Store.js
 * Base class for centralized state management using the Observer pattern.
 * Supports selectors to minimize unnecessary re-renders.
 */

export class Store {
    constructor(initialState = {}) {
        this.state = initialState;
        this.listeners = new Set();
    }

    /**
     * Get the current state snapshot
     */
    getState() {
        return this.state;
    }

    /**
     * Subscribe to state changes.
     * @param {Function} listener - Callback function (state) => void
     * @param {Function} [selector] - Optional selector function (state) => partOfState
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener, selector = null) {
        const wrapper = { listener, selector, lastSlice: null };

        // Initialize lastSlice for selector-based subscriptions
        if (selector) {
            wrapper.lastSlice = selector(this.state);
        }

        this.listeners.add(wrapper);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(wrapper);
        };
    }

    /**
     * Update state and notify listeners.
     * @param {Object|Function} update - Partial state object or function (prevState) => partialState
     * @param {string} [actionName] - Optional action name for logging
     */
    setState(update, actionName = 'UPDATE') {
        const partialState = typeof update === 'function' ? update(this.state) : update;

        // Shallow merge
        const previousState = this.state;
        this.state = { ...this.state, ...partialState };

        this._notify(previousState, actionName);
    }

    /**
     * Internal notification logic.
     * Checks selectors to avoid unnecessary notifications.
     */
    _notify(previousState, actionName) {
        this.listeners.forEach(wrapper => {
            const { listener, selector, lastSlice } = wrapper;

            if (selector) {
                const newSlice = selector(this.state);
                // Simple strict equality check for selectors
                if (newSlice !== lastSlice) {
                    wrapper.lastSlice = newSlice;
                    listener(newSlice, this.state);
                }
            } else {
                // No selector = always notify
                listener(this.state, previousState);
            }
        });
    }

    /**
     * Reset state to initial value (or empty object)
     */
    reset(newState = {}) {
        this.state = newState;
        this._notify({}, 'RESET');
    }
}
