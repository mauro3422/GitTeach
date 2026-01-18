/**
 * ComparisonEngine - Analyzes differences between old and new technical identities.
 */
export class ComparisonEngine {
    static compare(oldProfile, newCuration) {
        if (!oldProfile || !oldProfile.bio) {
            return { isSignificant: true, report: { milestone: 'INITIAL_SYNTHESIS' } };
        }

        const report = {
            newSkills: [],
            scoreChanges: [],
            newAnomalies: [],
            milestones: []
        };

        let isSignificant = false;

        // Compare Traits
        const oldTraitsMap = new Map((oldProfile.traits || []).map(t => [t.name, t.score]));
        if (newCuration.traits) {
            for (const trait of newCuration.traits) {
                const oldScore = oldTraitsMap.get(trait.name);
                if (oldScore === undefined) {
                    report.newSkills.push(trait.name);
                    isSignificant = true;
                } else if (Math.abs(trait.score - oldScore) >= 10) {
                    report.scoreChanges.push({ name: trait.name, from: oldScore, to: trait.score });
                    isSignificant = true;
                }
            }
        }

        // Compare Anomalies (Identity-based)
        const oldAnomaliesSet = new Set((oldProfile.anomalies || []).map(a => a.trait));
        if (newCuration.anomalies) {
            for (const anomaly of newCuration.anomalies) {
                if (!oldAnomaliesSet.has(anomaly.trait)) {
                    report.newAnomalies.push(anomaly);
                    isSignificant = true;
                }
            }
        }

        return { isSignificant, report };
    }

    static checkBatch(batchStats) {
        if (batchStats && batchStats.totalFindings > 5 && batchStats.domains.length > 0) {
            return {
                isSignificant: true,
                snapshot: `Evolución en curso: Detectados ${batchStats.totalFindings} hallazgos en ${batchStats.domains.join(', ')}`
            };
        }
        return { isSignificant: false };
    }
}
