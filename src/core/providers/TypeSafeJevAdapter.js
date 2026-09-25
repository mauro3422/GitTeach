const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';
const DECISION_CONTRACT = 'typesafe-jev-project-semantic-noul-v2';

function normalizeCandidates(candidates) {
  return [...new Set((candidates ?? []).map((value) => String(value).trim()).filter(Boolean))];
}

function buildQuestions(candidates, candidateEvidenceRefs = {}, question) {
  return Object.fromEntries(candidates.map((skill, index) => [
    `skill_${index}`,
    {
      type: 'noul',
      instructions: {
        question: String(question ?? '').trim(),
        candidate_capability: skill,
        evidence_refs: candidateEvidenceRefs[skill] ?? [],
        constraints: [
          'Judge only the supplied evidence.',
          'When evidence_refs is non-empty, judge this candidate only from those evidence refs.',
          'When evidence_refs is empty, do not treat unrelated evidence as positive support.',
          'Do not infer seniority, expertise level, or unsupported adjacent capabilities.'
        ]
      },
      criteria: {
        true: 'The supplied repository evidence directly supports this project capability or characteristic.',
        false: 'The supplied repository evidence does not directly support this project capability or characteristic.'
      }
    }
  ]));
}

export class TypeSafeJevAdapter {
  constructor({
    apiKey = process.env.TYPESAFE_API_KEY,
    fetchImpl = globalThis.fetch,
    endpoint = DEFAULT_ENDPOINT,
    model = DEFAULT_MODEL,
    timeoutMs = 10_000,
    acceptThreshold = 0.75,
    observedAt = () => new Date().toISOString()
  } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('TypeSafeJevAdapter requires fetch.');
    if (!Number.isFinite(acceptThreshold) || acceptThreshold < 0 || acceptThreshold > 1) {
      throw new Error('acceptThreshold must be between 0 and 1.');
    }
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.endpoint = endpoint;
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.acceptThreshold = acceptThreshold;
    this.observedAt = observedAt;
  }

  getSemanticPolicyKey() {
    return `typesafe:${DECISION_CONTRACT}:${this.model}:threshold=${this.acceptThreshold}`;
  }

  async judge({ state }) {
    if (state?.schema !== 'giteach-jev-bounded-v1') {
      throw new Error('TypeSafeJevAdapter requires giteach-jev-bounded-v1 state.');
    }
    const candidates = normalizeCandidates(state.candidates);
    if (candidates.length === 0) {
      return { provider: 'typesafe', model: this.model, abstain: true, reason: 'no-candidates' };
    }
    if (!this.apiKey) throw new Error('TYPESAFE_API_KEY is required for live TypeSafe calls.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          state: {
            repository: state.repository,
            evidence: state.evidence,
            candidateEvidenceRefs: state.candidateEvidenceRefs ?? {}
          },
          questions: buildQuestions(candidates, state.candidateEvidenceRefs ?? {}, state.question)
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('TypeSafe request timed out.');
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const error = new Error(`TypeSafe request failed with HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || !payload.answers || typeof payload.answers !== 'object') {
      throw new Error('TypeSafe response is missing answers.');
    }

    const allEvidenceRefs = state.evidence.map((item) => item.ref);
    const claims = [];
    for (const [index, skill] of candidates.entries()) {
      const answer = payload.answers[`skill_${index}`];
      if (!answer || answer.type !== 'noul' || !Number.isFinite(Number(answer.noul))) {
        throw new Error(`TypeSafe response has malformed Noul answer for skill_${index}.`);
      }
      const probability = Number(answer.noul);
      if (probability < 0 || probability > 1) {
        throw new Error(`TypeSafe Noul probability is outside [0,1] for skill_${index}.`);
      }
      const hasCandidateSpecificRefs = Object.hasOwn(state.candidateEvidenceRefs ?? {}, skill);
      const candidateRefs = state.candidateEvidenceRefs?.[skill] ?? [];
      if (probability >= this.acceptThreshold && (!hasCandidateSpecificRefs || candidateRefs.length > 0)) {
        const evidenceRefs = hasCandidateSpecificRefs ? candidateRefs : allEvidenceRefs;
        claims.push({
          skill,
          confidence: probability,
          evidenceRefs,
          distribution: { supported: probability, unsupported: 1 - probability }
        });
      }
    }

    return {
      provider: 'typesafe',
      requestedModel: this.model,
      model: payload.model ?? this.model,
      responseId: response.headers?.get?.('x-request-id') ?? null,
      observedAt: this.observedAt(),
      usage: payload.usage ?? null,
      abstain: claims.length === 0,
      reason: claims.length === 0 ? 'no-candidate-met-threshold' : null,
      claims
    };
  }
}

export {
  DEFAULT_ENDPOINT as TYPESAFE_SYSTEM_ONE_ENDPOINT,
  DEFAULT_MODEL as TYPESAFE_DEFAULT_MODEL,
  DECISION_CONTRACT as TYPESAFE_JEV_DECISION_CONTRACT
};
