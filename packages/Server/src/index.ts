import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadBizAppsCommunityActions } from '@mj-biz-apps/community-actions';
import { LoadBizAppsCommunityCoreEntitiesServer } from '@mj-biz-apps/community-core-entities-server';
import { LoadBizAppsCommunityEntities } from '@mj-biz-apps/community-entities';
import { CommunityGraduationResolver } from './resolvers.ts';

export * from './document-blocks.ts';
export * from './resolvers.ts';
export * from './attachments.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * Resolver paths for MJAPI's TypeGraphQL schema builder (`dynamicPackages.server[]`).
 * Includes both the CodeGen-generated entity resolvers (`__mj_BizAppsCommunity`) and the
 * hand-written `CommunityGraduationResolver` mutations (`ToggleCommunityPostReaction`,
 * `GraduateCommunityThread`, `PromoteCommunityAnswerToCanon`).
 */
export const RESOLVER_PATHS: string[] = [
  resolve(here, 'generated/generated.{js,ts}'),
  resolve(here, 'resolvers.{js,ts}'),
];

export function LoadBizAppsCommunityServer(): void {
  LoadBizAppsCommunityEntities();
  LoadBizAppsCommunityCoreEntitiesServer();
  LoadBizAppsCommunityActions();
  void CommunityGraduationResolver;
}
