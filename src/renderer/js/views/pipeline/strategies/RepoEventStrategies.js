/**
 * RepoEventStrategies.js
 * Event handling strategies for repository-related pipeline events
 */

import { UI_COLORS } from '../colors.js';
import { PipelineStateManager } from '../PipelineStateManager.js';
import { PipelineEventHandler } from '../PipelineEventHandler.js';

export const RepoEventStrategies = {
    'repo:detected': function (entry, spawnParticles, spawnTravelingPackage) {
        const slotId = PipelineStateManager.assignRepoToSlot(entry.payload.repo);
        if (slotId) {
            PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'detected');
        }

        // Phase C: Pulse data_source as visual entry point
        const dataSourceStats = PipelineStateManager.nodeStats['data_source'];
        dataSourceStats.count = (dataSourceStats.count || 0) + 1;
        dataSourceStats.currentLabel = entry.payload.repo;
        PipelineStateManager.nodeStates['data_source'] = 'active';
        spawnParticles('data_source', UI_COLORS.NEUTRAL_ACTIVE);
        spawnTravelingPackage('data_source', 'api_fetch', 'RAW_FILE');

        return { nodeId: slotId, status: 'detected', isDynamic: true };
    },

    'repo:tree:fetched': function (entry, spawnParticles, spawnTravelingPackage) {
        const slotId = PipelineStateManager.updateRepoSlotState(entry.payload.repo, {
            filesCount: entry.payload.filesCount,
            status: 'fetched'
        });
        if (slotId) {
            PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'fetched');
        }
        return { nodeId: slotId, status: 'fetched', isDynamic: true };
    },

    'repo:files:extracting': function (entry, spawnParticles, spawnTravelingPackage) {
        const slotId = PipelineStateManager.updateRepoSlotState(entry.payload.repo, {
            status: 'extracting'
        });
        if (slotId) {
            PipelineEventHandler.handleDynamicRepoNode(slotId, entry.payload, 'extracting');
            spawnTravelingPackage(slotId, 'auditor', 'RAW_FILE');
        }
        return { nodeId: slotId, status: 'extracting', isDynamic: true };
    },

    'repo:complete': function (entry, spawnParticles, spawnTravelingPackage) {
        PipelineStateManager.releaseRepoSlot(entry.payload.repo);
        return { nodeId: 'cache', status: 'complete', isDynamic: true };
    }
};
