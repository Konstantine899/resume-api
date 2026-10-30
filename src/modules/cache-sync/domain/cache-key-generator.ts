/**
 * Generates a cache key based on entity type and entity ID
 * @param entityType The type of entity (e.g., 'User', 'Project')
 * @param entityId The ID of the entity
 * @param namespace Optional namespace to prefix the key with
 * @returns A formatted cache key string
 */
export function generateCacheKey(
  entityType: string,
  entityId: string,
  namespace: string = 'public-site',
): string {
  if (!entityType || !entityId) {
    throw new Error('Entity type and ID must be provided');
  }

  // Normalize inputs to prevent cache key collisions
  const normalizedType = entityType.trim().toLowerCase();
  const normalizedId = entityId.trim();

  if (!normalizedType || !normalizedId) {
    throw new Error('Entity type and ID must not be empty after trimming');
  }

  return `${namespace}:${normalizedType}:${normalizedId}`;
}
