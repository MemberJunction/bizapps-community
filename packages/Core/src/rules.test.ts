import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CommunityRules,
  CommunityConfigurationResolver,
  evaluateForumAccess,
  redactForAnonymousEdge,
  resolvePostVisibilityBand,
  shouldRefreshThreadSynthesis,
  validateIdeaAllocations,
  validatePostPlacement,
} from './index.ts';

describe('@mj-biz-apps/community-core domain rules', () => {
  it('blocks outside members (canSeeTeamBand = false) from Team-band forums and Team posts', () => {
    const decision = evaluateForumAccess({
      spaceAccess: {
        canReadSpace: true,
        canSeeTeamBand: false,
        isSpaceOpenForWrites: true,
      },
      forum: {
        visibilityBand: 'Team',
        inheritsSpaceMembers: true,
        postingPolicy: 'Open',
        status: 'Active',
      },
      forumMembership: null,
    });

    assert.equal(decision.canReadForum, false);
    assert.equal(decision.canCreateRootPost, false);

    assert.throws(
      () =>
        resolvePostVisibilityBand({
          forumVisibilityBand: 'Shared',
          requestedBand: 'Team',
          authorCanSeeTeamBand: false,
        }),
      /Outside members cannot create Team-band posts/,
    );
  });

  it('allows Space members into Shared forums and flags Moderated forums for queue review', () => {
    const decision = CommunityRules.EvaluateForumAccess({
      spaceAccess: {
        canReadSpace: true,
        canSeeTeamBand: false,
        isSpaceOpenForWrites: true,
      },
      forum: {
        visibilityBand: 'Shared',
        inheritsSpaceMembers: true,
        postingPolicy: 'Moderated',
        status: 'Active',
      },
      forumMembership: null,
    });

    assert.equal(decision.canReadForum, true);
    assert.equal(decision.canSeeTeamPosts, false);
    assert.equal(decision.canCreateRootPost, true);
    assert.equal(decision.requiresModerationQueue, true);
  });

  it('validates 100-Point Wallet and Quadratic Voting math accurately', () => {
    const quadratic = validateIdeaAllocations({
      mode: 'Quadratic',
      budgetPoints: 100,
      maxPointsPerIdea: 64,
      voteWeightMultiplier: 1,
      allocations: [
        { ideaPostId: 'idea-1', pointsAllocated: 64 },
        { ideaPostId: 'idea-2', pointsAllocated: 25 },
        { ideaPostId: 'idea-3', pointsAllocated: 9 },
      ],
    });

    assert.equal(quadratic.valid, true);
    assert.equal(quadratic.totalPointsUsed, 98);
    assert.equal(quadratic.remainingBudgetPoints, 2);
    assert.equal(quadratic.effectiveVotesByIdea['idea-1'], 8);
    assert.equal(quadratic.effectiveVotesByIdea['idea-2'], 5);
    assert.equal(quadratic.effectiveVotesByIdea['idea-3'], 3);
  });

  it('rejects allocations exceeding the member point budget', () => {
    const overBudget = validateIdeaAllocations({
      mode: 'Point Allocation',
      budgetPoints: 100,
      allocations: [
        { ideaPostId: 'idea-1', pointsAllocated: 70 },
        { ideaPostId: 'idea-2', pointsAllocated: 40 },
      ],
    });

    assert.equal(overBudget.valid, false);
    assert.match(overBudget.errorMessage ?? '', /exceed campaign wallet budget/);
  });

  it('triggers Living Thread Synthesis at initial threshold and every deltaStep replies thereafter', () => {
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 3, summaryReplyWatermark: 0 }), false);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 4, summaryReplyWatermark: 0 }), true);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 5, summaryReplyWatermark: 4 }), false);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 7, summaryReplyWatermark: 4 }), true);
  });

  it('enforces PostType placement rules and maximum reply depth', () => {
    const rootOnlyInReply = validatePostPlacement({
      placementRule: 'Root Only',
      allowsNestedReplies: true,
      maxReplyDepth: 5,
      isRootPost: false,
      parentReplyDepth: 0,
    });
    assert.equal(rootOnlyInReply.allowed, false);

    const commentNestedTooDeep = validatePostPlacement({
      placementRule: 'Reply Only',
      allowsNestedReplies: false,
      maxReplyDepth: 5,
      isRootPost: false,
      parentReplyDepth: 1,
    });
    assert.equal(commentNestedTooDeep.allowed, false);
  });

  it('redacts anonymous public edge posts when in Teaser Only mode and hides Team posts completely', () => {
    const teaser = redactForAnonymousEdge({
      spaceVisibility: 'Open',
      spaceAnonymousReadMode: 'Teaser Only',
      forumVisibilityBand: 'Shared',
      postVisibilityBand: 'Shared',
      bodyMarkdown: 'A'.repeat(400),
      teaserMaxChars: 120,
    });

    assert.equal(teaser.visible, true);
    assert.equal(teaser.isTeaser, true);
    assert.equal(teaser.contentMarkdown.length, 121);

    const hiddenTeam = redactForAnonymousEdge({
      spaceVisibility: 'Open',
      spaceAnonymousReadMode: 'Full Read',
      forumVisibilityBand: 'Shared',
      postVisibilityBand: 'Team',
      bodyMarkdown: 'Internal staff note',
    });

    assert.equal(hiddenTeam.visible, false);
    assert.equal(hiddenTeam.contentMarkdown, '');
  });

  it('enforces ForumOverridable whitelist in the 4-tier configuration cascade', () => {
    const resolved = CommunityConfigurationResolver.Resolve(
      { ThreadSynthesisThreshold: 4 },
      {
        Posts: {
          AllowedPostTypeCodes: ['question', 'answer', 'comment'],
          DefaultRootPostTypeCode: 'question',
          MaxReplyDepth: 2,
        },
        Synthesis: {
          AutoSummarizeThreshold: 3,
          AskFirstDeflection: true,
          DeflectionMinConfidence: 0.8,
        },
        ForumOverridable: ['Synthesis.AutoSummarizeThreshold'],
      },
      {
        Posts: {
          AllowedPostTypeCodes: ['discussion'],
          DefaultRootPostTypeCode: 'discussion',
          MaxReplyDepth: 99,
        },
        Synthesis: {
          AutoSummarizeThreshold: 6,
          AskFirstDeflection: false,
          DeflectionMinConfidence: 0.2,
        },
      },
    );

    // AllowedPostTypeCodes and MaxReplyDepth were NOT in ForumOverridable, so ForumType wins
    assert.deepEqual(resolved.Posts.AllowedPostTypeCodes, ['question', 'answer', 'comment']);
    assert.equal(resolved.Posts.MaxReplyDepth, 2);
    // AutoSummarizeThreshold WAS in ForumOverridable, so Forum override wins
    assert.equal(resolved.Synthesis.AutoSummarizeThreshold, 6);
    assert.equal(resolved.ThreadSynthesisThreshold, 6);
    // AskFirstDeflection was NOT in ForumOverridable, so ForumType wins
    assert.equal(resolved.Synthesis.AskFirstDeflection, true);
  });
});
