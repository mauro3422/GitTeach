import { createHash } from 'node:crypto';

export const PROFILE_DECLARATION_SCHEMA = 'giteach-profile-declaration-v1';
export const PROFILE_DECLARATION_CATEGORIES = Object.freeze([
  'role',
  'intent',
  'responsibility',
  'ai-workflow',
  'career-context',
  'education',
  'capability',
  'development-tendency'
]);
export const PROFILE_DECLARATION_SOURCE_KINDS = Object.freeze([
  'user-answer',
  'profile-import'
]);
export const PROFILE_DECLARATION_PUBLICATION_STATUSES = Object.freeze([
  'private',
  'approved'
]);

const CATEGORIES = new Set(PROFILE_DECLARATION_CATEGORIES);
const SOURCE_KINDS = new Set(PROFILE_DECLARATION_SOURCE_KINDS);
const PUBLICATION_STATUSES = new Set(PROFILE_DECLARATION_PUBLICATION_STATUSES);
const FORBIDDEN_INPUT_FIELDS = Object.freeze([
  'prompt', 'rawPrompt', 'transcript', 'rawTranscript', 'conversation',
  'accessToken', 'refreshToken', 'apiKey', 'token'
]);

function requiredString(value, field, maxLength = 500) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters.`);
  return normalized;
}

function optionalString(value, field, maxLength = 500) {
  if (value == null || value === '') return null;
  return requiredString(String(value), field, maxLength);
}

function normalizedStrings(values = []) {
  if (!Array.isArray(values)) throw new Error('repositories must be an array.');
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function declarationId(value) {
  const identity = [
    value.actorKey,
    value.category,
    value.key,
    value.value,
    value.sourceKind,
    value.sourceRef,
    value.declaredAt,
    value.authorizationRef ?? '',
    value.repositories.join('\n')
  ].join('\0');
  return createHash('sha256').update(identity).digest('hex').slice(0, 24);
}

export function createProfileDeclaration(input = {}) {
  if (input.schema && input.schema !== PROFILE_DECLARATION_SCHEMA) {
    throw new Error(`Unsupported profile declaration schema: ${input.schema}`);
  }
  for (const field of FORBIDDEN_INPUT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new Error(`Profile declarations must not contain ${field}.`);
  }

  const actorKey = requiredString(input.actorKey, 'actorKey', 160);
  const category = requiredString(input.category, 'category', 80);
  if (!CATEGORIES.has(category)) throw new Error(`Unsupported profile declaration category: ${category}`);
  const key = requiredString(input.key, 'key', 160).toLowerCase();
  const value = requiredString(input.value, 'value', 500);
  const sourceKind = requiredString(input.sourceKind, 'sourceKind', 80);
  if (!SOURCE_KINDS.has(sourceKind)) throw new Error(`Unsupported profile declaration source kind: ${sourceKind}`);
  const sourceRef = requiredString(input.sourceRef, 'sourceRef', 300);
  const declaredAt = requiredString(input.declaredAt ?? new Date().toISOString(), 'declaredAt', 80);
  const authorizationRef = optionalString(input.authorizationRef, 'authorizationRef', 300);
  if (sourceKind === 'profile-import' && !authorizationRef) {
    throw new Error('profile-import declarations require authorizationRef.');
  }
  const publicationStatus = String(input.publicationStatus ?? 'private').trim();
  if (!PUBLICATION_STATUSES.has(publicationStatus)) {
    throw new Error(`Unsupported profile declaration publication status: ${publicationStatus}`);
  }
  const repositories = normalizedStrings(input.repositories);

  const normalized = {
    schema: PROFILE_DECLARATION_SCHEMA,
    actorKey,
    category,
    key,
    value,
    sourceKind,
    sourceRef,
    declaredAt,
    authorizationRef,
    publicationStatus,
    sourceHash: optionalString(input.sourceHash, 'sourceHash', 160),
    repositories
  };
  const id = optionalString(input.id, 'id', 160) ?? declarationId(normalized);
  return Object.freeze({ id, ...normalized, repositories: Object.freeze(repositories) });
}


export function validateProfileDeclaration(input = {}) {
  if (input?.schema !== PROFILE_DECLARATION_SCHEMA) {
    throw new Error(`Unsupported profile declaration schema: ${input?.schema ?? 'missing'}`);
  }
  if (typeof input.id !== 'string' || input.id.trim() === '') throw new Error('id is required.');
  if (typeof input.declaredAt !== 'string' || input.declaredAt.trim() === '') throw new Error('declaredAt is required.');
  return createProfileDeclaration(input);
}
