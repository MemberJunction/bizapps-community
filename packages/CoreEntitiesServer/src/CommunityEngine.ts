import { CommunityEngineBase } from '@mj-biz-apps/community-engine-base';

/**
 * Server-side subclass of CommunityEngineBase for `@mj-biz-apps/community-core-entities-server`.
 * NOTE: For `CommunityEngineBase`, import directly from `@mj-biz-apps/community-engine-base`.
 */
export class CommunityEngine extends CommunityEngineBase {
  public static override get Instance(): CommunityEngine {
    return super.getInstance<CommunityEngine>();
  }
}
