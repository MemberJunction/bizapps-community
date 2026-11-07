export * from './base-forum-server-driver.ts';
export * from './base-post-server-driver.ts';
export * from './CommunityEngine.ts';
export * from './drivers/CommunitySpaceServerDriver.ts';

import { RegisterBuiltInCommunityServerDrivers } from './drivers/CommunitySpaceServerDriver.ts';

export function LoadBizAppsCommunityCoreEntitiesServer(): void {
  RegisterBuiltInCommunityServerDrivers();
}
