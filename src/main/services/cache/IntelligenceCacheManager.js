import { FileStorage } from './FileStorage.js';

/**
 * IntelligenceCacheManager - Manages high-level AI analysis artifacts
 */
export class IntelligenceCacheManager {
    constructor(paths) {
        this.paths = paths;
        this.memory = {
            identity: FileStorage.loadJson(paths.identity, {}),
            profile: FileStorage.loadJson(paths.profile, {}),
            evidence: FileStorage.loadJson(paths.evidence, {})
        };
    }

    setIdentity(username, identity) {
        this.memory.identity[username] = { identity, updatedAt: new Date().toISOString() };
        FileStorage.saveJson(this.paths.identity, this.memory.identity);
    }

    getIdentity(username) {
        return this.memory.identity[username]?.identity || null;
    }

    setFindings(username, evidence) {
        this.memory.evidence[username] = { evidence, updatedAt: new Date().toISOString() };
        FileStorage.saveJson(this.paths.evidence, this.memory.evidence);
    }

    getFindings(username) {
        return this.memory.evidence[username]?.evidence || null;
    }

    setProfile(username, profile) {
        this.memory.profile[username] = { ...profile, username, lastUpdated: new Date().toISOString() };
        FileStorage.saveJson(this.paths.profile, this.memory.profile);
    }

    getProfile(username) {
        return this.memory.profile[username] || null;
    }

    clear() {
        this.memory = { identity: {}, profile: {}, evidence: {} };
        [this.paths.identity, this.paths.profile, this.paths.evidence].forEach(p => FileStorage.deleteFile(p));
    }
}
