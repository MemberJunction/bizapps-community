import assert from 'node:assert/strict';
import test from 'node:test';
import { CommunityEngineBase } from './CommunityEngineBase.ts';
import type { IForumRoleTypeDescriptor, IForumTypeDescriptor, IPostTypeDescriptor } from '@mj-biz-apps/community-entities';

test('@mj-biz-apps/community-engine-base CommunityEngineBase metadata hydration & lookups', () => {
  const engine = CommunityEngineBase.Instance;

  const mockForumTypes: IForumTypeDescriptor[] = [
    {
      ID: 'C8A17100-4E12-4B8F-9A10-100000000001',
      Code: 'general-discussion',
      Name: 'General Discussion',
      Configuration: JSON.stringify({
        Posts: {
          AllowedPostTypeCodes: ['discussion', 'reply', 'comment'],
          DefaultRootPostTypeCode: 'discussion',
          MaxReplyDepth: 5,
        },
        ForumOverridable: ['Posts.MaxReplyDepth'],
      }),
    },
    {
      ID: 'C8A17100-4E12-4B8F-9A10-100000000002',
      Code: 'qa-knowledge-base',
      Name: 'Q&A Knowledge Base',
      ServerDriverClass: 'QAForumServerDriver',
      UIDriverClass: 'QAForumUIDriver',
    },
  ];

  const mockPostTypes: IPostTypeDescriptor[] = [
    {
      ID: 'C8A17200-4E12-4B8F-9A10-100000000001',
      Code: 'discussion',
      Name: 'Discussion',
      PlacementRule: 'Root Only',
    },
    {
      ID: 'C8A17200-4E12-4B8F-9A10-100000000002',
      Code: 'reply',
      Name: 'Reply',
      PlacementRule: 'Reply Only',
    },
  ];

  const mockRoleTypes: IForumRoleTypeDescriptor[] = [
    {
      ID: 'C8A17300-4E12-4B8F-9A10-100000000001',
      Code: 'forum-admin',
      Name: 'Forum Admin',
      Level: 1000,
    },
  ];

  engine.HydrateMetadata({
    forumTypes: mockForumTypes,
    postTypes: mockPostTypes,
    forumRoleTypes: mockRoleTypes,
    appSettings: {
      AskFirstEnabled: true,
      Synthesis: {
        AutoSummarizeThreshold: 5,
        AskFirstDeflection: true,
        DeflectionMinConfidence: 0.8,
      },
    },
  });

  // O(1) Lookups by ID (case-insensitive)
  const ftById = engine.GetForumTypeById('c8a17100-4e12-4b8f-9a10-100000000001');
  assert.equal(ftById?.Code, 'general-discussion');

  // O(1) Lookups by Code
  const ftByCode = engine.GetForumTypeByCode('qa-knowledge-base');
  assert.equal(ftByCode?.ServerDriverClass, 'QAForumServerDriver');

  const ptById = engine.GetPostTypeById('C8A17200-4E12-4B8F-9A10-100000000001');
  assert.equal(ptById?.Code, 'discussion');

  const ptByCode = engine.GetPostTypeByCode('reply');
  assert.equal(ptByCode?.PlacementRule, 'Reply Only');

  const rtById = engine.GetForumRoleTypeById('c8a17300-4e12-4b8f-9a10-100000000001');
  assert.equal(rtById?.Code, 'forum-admin');

  const rtByCode = engine.GetForumRoleTypeByCode('forum-admin');
  assert.equal(rtByCode?.Level, 1000);

  // Lists
  assert.equal(engine.GetAllForumTypes().length, 2);
  assert.equal(engine.GetAllPostTypes().length, 2);
  assert.equal(engine.GetAllForumRoleTypes().length, 1);

  // 4-tier configuration resolution
  const resolved = engine.ResolveForumConfiguration({
    ForumTypeID: 'c8a17100-4e12-4b8f-9a10-100000000001',
    Configuration: JSON.stringify({
      Posts: {
        MaxReplyDepth: 2,
        AllowedPostTypeCodes: ['discussion'], // unauthorized override
      },
    }),
  });

  assert.equal(resolved.AskFirstEnabled, true);
  assert.equal(resolved.ThreadSynthesisThreshold, 5);
  assert.equal(resolved.Posts.MaxReplyDepth, 2); // whitelisted override applied
  // unauthorized override rejected:
  assert.deepEqual(resolved.Posts.AllowedPostTypeCodes, ['discussion', 'reply', 'comment']);
});
