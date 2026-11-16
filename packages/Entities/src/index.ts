export * from './entity-names.ts';
export * from './subtype-resolvers.ts';
export * from './generated/entity_subclasses.js';

/**
 * Forces the generated entity subclasses to be included in the build despite tree-shaking.
 * Call this from your application bootstrap.
 */
export function LoadBizAppsCommunityEntities(): void {}
