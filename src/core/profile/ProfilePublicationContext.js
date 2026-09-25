import { validateProfileDeclaration } from './ProfileDeclaration.js';

export const PROFILE_PUBLICATION_CONTEXT_SCHEMA = 'giteach-profile-publication-context-v1';

function requiredActorKey(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('actorKey is required.');
  return value.trim();
}

function toPublicDeclaration(declaration) {
  return Object.freeze({
    id: declaration.id,
    category: declaration.category,
    key: declaration.key,
    value: declaration.value,
    sourceKind: declaration.sourceKind,
    repositories: Object.freeze([...declaration.repositories])
  });
}

export function prepareProfilePublicationContext({ actorKey, declarations = [] } = {}) {
  const subject = requiredActorKey(actorKey);
  if (!Array.isArray(declarations)) throw new Error('declarations must be an array.');

  const approved = declarations
    .map(validateProfileDeclaration)
    .filter((declaration) => declaration.actorKey === subject && declaration.publicationStatus === 'approved')
    .sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key) || a.id.localeCompare(b.id))
    .map(toPublicDeclaration);

  return Object.freeze({
    schema: PROFILE_PUBLICATION_CONTEXT_SCHEMA,
    actorKey: subject,
    declarations: Object.freeze(approved)
  });
}
