export const INCREMENTAL_PROFILE_PLAN_SCHEMA = 'giteach-incremental-profile-plan-v1';

function ids(records = []) {
  return new Set(records.map((record) => record.id).filter(Boolean));
}

export function planIncrementalProfileUpdate({ previousProfile, currentLedger }) {
  if (previousProfile?.schema !== 'giteach-developer-profile-v1') {
    throw new Error('Incremental planning requires giteach-developer-profile-v1.');
  }
  if (!currentLedger) throw new Error('Incremental planning requires a current EvidenceLedger.');

  const previousRecords = previousProfile.evidenceLedger?.records ?? [];
  const previousIds = ids(previousRecords);
  const currentIds = ids(currentLedger.list());
  const reusableSkills = [];
  const invalidatedSkills = [];

  for (const skill of previousProfile.skills ?? []) {
    const evidenceRefs = [...new Set(skill.evidenceRefs ?? [])];
    const missingEvidenceRefs = evidenceRefs.filter((ref) => !currentIds.has(ref));
    const retainedEvidenceRefs = evidenceRefs.filter((ref) => currentIds.has(ref));

    if (missingEvidenceRefs.length === 0) {
      reusableSkills.push({
        key: skill.key,
        label: skill.label,
        evidenceRefs
      });
    } else {
      invalidatedSkills.push({
        key: skill.key,
        label: skill.label,
        missingEvidenceRefs,
        retainedEvidenceRefs
      });
    }
  }

  const newEvidenceRefs = [...currentIds].filter((ref) => !previousIds.has(ref)).sort();
  const removedEvidenceRefs = [...previousIds].filter((ref) => !currentIds.has(ref)).sort();

  return Object.freeze({
    schema: INCREMENTAL_PROFILE_PLAN_SCHEMA,
    reusableSkills: Object.freeze(reusableSkills),
    invalidatedSkills: Object.freeze(invalidatedSkills),
    newEvidenceRefs: Object.freeze(newEvidenceRefs),
    removedEvidenceRefs: Object.freeze(removedEvidenceRefs),
    requiresSemanticRefresh: invalidatedSkills.length > 0,
    requiresDiscovery: newEvidenceRefs.length > 0
  });
}
