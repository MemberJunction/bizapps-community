import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  COMMUNITY_ENTITY_NAMES,
  ForumPostSubtypeResolver,
  ForumSubtypeDirectory,
  ForumSubtypeResolver,
  PostSubtypeDirectory,
} from './index.ts';

const IDEATION_FORUM_TYPE = 'C8A17100-4E12-4B8F-9A10-100000000003';
const GENERAL_FORUM_TYPE = 'C8A17100-4E12-4B8F-9A10-100000000001';
const QUESTION_POST_TYPE = 'C8A17200-4E12-4B8F-9A10-100000000004';
const DISCUSSION_POST_TYPE = 'C8A17200-4E12-4B8F-9A10-100000000001';

describe('@mj-biz-apps/community-entities subtype directories and resolvers', () => {
  const forumResolver = new ForumSubtypeResolver();
  const postResolver = new ForumPostSubtypeResolver();

  afterEach(() => {
    ForumSubtypeDirectory.Instance.Replace([]);
    PostSubtypeDirectory.Instance.Replace([]);
  });

  it('maintains a global singleton directory for ForumType and PostType IsA extensions', () => {
    assert.equal(ForumSubtypeDirectory.Instance, ForumSubtypeDirectory.Instance);
    assert.equal(PostSubtypeDirectory.Instance, PostSubtypeDirectory.Instance);

    ForumSubtypeDirectory.Instance.Replace([
      {
        ID: IDEATION_FORUM_TYPE,
        ExtensionEntity: `  ${COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns} `,
      },
      {
        ID: GENERAL_FORUM_TYPE,
        ExtensionEntity: null,
      },
    ]);

    assert.equal(
      ForumSubtypeDirectory.Instance.Get(IDEATION_FORUM_TYPE.toLowerCase()),
      COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
    );
    assert.equal(ForumSubtypeDirectory.Instance.Get(GENERAL_FORUM_TYPE), null);
    assert.equal(ForumSubtypeDirectory.Instance.Get('unknown'), undefined);
  });

  it('resolves Forum and ForumPost IsA child entities synchronously and asynchronously', async () => {
    ForumSubtypeDirectory.Instance.Replace([
      {
        ID: IDEATION_FORUM_TYPE,
        ExtensionEntity: COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
      },
    ]);
    PostSubtypeDirectory.Instance.Replace([
      {
        ID: QUESTION_POST_TYPE,
        ExtensionEntity: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
      },
      {
        ID: DISCUSSION_POST_TYPE,
        ExtensionEntity: null,
      },
    ]);

    assert.equal(
      await forumResolver.Resolve({ ForumTypeID: IDEATION_FORUM_TYPE }),
      COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
    );
    assert.equal(
      forumResolver.ResolveLoadHint({ ForumTypeID: IDEATION_FORUM_TYPE }),
      COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
    );

    assert.equal(
      await postResolver.Resolve({ PostTypeID: QUESTION_POST_TYPE }),
      COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
    );
    assert.equal(await postResolver.Resolve({ PostTypeID: DISCUSSION_POST_TYPE }), null);
  });
});
