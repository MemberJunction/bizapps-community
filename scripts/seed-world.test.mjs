import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ALL_POST_TYPE_CODES,
  GetWorldSeedSummary,
  WORLD_COMMUNITY_SPACES,
  WORLD_FORUMS,
  WORLD_IDEA_ALLOCATIONS,
  WORLD_INTERACTIVE_SESSIONS,
  WORLD_MEMBER_PROFILES,
  WORLD_POST_FLAGS,
  WORLD_POST_REACTIONS,
  WORLD_POSTS,
  WORLD_TOPIC_TAGS,
} from './seed-world.mjs';

const REQUIRED_SPACE_NAMES = [
  'Customer Community Portal',
  'Partner & ISV Enablement Network',
  'Internal Engineering Guild',
];

const ALL_FORUM_TYPE_CODES = [
  'general-discussion',
  'qa-knowledge-base',
  'ideation-campaign',
  'playbooks-and-docs',
  'peer-case-rounds',
  'live-events-and-amas',
];

describe('BizApps Community world data model seed', () => {
  it('defines at least 25 records in total', () => {
    const { totalRecords } = GetWorldSeedSummary();
    assert.ok(totalRecords >= 25, `expected >= 25 records, got ${totalRecords}`);
  });

  it('defines exactly the 3 required Collaboration Spaces by name', () => {
    assert.equal(WORLD_COMMUNITY_SPACES.length, 3);
    const names = WORLD_COMMUNITY_SPACES.map((s) => s.Name);
    for (const required of REQUIRED_SPACE_NAMES) {
      assert.ok(names.includes(required), `missing required space "${required}"`);
    }
  });

  it('every Space has a unique ID and slug', () => {
    const ids = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.ID));
    const slugs = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.Slug));
    assert.equal(ids.size, WORLD_COMMUNITY_SPACES.length);
    assert.equal(slugs.size, WORLD_COMMUNITY_SPACES.length);
  });

  it('covers all 6 ForumType codes across the seeded Forums', () => {
    const coveredTypes = new Set(WORLD_FORUMS.map((f) => f.ForumTypeCode));
    for (const code of ALL_FORUM_TYPE_CODES) {
      assert.ok(coveredTypes.has(code), `missing forum of type "${code}"`);
    }
  });

  it('covers all 13 PostType codes across the seeded Posts', () => {
    const coveredTypes = new Set(WORLD_POSTS.map((p) => p.PostTypeCode));
    for (const code of ALL_POST_TYPE_CODES) {
      assert.ok(coveredTypes.has(code), `missing post of type "${code}"`);
    }
  });

  it('every Forum references a Space that was actually seeded (cross-domain referential integrity)', () => {
    const spaceIds = new Set(WORLD_COMMUNITY_SPACES.map((s) => s.ID));
    for (const forum of WORLD_FORUMS) {
      assert.ok(spaceIds.has(forum.SpaceID), `Forum ${forum.ID} references unknown Space ${forum.SpaceID}`);
    }
  });

  it('every Post references a Forum that was actually seeded', () => {
    const forumIds = new Set(WORLD_FORUMS.map((f) => f.ID));
    for (const post of WORLD_POSTS) {
      assert.ok(forumIds.has(post.ForumID), `Post ${post.ID} references unknown Forum ${post.ForumID}`);
    }
  });

  it('isolates each Space\'s forums from the others — no Forum is shared across Spaces (fnCommunityForumAccess isolation)', () => {
    const forumsBySpace = new Map();
    for (const forum of WORLD_FORUMS) {
      const list = forumsBySpace.get(forum.SpaceID) ?? [];
      list.push(forum.ID);
      forumsBySpace.set(forum.SpaceID, list);
    }
    // Every forum belongs to exactly one Space — the premise fnCommunityForumAccess's per-Space
    // membership check relies on. Also prove each of the 3 Spaces actually owns at least one forum,
    // so the isolation claim is non-vacuous.
    assert.equal(forumsBySpace.size, 3);
    const allForumIds = WORLD_FORUMS.map((f) => f.ID);
    assert.equal(new Set(allForumIds).size, allForumIds.length);
  });

  it('seeds a verified Q&A canon answer', () => {
    const answer = WORLD_POSTS.find((p) => p.PostTypeCode === 'answer');
    assert.ok(answer, 'no answer post seeded');
    assert.equal(answer.IsAccepted, true);
    assert.equal(answer.AIEpistemicStatus, 'Canon Verified');
  });

  it('seeds Quadratic Ideation Campaign allocations where QuadraticVotes = sqrt(PointsAllocated)', () => {
    assert.ok(WORLD_IDEA_ALLOCATIONS.length >= 2, 'expected at least 2 idea allocations');
    for (const allocation of WORLD_IDEA_ALLOCATIONS) {
      assert.equal(allocation.QuadraticVotes, Math.sqrt(allocation.PointsAllocated));
    }
    const ideaPost = WORLD_POSTS.find((p) => p.ID === WORLD_IDEA_ALLOCATIONS[0].IdeaPostID);
    assert.ok(ideaPost, 'idea allocations must reference a seeded idea-proposal post');
    assert.equal(ideaPost.PostTypeCode, 'idea-proposal');
  });

  it('seeds Interactive Mini-App sessions for a seeded interactive-experience post', () => {
    assert.ok(WORLD_INTERACTIVE_SESSIONS.length >= 2);
    const interactivePost = WORLD_POSTS.find((p) => p.PostTypeCode === 'interactive-experience');
    assert.ok(interactivePost);
    for (const session of WORLD_INTERACTIVE_SESSIONS) {
      assert.equal(session.InteractivePostID, interactivePost.ID);
    }
  });

  it('seeds reactions, member reputation profiles (ReputationLedger equivalent), and a moderation report', () => {
    assert.ok(WORLD_POST_REACTIONS.length > 0);
    assert.ok(WORLD_MEMBER_PROFILES.length === WORLD_COMMUNITY_SPACES.length, 'one reputation profile per seeded Space');
    assert.ok(WORLD_POST_FLAGS.length > 0);
  });

  it('seeds at least one Topic Tag per Space', () => {
    const spaceIdsWithTags = new Set(WORLD_TOPIC_TAGS.map((t) => t.SpaceID));
    for (const space of WORLD_COMMUNITY_SPACES) {
      assert.ok(spaceIdsWithTags.has(space.ID), `Space ${space.Name} has no Topic Tag`);
    }
  });
});
