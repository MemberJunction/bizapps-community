import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CallbackCommunityEmbeddingProvider,
  CombineWeightedVectors,
  CommunityRules,
  CommunityConfigurationResolver,
  CommunityEmbeddingPersonalizationService,
  CosineSimilarity,
  DEFAULT_COMMUNITY_CONFIGURATION,
  DeterministicSemanticEmbeddingProvider,
  NormalizeVector,
  evaluateForumAccess,
  redactForAnonymousEdge,
  resolvePostVisibilityBand,
  shouldRefreshThreadSynthesis,
  validateIdeaAllocations,
  validatePostPlacement,
  type CommunityMemberInteraction,
  type PersonalizationCandidatePost,
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

  it('enforces ForumAccess matrix across Space read/write, PrivateForum, Team band, Locked, ReadOnly, Removed, and Muted states', () => {
    // 1. Space unreadable denies even active forum member
    const noSpaceRead = evaluateForumAccess({
      spaceAccess: { canReadSpace: false, canSeeTeamBand: true, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'Shared', inheritsSpaceMembers: true, postingPolicy: 'Open', status: 'Active' },
      forumMembership: { status: 'Active', canConfigureForum: true, canModerateQueue: true, canCreateRootPost: true, canReply: true },
    });
    assert.equal(noSpaceRead.canReadForum, false);
    assert.equal(noSpaceRead.canCreateRootPost, false);

    // 2. Removed member denied even when InheritsSpaceMembers is true
    const removedMember = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: true, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'Shared', inheritsSpaceMembers: true, postingPolicy: 'Open', status: 'Active' },
      forumMembership: { status: 'Removed', canConfigureForum: false, canModerateQueue: false, canCreateRootPost: true, canReply: true },
    });
    assert.equal(removedMember.canReadForum, false);

    // 3. PrivateForum requires Active explicit ForumMembership (Invited or null denied)
    const privateNull = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: true, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'PrivateForum', inheritsSpaceMembers: false, postingPolicy: 'Open', status: 'Active' },
      forumMembership: null,
    });
    assert.equal(privateNull.canReadForum, false);

    const privateInvited = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: true, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'PrivateForum', inheritsSpaceMembers: false, postingPolicy: 'Open', status: 'Active' },
      forumMembership: { status: 'Invited', canConfigureForum: false, canModerateQueue: false, canCreateRootPost: true, canReply: true },
    });
    assert.equal(privateInvited.canReadForum, false);

    const privateActive = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: false, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'PrivateForum', inheritsSpaceMembers: false, postingPolicy: 'Open', status: 'Active' },
      forumMembership: { status: 'Active', canConfigureForum: false, canModerateQueue: false, canCreateRootPost: true, canReply: false },
    });
    assert.equal(privateActive.canReadForum, true);
    assert.equal(privateActive.canCreateRootPost, true);
    assert.equal(privateActive.canReply, false);

    // 4. Locked forum / closed space is read-only for writes even for moderators
    const lockedForum = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: true, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'Shared', inheritsSpaceMembers: true, postingPolicy: 'Open', status: 'Locked' },
      forumMembership: { status: 'Active', canConfigureForum: false, canModerateQueue: true, canCreateRootPost: true, canReply: true },
    });
    assert.equal(lockedForum.canReadForum, true);
    assert.equal(lockedForum.canCreateRootPost, false);
    assert.equal(lockedForum.canReply, false);
    assert.equal(lockedForum.canModerateQueue, true);

    // 5. ReadOnly forum blocks contributors but allows moderators/configurers
    const readOnlyMember = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: false, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'Shared', inheritsSpaceMembers: true, postingPolicy: 'ReadOnly', status: 'Active' },
      forumMembership: { status: 'Active', canConfigureForum: false, canModerateQueue: false, canCreateRootPost: true, canReply: true },
    });
    assert.equal(readOnlyMember.canReadForum, true);
    assert.equal(readOnlyMember.canCreateRootPost, false);
    assert.equal(readOnlyMember.canReply, false);

    const readOnlyMod = evaluateForumAccess({
      spaceAccess: { canReadSpace: true, canSeeTeamBand: false, isSpaceOpenForWrites: true },
      forum: { visibilityBand: 'Shared', inheritsSpaceMembers: true, postingPolicy: 'ReadOnly', status: 'Active' },
      forumMembership: { status: 'Active', canConfigureForum: false, canModerateQueue: true, canCreateRootPost: true, canReply: true },
    });
    assert.equal(readOnlyMod.canCreateRootPost, true);
    assert.equal(readOnlyMod.canReply, true);
    assert.equal(readOnlyMod.requiresModerationQueue, false);
  });

  it('enforces ResolvePostVisibilityBand, PostType placement boundaries, and Anonymous edge redaction modes', () => {
    // Team forum promotes Shared request to Team for internal users and blocks outside users
    assert.equal(
      resolvePostVisibilityBand({ forumVisibilityBand: 'Team', requestedBand: 'Shared', authorCanSeeTeamBand: true }),
      'Team',
    );
    assert.throws(
      () => resolvePostVisibilityBand({ forumVisibilityBand: 'Team', requestedBand: 'Shared', authorCanSeeTeamBand: false }),
      /Team-band forum/,
    );
    assert.equal(
      resolvePostVisibilityBand({ forumVisibilityBand: 'Shared', requestedBand: 'Team', authorCanSeeTeamBand: true }),
      'Team',
    );

    // Both placement rule works as root and reply up to maxReplyDepth
    const bothAsRoot = validatePostPlacement({
      placementRule: 'Both',
      allowsNestedReplies: true,
      maxReplyDepth: 3,
      isRootPost: true,
      parentReplyDepth: 0,
    });
    assert.equal(bothAsRoot.allowed, true);
    assert.equal(bothAsRoot.computedReplyDepth, 0);

    const replyOnlyAsRoot = validatePostPlacement({
      placementRule: 'Reply Only',
      allowsNestedReplies: true,
      maxReplyDepth: 3,
      isRootPost: true,
      parentReplyDepth: 0,
    });
    assert.equal(replyOnlyAsRoot.allowed, false);

    const maxDepthExact = validatePostPlacement({
      placementRule: 'Both',
      allowsNestedReplies: true,
      maxReplyDepth: 3,
      isRootPost: false,
      parentReplyDepth: 2,
    });
    assert.equal(maxDepthExact.allowed, true);
    assert.equal(maxDepthExact.computedReplyDepth, 3);

    const overMaxDepth = validatePostPlacement({
      placementRule: 'Both',
      allowsNestedReplies: true,
      maxReplyDepth: 3,
      isRootPost: false,
      parentReplyDepth: 3,
    });
    assert.equal(overMaxDepth.allowed, false);

    // Anonymous edge redaction: None, Full Read, Private/Listed space, and short Teaser without ellipsis
    assert.equal(
      redactForAnonymousEdge({
        spaceVisibility: 'Listed',
        spaceAnonymousReadMode: 'Full Read',
        forumVisibilityBand: 'Shared',
        postVisibilityBand: 'Shared',
        bodyMarkdown: 'Listed space hidden from anon',
      }).visible,
      false,
    );
    assert.equal(
      redactForAnonymousEdge({
        spaceVisibility: 'Open',
        spaceAnonymousReadMode: 'Full Read',
        forumAnonymousReadMode: 'None',
        forumVisibilityBand: 'Shared',
        postVisibilityBand: 'Shared',
        bodyMarkdown: 'Forum overrides space to None',
      }).visible,
      false,
    );
    const shortTeaser = redactForAnonymousEdge({
      spaceVisibility: 'Open',
      spaceAnonymousReadMode: 'Teaser Only',
      forumVisibilityBand: 'Shared',
      postVisibilityBand: 'Shared',
      bodyMarkdown: '  Short post  ',
      teaserMaxChars: 120,
    });
    assert.equal(shortTeaser.visible, true);
    assert.equal(shortTeaser.isTeaser, true);
    assert.equal(shortTeaser.contentMarkdown, 'Short post');

    // Synthesis triggers with custom initialThreshold and deltaStep boundaries
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 0, summaryReplyWatermark: 0, initialThreshold: 6, deltaStep: 4 }), false);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 5, summaryReplyWatermark: 0, initialThreshold: 6, deltaStep: 4 }), false);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 6, summaryReplyWatermark: 0, initialThreshold: 6, deltaStep: 4 }), true);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 9, summaryReplyWatermark: 6, initialThreshold: 6, deltaStep: 4 }), false);
    assert.equal(shouldRefreshThreadSynthesis({ replyCount: 10, summaryReplyWatermark: 6, initialThreshold: 6, deltaStep: 4 }), true);
  });

  it('resolves 5-tier configuration precedence including Space, PostType, and Extensions whitelist', () => {
    assert.deepEqual(CommunityConfigurationResolver.ParseConfigurationJSON('  '), {});
    assert.throws(() => CommunityConfigurationResolver.ParseConfigurationJSON('[1, 2, 3]'), /must be an object/);

    const resolved = CommunityConfigurationResolver.Resolve(
      { AskFirstEnabled: false, Extensions: { badge: { color: 'blue' } } },
      {
        Posts: { AllowedPostTypeCodes: ['question', 'answer'], DefaultRootPostTypeCode: 'question', MaxReplyDepth: 3 },
        Synthesis: { AutoSummarizeThreshold: 5, AskFirstDeflection: true, DeflectionMinConfidence: 0.7 },
        ForumOverridable: ['Posts.MaxReplyDepth', 'Extensions.allowedPanel'],
      },
      {
        Posts: { AllowedPostTypeCodes: ['discussion'], DefaultRootPostTypeCode: 'discussion', MaxReplyDepth: 4 },
        Extensions: { allowedPanel: { enabled: true }, blockedPanel: { enabled: true } },
      },
      {
        DefaultAnonymousReadMode: 'Full Read',
        Extensions: { spaceLevel: { tier: 'space' } },
      },
      {
        Posts: { AllowedPostTypeCodes: ['comment'], DefaultRootPostTypeCode: 'comment', MaxReplyDepth: 6 },
        Extensions: { allowedPanel: { mode: 'compact' } },
      },
    );

    assert.equal(resolved.AskFirstEnabled, false);
    assert.equal(resolved.DefaultAnonymousReadMode, 'Full Read');
    assert.equal(resolved.DefaultDigestCadence, DEFAULT_COMMUNITY_CONFIGURATION.DefaultDigestCadence);
    // PostType overrides Forum for whitelisted Posts.MaxReplyDepth
    assert.equal(resolved.Posts.MaxReplyDepth, 6);
    // Non-whitelisted AllowedPostTypeCodes keeps ForumType value
    assert.deepEqual(resolved.Posts.AllowedPostTypeCodes, ['question', 'answer']);
    // Extensions.allowedPanel merged from Forum + PostType; Extensions.blockedPanel rejected
    assert.deepEqual(resolved.Extensions.allowedPanel, { enabled: true, mode: 'compact' });
    assert.equal(resolved.Extensions.blockedPanel, undefined);
    assert.deepEqual(resolved.Extensions.spaceLevel, { tier: 'space' });
  });
});

