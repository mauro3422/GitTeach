import { Logger } from '../../utils/logger.js';

/**
 * ProgressReporter - Handles console throttling and progress callbacks
 */
export class ProgressReporter {
    constructor() {
        this.onProgress = null;
        this._lastLoggedMilestone = -1;
        this._progressMilestones = [0, 25, 50, 75, 100];
    }

    report(type, message, inventory, extra = {}) {
        // --- CORTAFUEGOS DE SILENCIO (v14.0) ---
        if (window.AI_OFFLINE) return;

        // THROTTLE: Only log Progress at key milestones (0%, 25%, 50%, 75%, 100%)
        if (type === 'Progress' || type === 'Progreso') {
            const currentPercent = extra.percent || 0;
            const nextMilestone = this._progressMilestones.find(m => m >= currentPercent && m > this._lastLoggedMilestone);

            if (nextMilestone !== undefined && currentPercent >= nextMilestone) {
                this._lastLoggedMilestone = nextMilestone;
                console.log(`📊 [Progress] ${inventory.analyzedFiles}/${inventory.totalFiles} (${currentPercent}%)`);
            }
            // Always fire callback for UI updates (but don't log to console)
            if (this.onProgress) {
                this.onProgress({ type, message, ...extra });
            }
            return;
        }

        const log = `[Coordinator] ${type}: ${message}`;

        if (this.onProgress) {
            this.onProgress({ type, message, ...extra });
        }
        Logger.info('Coordinator', `${type}: ${message}`);
    }
}
