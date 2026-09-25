import { createProfileDeclaration } from './ProfileDeclaration.js';
import { PROFILE_INTERVIEW_PLAN_SCHEMA } from './ProfileInterviewPlan.js';

export const PROFILE_INTERVIEW_PROMPT_SCHEMA = 'giteach-profile-interview-prompt-v1';

const GAP_TEXT = Object.freeze({
  role: 'How would you describe your current role or the kind of developer you are today?',
  intent: 'What kind of software work do you want to focus on next?',
  responsibility: 'What responsibilities do you usually take when carrying a software project forward?',
  'ai-workflow': 'How do you use AI in your development workflow, and what parts do you personally direct, review or verify?',
  'career-context': 'What career context would help explain where your current projects fit in your professional path?',
  education: 'What education or learning background do you want represented in your profile?',
  capability: 'Which capability would you like to add context for?',
  'development-tendency': 'Which recurring development tendency would you like to describe?'
});

const GAP_KEYS = Object.freeze({
  role: 'current-role',
  intent: 'career-intent',
  responsibility: 'project-responsibility',
  'ai-workflow': 'ai-workflow',
  'career-context': 'career-context',
  education: 'education-background',
  capability: 'capability',
  'development-tendency': 'development-tendency'
});

function requiredString(value, field, maxLength = 500) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters.`);
  return normalized;
}

function validatePlan(plan) {
  if (!plan || plan.schema !== PROFILE_INTERVIEW_PLAN_SCHEMA || typeof plan.actorKey !== 'string' || !Array.isArray(plan.questions)) {
    throw new Error(`Expected ${PROFILE_INTERVIEW_PLAN_SCHEMA}.`);
  }
  return plan;
}

function questionText(question) {
  const subject = String(question.subjectKey ?? '').trim();
  switch (question.kind) {
    case 'fill-profile-gap':
      return GAP_TEXT[question.category] ?? `What context would you like to add for ${question.category ?? 'this profile area'}?`;
    case 'clarify-unobserved-declaration':
      return `You declared ${subject}, but it is not observable in the connected evidence. How does ${subject} fit your experience?`;
    case 'reconcile-ambiguity':
      return `I found conflicting information about ${subject}. What should your profile say about it today?`;
    case 'confirm-observed-pattern':
      return question.category === 'development-tendency'
        ? `Across your connected projects I observe a recurring ${subject} pattern. Is this a deliberate part of how you work?`
        : `The connected evidence repeatedly supports ${subject}. How would you describe your experience with it?`;
    default:
      throw new Error(`Unsupported interview question kind: ${question.kind}`);
  }
}

export function renderProfileInterviewPrompts(plan) {
  validatePlan(plan);
  return Object.freeze(plan.questions.map((question) => Object.freeze({
    schema: PROFILE_INTERVIEW_PROMPT_SCHEMA,
    id: `prompt:${question.id}`,
    questionId: requiredString(question.id, 'question.id', 200),
    actorKey: plan.actorKey,
    kind: question.kind,
    category: question.category ?? null,
    subjectKey: question.subjectKey ?? null,
    text: questionText(question),
    evidenceRefs: Object.freeze([...(question.evidenceRefs ?? [])]),
    declarationIds: Object.freeze([...(question.declarationIds ?? [])])
  })));
}

export function profileInterviewAnswerToDeclaration({
  actorKey,
  question,
  answer,
  answeredAt = new Date().toISOString(),
  publicationStatus = 'private',
  repositories = [],
  categoryOverride = null,
  keyOverride = null
} = {}) {
  const subject = requiredString(actorKey, 'actorKey', 160);
  if (!question || typeof question !== 'object') throw new Error('question is required.');
  const questionId = requiredString(question.id, 'question.id', 200);
  const value = requiredString(answer, 'answer', 500);
  const category = categoryOverride ?? question.category;
  if (!category) throw new Error('Interview answer requires a declaration category.');

  const subjectKey = String(keyOverride ?? question.subjectKey ?? GAP_KEYS[category] ?? category).trim().toLowerCase();
  if (!subjectKey) throw new Error('Interview answer requires a declaration key.');

  return createProfileDeclaration({
    actorKey: subject,
    category,
    key: subjectKey,
    value,
    sourceKind: 'user-answer',
    sourceRef: `interview:${questionId}`,
    declaredAt: answeredAt,
    publicationStatus,
    repositories
  });
}
