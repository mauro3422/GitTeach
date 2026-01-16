/**
 * IntelligenceSynthesizer - Core of the identity system.
 * Synthesizes the technical personality (Identity) from curated findings (DNA).
 */
import { Logger } from '../utils/logger.js';
import { CacheRepository } from '../utils/cacheRepository.js';
import { ComparisonEngine } from './intelligence/ComparisonEngine.js';
import { EvolutionManager } from './intelligence/EvolutionManager.js';

export class IntelligenceSynthesizer {
    constructor(sessionId = null, debugLogger = null) {
        this.sessionId = sessionId;
        this.debugLogger = debugLogger;
        this.technicalProfile = null;
        this.currentUsername = null;
    }

    async loadFromDisk(username) {
        this.currentUsername = username;
        try {
            const saved = await CacheRepository.getCognitiveProfile(username);
            if (saved) {
                this.technicalProfile = saved;
                Logger.profile(`Loaded Cognitive Profile: ${saved.title}`);
                return saved;
            }
        } catch (e) {
            console.warn('[IntelligenceSynthesizer] Load error:', e);
        }
        return null;
    }

    async saveToDisk() {
        if (!this.currentUsername || !this.technicalProfile) return false;
        try {
            await CacheRepository.setCognitiveProfile(this.currentUsername, this.technicalProfile);
            return true;
        } catch (e) {
            return false;
        }
    }

    async synthesizeProfile(oldProfile, newCuration) {
        if (!newCuration) return { finalProfile: oldProfile, report: null, isSignificant: false };

        // 1. Comparison logic
        const { isSignificant, report } = ComparisonEngine.compare(oldProfile, newCuration);

        // 2. Evolution logic
        if (report.milestone === 'INITIAL_SYNTHESIS') {
            this.technicalProfile = EvolutionManager.getInitialProfile(newCuration);
            await this.saveToDisk();
            await this._log(null, newCuration, report, true);
            return { finalProfile: this.technicalProfile, report, isSignificant: true };
        }

        if (isSignificant) {
            Logger.profile("Significant evolution found. Re-synthesizing...");
            this.technicalProfile = await EvolutionManager.evolve(oldProfile, newCuration, report);
            await this.saveToDisk();
        } else {
            this.technicalProfile = oldProfile;
        }

        await this._log(oldProfile, newCuration, report, isSignificant);

        return {
            finalProfile: this.technicalProfile,
            report,
            isSignificant
        };
    }

    synthesizeBatch(batchStats) {
        return ComparisonEngine.checkBatch(batchStats);
    }

    async _log(old, fresh, report, isSignificant) {
        if (this.debugLogger) {
            this.debugLogger.logCurator('synthesis_decisions', {
                timestamp: new Date().toISOString(),
                isSignificant,
                report,
                oldBioLength: old?.bio?.length || 0,
                newBioLength: fresh?.bio?.length || 0
            });
        }
    }
}
