/**
 * SystemEventStrategies.js
 * Event handlers for system-level pipeline events.
 */

import { PipelineStateManager } from '../PipelineStateManager.js';
import { UI_COLORS } from '../colors.js';

export const SystemEventStrategies = {
    'mixer:gate:locked': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['mixing_buffer'];
        stats.isGateLocked = true;
        stats.sublabel = `🔒 Threshold: ${entry.payload.rich || 0}/5`;
        return { nodeId: 'mixing_buffer', status: 'waiting' };
    },

    'mixer:gate:unlocked': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['mixing_buffer'];
        stats.isGateLocked = false;
        stats.sublabel = `🔓 Masa Crítica!`;
        spawnParticles('mixing_buffer', UI_COLORS.GREEN);
        return { nodeId: 'mixing_buffer', status: 'active' };
    },

    'dna:radar:update': function (entry, spawnParticles, spawnTravelingPackage) {
        // Pulse satellites
        ['radar_adopt', 'radar_trial', 'radar_assess', 'radar_hold'].forEach(id => {
            spawnParticles('intelligence', UI_COLORS.PURPLE_ACTIVE, id);
        });
        return { nodeId: 'intelligence', status: 'active' };
    },

    'system:reaction': function (entry, spawnParticles, spawnTravelingPackage) {
        spawnParticles('intelligence', UI_COLORS.CYAN || '#00FFFF');
        return { nodeId: 'intelligence', status: 'active' };
    },

    'embedding:start': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['embedding_server'];
        const states = PipelineStateManager.nodeStates;

        states['embedding_server'] = 'active';
        stats.count = (stats.count || 0) + 1;
        stats.status = 'processing';
        stats.currentLabel = `Embedding...`;

        spawnParticles('embedding_server', UI_COLORS.PURPLE_ACTIVE);
        spawnTravelingPackage('auditor', 'embedding_server', 'METADATA');

        return { nodeId: 'embedding_server', status: 'active' };
    },

    'embedding:end': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['embedding_server'];
        const states = PipelineStateManager.nodeStates;

        states['embedding_server'] = 'idle';
        stats.status = entry.payload?.success ? 'done' : 'error';
        stats.currentLabel = entry.payload?.success ? '✓ Embedded' : '✗ Failed';

        return { nodeId: 'embedding_server', status: 'idle' };
    },

    'persist:blueprint': function (entry, spawnParticles, spawnTravelingPackage) {
        // Partial synthesis result
        spawnTravelingPackage('mixing_buffer', 'persistence', 'BLUEPRINT');
        return { nodeId: 'persistence', status: 'receiving' };
    },

    'context:injected': function (entry, spawnParticles, spawnTravelingPackage) {
        // Feedback Loop closure
        spawnTravelingPackage('intelligence', 'api_fetch', 'CONTEXT_DNA');
        spawnParticles('api_fetch', UI_COLORS.PURPLE_ACTIVE);
        return { nodeId: 'api_fetch', status: 'active' };
    },

    'file:skeletonized': function (entry, spawnParticles, spawnTravelingPackage) {
        // Fast neutral package (Bypasses Workers)
        spawnTravelingPackage('auditor', 'mixing_buffer', 'RAW_FILE');
        return { nodeId: 'mixing_buffer', status: 'receiving' };
    },

    'file:discarded': function (entry, spawnParticles, spawnTravelingPackage) {
        const stats = PipelineStateManager.nodeStats['discard_bin'];
        stats.count = (stats.count || 0) + 1;
        stats.currentLabel = entry.payload.reason || 'Filtered';

        spawnTravelingPackage('auditor', 'discard_bin', 'RAW_FILE');
        spawnParticles('discard_bin', UI_COLORS.RED);

        return { nodeId: 'discard_bin', status: 'receiving' };
    }
};
