import { LoadBizAppsCommunityActions } from '@mj-biz-apps/community-actions';
import { LoadBizAppsCommunityCoreEntitiesServer } from '@mj-biz-apps/community-core-entities-server';
import { LoadBizAppsCommunityEntities } from '@mj-biz-apps/community-entities';
import { CommunityGraduationResolver } from './resolvers.ts';

export * from './document-blocks.ts';
export * from './resolvers.ts';

export function LoadBizAppsCommunityServer(): void {
  LoadBizAppsCommunityEntities();
  LoadBizAppsCommunityCoreEntitiesServer();
  LoadBizAppsCommunityActions();
  void CommunityGraduationResolver;
}
