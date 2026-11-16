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

test('@mj-biz-apps/community-engine-base CommunityEngineBase is a BaseEngine<T> singleton with O(1) caches that invalidate on reload', () => {
  const engine = CommunityEngineBase.Instance;
  assert.equal(engine, CommunityEngineBase.Instance, 'Instance must return the same process-wide singleton');

  engine.HydrateMetadata({
    forumTypes: [
      { ID: 'TYPE-1', Code: 'alpha', Name: 'Alpha' } as IForumTypeDescriptor,
    ],
    postTypes: [],
    forumRoleTypes: [],
  });
  assert.equal(engine.GetForumTypeByCode('alpha')?.ID, 'TYPE-1');
  assert.equal(engine.GetForumTypeByCode('beta'), undefined);

  // A re-hydration (simulating a reload) must invalidate the memoized Map so a newly
  // added row is immediately visible without a process restart.
  engine.HydrateMetadata({
    forumTypes: [
      { ID: 'TYPE-1', Code: 'alpha', Name: 'Alpha' } as IForumTypeDescriptor,
      { ID: 'TYPE-2', Code: 'beta', Name: 'Beta' } as IForumTypeDescriptor,
    ],
    postTypes: [],
    forumRoleTypes: [],
  });
  assert.equal(engine.GetForumTypeByCode('beta')?.ID, 'TYPE-2');
  assert.equal(engine.GetAllForumTypes().length, 2);
});

test('@mj-biz-apps/community-engine-base CommunityEngineBase.ResolveConfiguration applies the full ForumType -> Space -> Forum -> PostType cascade', () => {
  const engine = CommunityEngineBase.Instance;

  const forumType: IForumTypeDescriptor = {
    ID: 'TYPE-CASCADE',
    Code: 'cascade-type',
    Name: 'Cascade Type',
    Configuration: JSON.stringify({
      ForumOverridable: ['Posts.MaxReplyDepth'],
      Posts: { MaxReplyDepth: 2 },
    }),
  } as IForumTypeDescriptor;

  engine.HydrateMetadata({
    forumTypes: [forumType],
    postTypes: [],
    forumRoleTypes: [],
  });

  const resolved = engine.ResolveConfiguration({
    forum: {
      ForumTypeID: 'TYPE-CASCADE',
      Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 5 } }),
    },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
    postType: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 9 } }) },
  });

  // PostType is the most specific whitelisted tier and wins the tie over Forum, Space, and ForumType.
  assert.equal(resolved.Posts.MaxReplyDepth, 9);

  // Without a PostType tier, Forum (whitelisted) wins over Space and ForumType.
  const withoutPostType = engine.ResolveConfiguration({
    forum: {
      ForumTypeID: 'TYPE-CASCADE',
      Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 5 } }),
    },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
  });
  assert.equal(withoutPostType.Posts.MaxReplyDepth, 5);

  // Without Forum or PostType tiers, Space (unconditional, like ForumType) wins over ForumType.
  const spaceOnly = engine.ResolveConfiguration({
    forum: { ForumTypeID: 'TYPE-CASCADE', Configuration: null },
    space: { Configuration: JSON.stringify({ Posts: { MaxReplyDepth: 3 } }) },
  });
  assert.equal(spaceOnly.Posts.MaxReplyDepth, 3);
});
