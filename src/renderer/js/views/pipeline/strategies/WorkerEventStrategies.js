/**
 * WorkerEventStrategies.js
 * Event handling strategies for worker and hub-related pipeline events
 */

import { UI_COLORS } from '../colors.js';
import { PipelineStateManager } from '../PipelineStateManager.js';

export const WorkerEventStrategies = {
    'file:cache:hit': function (entry, spawnParticles, spawnTravelingPackage) {
        // Golden Ray: Bypass AI workers
        spawnTravelingPackage('workers_hub', 'mixing_buffer', 'FRAGMENT', UI_COLORS.GOLDEN_HIT || '#FFD700');
        return { nodeId: 'mixing_buffer', status: 'receiving' };
    },

    'hub:circuit:open': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['workers_hub'];
        stats.status = 'paused';
        stats.currentLabel = '⚠️ CIRCUIT BREAKER OPEN';
        spawnParticles('workers_hub', UI_COLORS.RED);
        return { nodeId: 'workers_hub', status: 'paused' };
    },

    'hub:circuit:closed': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['workers_hub'];
        stats.status = 'active';
        stats.currentLabel = 'Worker Hub';
        return { nodeId: 'workers_hub', status: 'idle' };
    },

    'pipeline:resurrection': function (entry, spawnParticles, spawnTravelingPackage) {
        // Emergency Lane
        spawnTravelingPackage('cache', 'mixing_buffer', 'FRAGMENT', UI_COLORS.AMBER || '#FFBF00');
        return { nodeId: 'mixing_buffer', status: 'receiving' };
    }
};
