import { PROFILE_DECLARATION_CATEGORIES, validateProfileDeclaration } from './ProfileDeclaration.js';
import { PROFILE_RECONCILIATION_SCHEMA } from './ProfileReconciliation.js';

export const PROFILE_INTERVIEW_PLAN_SCHEMA = 'giteach-profile-interview-plan-v1';
export const PROFILE_INTERVIEW_QUESTION_KINDS = Object.freeze([
  'fill-profile-gap',
  'clarify-unobserved-declaration',
  'reconcile-ambiguity',
  'confirm-observed-pattern'
]);
export const DEFAULT_PROFILE_INTERVIEW_CATEGORIES = Object.freeze([
  'role',
  'intent',
  'responsibility',
  'ai-workflow',
  'career-context'
]);

const CATEGORY_SET = new Set(PROFILE_DECLARATION_CATEGORIES);
const CORROBORATABLE_DECLARATION_CATEGORIES = new Set(['capability', 'development-tendency']);

function normalizedStrings(values = []) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function questionId(parts) {
  return parts.map((part) => String(part ?? '').trim().toLowerCase()).join(':');
}

export function planProfileInterview({
  actorKey,
  declarations = [],
  reconciliation,
  requiredCategories = DEFAULT_PROFILE_INTERVIEW_CATEGORIES
} = {}) {
  const subject = String(actorKey ?? '').trim();
  if (!subject) throw new Error('actorKey is required.');
  if (!Array.isArray(declarations) || !Array.isArray(requiredCategories)) {
    throw new Error('declarations and requiredCategories must be arrays.');
  }
  if (reconciliation?.schema !== PROFILE_RECONCILIATION_SCHEMA || reconciliation.actorKey !== subject) {
    throw new Error('A reconciliation for the same actor is required.');
  }

  const ownDeclarations = declarations.map(validateProfileDeclaration).filter((item) => item.actorKey === subject);
  const required = normalizedStrings(requiredCategories);
  for (const category of required) {
    if (!CATEGORY_SET.has(category)) throw new Error(`Unsupported required declaration category: ${category}`);
  }

  const questions = [];
  for (const category of required) {
    if (!ownDeclarations.some((item) => item.category === category)) {
      questions.push({
        id: questionId(['gap', category]),
        kind: 'fill-profile-gap',
        category,
        subjectKey: null,
        sourceStatus: null,
        declarationIds: [],
        evidenceRefs: []
      });
    }
  }

  for (const item of reconciliation.items) {
    if (item.status === 'ambiguous') {
      questions.push({
        id: questionId(['reconcile', item.key]),
        kind: 'reconcile-ambiguity',
        category: null,
        subjectKey: item.key,
        sourceStatus: item.status,
        declarationIds: normalizedStrings(item.declarationIds),
        evidenceRefs: normalizedStrings([...item.observedSupportRefs, ...item.observedContradictionRefs])
      });
    } else if (item.status === 'declared-not-observable') {
      const declaredCategories = ownDeclarations
        .filter((declaration) => item.declarationIds.includes(declaration.id))
        .map((declaration) => declaration.category);
      if (declaredCategories.some((category) => CORROBORATABLE_DECLARATION_CATEGORIES.has(category))) {
        questions.push({
          id: questionId(['clarify', item.key]),
          kind: 'clarify-unobserved-declaration',
          category: declaredCategories.find((category) => CORROBORATABLE_DECLARATION_CATEGORIES.has(category)) ?? null,
          subjectKey: item.key,
          sourceStatus: item.status,
          declarationIds: normalizedStrings(item.declarationIds),
          evidenceRefs: []
        });
      }
    } else if (item.status === 'observed-undeclared') {
      const observedCategory = item.sourceClasses.includes('cross-project-tendency') ? 'development-tendency' : 'capability';
      questions.push({
        id: questionId(['confirm', item.key]),
        kind: 'confirm-observed-pattern',
        category: observedCategory,
        subjectKey: item.key,
        sourceStatus: item.status,
        declarationIds: [],
        evidenceRefs: normalizedStrings(item.observedSupportRefs)
      });
    }
  }

  questions.sort((a, b) => a.id.localeCompare(b.id));
  return Object.freeze({
    schema: PROFILE_INTERVIEW_PLAN_SCHEMA,
    actorKey: subject,
    questions: Object.freeze(questions.map((question) => Object.freeze({
      ...question,
      declarationIds: Object.freeze(question.declarationIds),
      evidenceRefs: Object.freeze(question.evidenceRefs)
    })))
  });
}
