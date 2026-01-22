
import { Store } from '../../../../core/Store.js';

class DesignerStoreClass extends Store {
    constructor() {
        super({
            nodes: {},
            connections: [],
            navigation: {
                panOffset: { x: 0, y: 0 },
                zoomScale: 1.5
            },
            interaction: {
                mode: 'DRAG', // 'DRAG' | 'DRAW' | 'RESIZE'
                hoveredNodeId: null,
                selectedNodeId: null,
                draggingNodeId: null,
                resizingNodeId: null
            },
            // Debug / Dev flags
            debug: {
                showStartupLogs: true
            }
        });
    }

    // --- Actions ---

    /**
     * Set the entire node set (e.g. from file load)
     */
    setNodes(nodes) {
        this.setState({ nodes: { ...nodes } }, 'SET_NODES');
        this.validateAndCleanup();
    }

    /**
     * Update a single node or multiple nodes
     */
    updateNodes(nodeUpdates) {
        const nextNodes = { ...this.state.nodes, ...nodeUpdates };
        this.setState({ nodes: nextNodes }, 'UPDATE_NODES');
    }

    setConnections(connections) {
        this.setState({ connections: [...connections] }, 'SET_CONNECTIONS');
    }

    setInteractionState(partialState) {
        this.setState({
            interaction: { ...this.state.interaction, ...partialState }
        }, 'INTERACTION_UPDATE');
    }

    setNavigationState(partialState) {
        this.setState({
            navigation: { ...this.state.navigation, ...partialState }
        }, 'NAVIGATION_UPDATE');
    }

    /**
     * Override setState for deep merging interaction/navigation if passed directly at root,
     * maintaining backward compatibility but encouraging use of specific actions.
     */
    setState(updates, actionName = 'DESIGNER_UPDATE') {
        const nextState = { ...this.state };
        let hasChanges = false;

        if (updates.nodes) {
            nextState.nodes = { ...updates.nodes };
            hasChanges = true;
        }
        if (updates.connections) {
            nextState.connections = [...updates.connections];
            hasChanges = true;
        }
        if (updates.navigation) {
            nextState.navigation = { ...nextState.navigation, ...updates.navigation };
            hasChanges = true;
        }
        if (updates.interaction) {
            nextState.interaction = { ...nextState.interaction, ...updates.interaction };
            hasChanges = true;
        }

        // Allow other keys
        Object.keys(updates).forEach(key => {
            if (!['nodes', 'connections', 'navigation', 'interaction'].includes(key)) {
                nextState[key] = updates[key];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            super.setState(nextState, actionName);
        }
    }

    /**
     * Validation and Cleanup (Issue #5 & #7)
     */
    validateAndCleanup() {
        const state = this.getState();
        const nodeIds = Object.keys(state.nodes);
        let hasChanges = false;

        // 1. Connection integrity
        const newConnections = state.connections.filter(c =>
            nodeIds.includes(c.from) && nodeIds.includes(c.to)
        );

        if (newConnections.length !== state.connections.length) {
            console.warn('[DesignerStore] Removed orphaned connections');
            hasChanges = true;
        }

        // 2. Parent integrity
        const newNodes = { ...state.nodes };
        let nodesChanged = false;
        Object.values(newNodes).forEach(node => {
            if (node.parentId && !nodeIds.includes(node.parentId)) {
                console.warn(`[DesignerStore] Removing invalid parentId ${node.parentId} from ${node.id}`);
                node.parentId = null;
                nodesChanged = true;
            }
        });

        if (hasChanges || nodesChanged) {
            // We use the internal setState logic to trigger avoiding infinite loops if carefully managed
            // but strictly we should just emit. Here we do an atomic update.
            this.setState({
                connections: newConnections,
                nodes: newNodes
            }, 'VALIDATION_CLEANUP');
        }
    }
}

export const DesignerStore = new DesignerStoreClass();