describe('@mj-biz-apps/community-core embedding personalization edge cases & digest ranking', () => {
  const NOW = new Date('2026-11-20T12:00:00.000Z');

  it('handles zero-vectors, non-finite inputs, empty batches, and stop-word-only text cleanly', async () => {
    assert.deepEqual(NormalizeVector([0, 0, 0]), [0, 0, 0]);
    assert.deepEqual(NormalizeVector([Number.NaN, Number.POSITIVE_INFINITY, 0]), [0, 0, 0]);
    assert.equal(CosineSimilarity([], []), 0);
    assert.equal(CosineSimilarity([0, 0, 0], [1, 0, 0]), 0);
    assert.deepEqual(CombineWeightedVectors([]), []);
    assert.deepEqual(
      CombineWeightedVectors([
        { vector: [1, 0, 0], weight: 0 },
        { vector: [0, 1, 0], weight: Number.NaN },
      ]),
      [0, 0, 0],
    );

    const provider = new DeterministicSemanticEmbeddingProvider();
    const stopOnly = await provider.EmbedText('the and or for with from is are');
    assert.ok(stopOnly.every((v) => v === 0));
  });

  it('handles cold-start members (zero interactions or stop-word-only interactions) and excludes member-authored posts', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();

    const stopWordOnlyProfile = await svc.BuildMemberInterestProfile(
      'user-stop',
      [{ bodyText: 'the and or is', interactionType: 'reacted', occurredAt: NOW }],
      [],
      NOW,
    );
    assert.equal(stopWordOnlyProfile.isColdStart, true);

    const candidates: PersonalizationCandidatePost[] = [
      {
        postId: 'own-post',
        forumId: 'f-1',
        forumName: 'General',
        title: 'My own high engagement thread',
        bodyMarkdown: 'Authored by me',
        replyCount: 100,
        reactionScore: 100,
        isAlreadyAuthoredByMember: true,
        lastActivityAt: NOW,
      },
      {
        postId: 'conflict-post',
        forumId: 'f-2',
        forumName: 'General',
        title: 'Outdated conflicting note',
        bodyMarkdown: 'Conflicting guidance',
        epistemicStatus: 'Conflicts With Canon',
        replyCount: 5,
        reactionScore: 5,
        lastActivityAt: NOW,
      },
      {
        postId: 'canon-post',
        forumId: 'f-3',
        title: 'Canonical Handbook',
        bodyMarkdown: 'Verified guidance',
        epistemicStatus: 'Canon Verified',
        replyCount: 5,
        reactionScore: 5,
        lastActivityAt: NOW,
      },
    ];

    const res = await svc.RankPostsForMember({
      userId: 'cold-user',
      interactions: [],
      candidates,
      options: { maxItems: 10, now: NOW },
    });

    assert.equal(res.profile.isColdStart, true);
    assert.equal(res.ranked.some((r) => r.post.postId === 'own-post'), false);
    assert.equal(res.ranked[0]?.post.postId, 'canon-post');
    assert.equal(res.ranked[1]?.post.postId, 'conflict-post');
    assert.match(res.ranked[0]?.explanation ?? '', /Canon Verified thread trending/);
  });

  it('enforces recency decay bounds ([0.15, 1.0]), tie-breaking stability, diversity penalty clamping, and multi-tag weighting', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    const fixedProvider = new CallbackCommunityEmbeddingProvider('TieAndBoundsProvider', 4, async (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('tax')) return [1, 0, 0, 0];
      if (lower.includes('api')) return [0, 1, 0, 0];
      return [1, 0, 0, 0];
    });

    try {
      svc.SetEmbeddingProvider(fixedProvider);

      const interactions: CommunityMemberInteraction[] = [
        {
          title: 'Tax note',
          bodyText: 'tax compliance',
          topicTags: ['Tax', 'Audit'],
          interactionType: 'authored',
          occurredAt: new Date(NOW.getTime() + 60_000), // future timestamp -> decay clamped to 1.0
        },
        {
          title: 'Older tag',
          bodyText: 'tax filing',
          topicTags: ['Tax'],
          interactionType: 'reacted',
          occurredAt: new Date(NOW.getTime() - 365 * 24 * 60 * 60 * 1000), // very old -> decay floored at 0.15
        },
      ];

      const profile = await svc.BuildMemberInterestProfile('user-tags', interactions, ['Nexus', 'Tax'], NOW, 14);
      // 'Tax' appears in explicitTopicTags + 2 interactions so it outranks 'Audit'
      assert.equal(profile.topTopicTags[0], 'Tax');
      assert.ok(profile.topTopicTags.includes('Nexus'));
      assert.ok(profile.topTopicTags.includes('Audit'));

      const halfLifeAgo = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
      const veryOld = new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000);
      const futureDate = new Date(NOW.getTime() + 86_400_000);

      const candidates: PersonalizationCandidatePost[] = [
        {
          postId: 'tie-a',
          forumId: 'forum-1',
          title: 'Tax Guide A',
          bodyMarkdown: 'tax guide',
          topicTags: ['tax', 'TAX'], // case-insensitive duplicate tag
          lastActivityAt: futureDate,
        },
        {
          postId: 'tie-b',
          forumId: 'forum-2',
          title: 'Tax Guide B',
          bodyMarkdown: 'tax guide',
          topicTags: ['Audit'],
          lastActivityAt: futureDate,
        },
        {
          postId: 'repeat-penalized',
          forumId: 'forum-1',
          title: 'Tax Guide Repeat',
          bodyMarkdown: 'tax guide',
          topicTags: ['Tax'],
          lastActivityAt: futureDate,
        },
        {
          postId: 'half-life',
          forumId: 'forum-3',
          title: 'Tax Half Life',
          bodyMarkdown: 'tax guide',
          topicTags: ['Nexus'],
          lastActivityAt: halfLifeAgo,
        },
        {
          postId: 'very-old',
          forumId: 'forum-4',
          title: 'Tax Archive',
          bodyMarkdown: 'tax guide',
          lastActivityAt: veryOld,
        },
      ];

      const ranked = await svc.RankPostsForMember({
        userId: 'user-tags',
        interactions,
        explicitTopicTags: ['Nexus'],
        candidates,
        options: { maxItems: 100, diversityPenaltyPerRepeat: 2.0, recencyHalfLifeDays: 14, now: NOW },
      });

      // Exact tie-breaking preserves stable order ('tie-a' before 'tie-b')
      assert.equal(ranked.ranked[0]?.post.postId, 'tie-a');
      assert.equal(ranked.ranked[1]?.post.postId, 'tie-b');
      // Future timestamp clamped to 1.0
      assert.equal(ranked.ranked[0]?.recencyDecay, 1);
      // Case-insensitive candidate tag 'tax' matches member profile display tag 'Tax'
      assert.equal(ranked.ranked[0]?.matchedTags[0], 'Tax');
      assert.match(ranked.ranked[0]?.explanation ?? '', /Matches your recent activity in Tax/);
      // Exact half-life (14 days with halfLife=14) yields 0.5
      const halfLifeEntry = ranked.ranked.find((r) => r.post.postId === 'half-life');
      assert.equal(halfLifeEntry?.recencyDecay, 0.5);
      // Very old post floored at 0.15
      const oldEntry = ranked.ranked.find((r) => r.post.postId === 'very-old');
      assert.equal(oldEntry?.recencyDecay, 0.15);
      // Repeat forum-1 + primary tag 'tax' on 'repeat-penalized' clamps diversityPenaltyPerRepeat=2.0 -> 0.6, and penalty floors at 0.4
      const repeatEntry = ranked.ranked.find((r) => r.post.postId === 'repeat-penalized');
      assert.equal(repeatEntry?.diversityPenalty, 0.4);
    } finally {
      svc.ResetToDefaultProvider();
    }
  });
});
