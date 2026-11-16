import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CommunityConfigurationResolver, DEFAULT_COMMUNITY_CONFIGURATION } from './configuration.ts';

describe('@mj-biz-apps/community-core CommunityConfigurationResolver 4-tier cascade', () => {
  it('falls back to built-in defaults when no tier provides a value', () => {
    const resolved = CommunityConfigurationResolver.Resolve();
    assert.deepEqual(resolved.Posts, DEFAULT_COMMUNITY_CONFIGURATION.Posts);
    assert.equal(resolved.AskFirstEnabled, DEFAULT_COMMUNITY_CONFIGURATION.AskFirstEnabled);
  });

  it('layers ForumType -> Space -> Forum -> PostType, each winning over the one before it', () => {
    const appSettings = { AskFirstEnabled: false };
    const forumTypeConfig = {
      AskFirstEnabled: true,
      DefaultDigestCadence: 'Weekly Digest' as const,
      ForumOverridable: ['Posts.MaxReplyDepth'],
      Posts: { MaxReplyDepth: 3 },
    };
    const spaceConfig = {
      DefaultDigestCadence: 'Highlights Only' as const,
      Posts: { MaxReplyDepth: 4 },
    };
    const forumConfig = {
      Posts: { MaxReplyDepth: 5 },
    };
    const postTypeConfig = {
      Posts: { MaxReplyDepth: 6 },
    };

    // ForumType tier applies over AppSettings
    const typeOnly = CommunityConfigurationResolver.Resolve(appSettings, forumTypeConfig);
    assert.equal(typeOnly.AskFirstEnabled, true);
    assert.equal(typeOnly.DefaultDigestCadence, 'Weekly Digest');
    assert.equal(typeOnly.Posts.MaxReplyDepth, 3);

    // Space tier applies over ForumType (unconditional, like ForumType itself)
    const withSpace = CommunityConfigurationResolver.Resolve(appSettings, forumTypeConfig, null, spaceConfig);
    assert.equal(withSpace.DefaultDigestCadence, 'Highlights Only');
    assert.equal(withSpace.Posts.MaxReplyDepth, 4);

    // Forum tier applies over Space, but ONLY for whitelisted fields
    const withForum = CommunityConfigurationResolver.Resolve(appSettings, forumTypeConfig, forumConfig, spaceConfig);
    assert.equal(withForum.Posts.MaxReplyDepth, 5); // whitelisted via ForumOverridable

    // PostType tier applies last, winning the tie over Forum for the same whitelisted field
    const withPostType = CommunityConfigurationResolver.Resolve(
      appSettings,
      forumTypeConfig,
      forumConfig,
      spaceConfig,
      postTypeConfig,
    );
    assert.equal(withPostType.Posts.MaxReplyDepth, 6);
  });

  it('rejects a Forum or PostType override of a field the ForumType did not whitelist', () => {
    const forumTypeConfig = {
      ForumOverridable: ['Posts.MaxReplyDepth'], // AllowedPostTypeCodes is NOT whitelisted
    };
    const forumConfig = {
      Posts: { AllowedPostTypeCodes: ['discussion'] },
    };
    const postTypeConfig = {
      Posts: { AllowedPostTypeCodes: ['reply'] },
    };

    const resolved = CommunityConfigurationResolver.Resolve(null, forumTypeConfig, forumConfig, null, postTypeConfig);
    assert.deepEqual(resolved.Posts.AllowedPostTypeCodes, DEFAULT_COMMUNITY_CONFIGURATION.Posts.AllowedPostTypeCodes);
  });
});
