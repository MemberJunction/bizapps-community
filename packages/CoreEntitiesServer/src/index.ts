export * from './base-forum-server-driver.ts';
export * from './base-post-server-driver.ts';
export * from './CommunityEngine.ts';
export * from './drivers/CommunitySpaceServerDriver.ts';
export {
  COMMUNITY_SYNTHESIS_REFRESH_EVENT_CODE,
  ForumPostServerEntity,
  LoadForumPostServerEntity,
  type SynthesisRefreshCheckResult,
} from './entities/ForumPostServerEntity.ts';
export {
  ForumAnswerPostServerEntity,
  LoadForumAnswerPostServerEntity,
} from './entities/ForumAnswerPostServerEntity.ts';
export {
  ForumIdeaAllocationServerEntity,
  LoadForumIdeaAllocationServerEntity,
} from './entities/ForumIdeaAllocationServerEntity.ts';
export {
  ForumPostReactionServerEntity,
  LoadForumPostReactionServerEntity,
} from './entities/ForumPostReactionServerEntity.ts';
export {
  ForumPostTagServerEntity,
  LoadForumPostTagServerEntity,
} from './entities/ForumPostTagServerEntity.ts';

import { RegisterBuiltInCommunityServerDrivers } from './drivers/CommunitySpaceServerDriver.ts';
import { LoadForumAnswerPostServerEntity } from './entities/ForumAnswerPostServerEntity.ts';
import { LoadForumIdeaAllocationServerEntity } from './entities/ForumIdeaAllocationServerEntity.ts';
import { LoadForumPostReactionServerEntity } from './entities/ForumPostReactionServerEntity.ts';
import { LoadForumPostServerEntity } from './entities/ForumPostServerEntity.ts';
import { LoadForumPostTagServerEntity } from './entities/ForumPostTagServerEntity.ts';

export function LoadBizAppsCommunityCoreEntitiesServer(): void {
  RegisterBuiltInCommunityServerDrivers();
  LoadForumPostServerEntity();
  LoadForumAnswerPostServerEntity();
  LoadForumIdeaAllocationServerEntity();
  LoadForumPostReactionServerEntity();
  LoadForumPostTagServerEntity();
}
