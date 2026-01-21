/**
 * MapperEventStrategies.js
 * Event handling strategies for mapper-related pipeline events
 */

import { UI_COLORS } from '../colors.js';
import { PipelineStateManager } from '../PipelineStateManager.js';

export const MapperEventStrategies = {
    'mapper:start': function (entry, spawnParticles, spawnTravelingPackage) {
        const mapperType = entry.payload?.mapper; // architecture | habits | stack
        const nodeId = mapperType ? `mapper_${mapperType}` : 'mapper_habits';

        const stats = PipelineStateManager.nodeStats[nodeId];
        const states = PipelineStateManager.nodeStates;

        states[nodeId] = 'active';
        stats.count = (stats.count || 0) + 1;
        stats.status = 'processing';
        stats.currentLabel = `${mapperType?.toUpperCase() || 'MAPPER'}`;
        stats.startTime = Date.now();

        spawnParticles(nodeId, UI_COLORS.YELLOW_ACTIVE);
        spawnTravelingPackage('mixing_buffer', nodeId, 'METADATA');

        return { nodeId, status: 'active' };
    },

    'mapper:end': function (entry, spawnParticles, spawnTravelingPackage) {
        const mapperType = entry.payload?.mapper;
        const nodeId = mapperType ? `mapper_${mapperType}` : 'mapper_habits';

        const stats = PipelineStateManager.nodeStats[nodeId];
        const states = PipelineStateManager.nodeStates;

        states[nodeId] = 'idle';
        stats.status = entry.payload?.success ? 'done' : 'error';
        stats.durationMs = stats.startTime ? Date.now() - stats.startTime : 0;
        stats.currentLabel = entry.payload?.success ? `✓ ${mapperType}` : `✗ ${mapperType}`;

        // Flow to DNA Synth
        spawnTravelingPackage(nodeId, 'dna_synth', 'INSIGHT');

        return { nodeId, status: 'idle' };
    }
};
