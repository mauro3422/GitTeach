import {
  IncrementalJevSemanticProvider,
  PROJECT_SEMANTIC_CONTEXT_KEY,
  PROJECT_SEMANTIC_QUESTION
} from './IncrementalJevSemantics.js';

export class JevSemanticProvider {
  constructor({
    judge,
    providerPolicyKey = 'provider-neutral-project-semantics-v1',
    semanticContextKey = PROJECT_SEMANTIC_CONTEXT_KEY,
    question = PROJECT_SEMANTIC_QUESTION
  }) {
    if (typeof judge !== 'function') {
      throw new Error('JevSemanticProvider requires a judge function.');
    }
    this.runner = new IncrementalJevSemanticProvider({
      judge,
      providerPolicyKey,
      semanticContextKey,
      question
    });
  }

  async inferProjectSemantics({ repository, evidence, candidates = [], candidateEvidenceRefs = null }) {
    if (!repository?.name) throw new Error('repository.name is required.');
    if (!Array.isArray(evidence) || evidence.length === 0 || candidates.length === 0) return [];
    const result = await this.runner.inferProjectSemantics({
      repository,
      evidence,
      candidates,
      candidateEvidenceRefs,
      previousObservations: []
    });
    return result.claims;
  }

  // Compatibility alias for callers built before the fact/semantic/attribution split.
  async inferSkills(args) {
    return this.inferProjectSemantics(args);
  }
}
