import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveEffectiveForumPermissions,
  resolveForumConfiguration,
  validatePostTypePlacement,
} from './configuration.ts';
import {
  canReadCommunityBand,
  computeCompositeAnswerRank,
  computeEffectiveIdeaVotes,
  filterPostsForAnonymousReader,
  isLowSignalReply,
  resolveEffectiveAnonymousAccess,
  shouldSuggestWorkingSpacePromotion,
  validateIdeaPointAllocation,
} from './rules.ts';

describe('bizapps-community core rules', () => {
  it('identifies low-signal noise replies for auto-collapsing', () => {
    assert.equal(isLowSignalReply('+1'), true);
    assert.equal(isLowSignalReply('Thanks!!'), true);
    assert.equal(isLowSignalReply('Following.'), true);
    assert.equal(
      isLowSignalReply('We updated Section 4.2 of the state compliance checklist to cover this.'),
      false,
    );
  });

  it('flags high-velocity threads for Working Space promotion', () => {
    assert.equal(
      shouldSuggestWorkingSpacePromotion({
        replyCount: 9,
        distinctParticipantCount: 5,
        attachmentCount: 0,
        alreadyPromoted: false,
      }),
      true,
    );

    assert.equal(
      shouldSuggestWorkingSpacePromotion({
        replyCount: 9,
        distinctParticipantCount: 5,
        attachmentCount: 2,
        alreadyPromoted: true,
      }),
      false,
    );
  });

  it('enforces Collaboration Shared vs Team band visibility', () => {
    assert.equal(canReadCommunityBand('Shared', false), true);
    assert.equal(canReadCommunityBand('Team', false), false);
    assert.equal(canReadCommunityBand('Team', true), true);
  });

  it('resolves anonymous access and strips Team posts or truncates TeaserOnly threads', () => {
    assert.equal(resolveEffectiveAnonymousAccess('FullRead', 'Inherit', 'Team'), 'None');
    assert.equal(resolveEffectiveAnonymousAccess('TeaserOnly', 'Inherit', 'Shared'), 'TeaserOnly');
    assert.equal(resolveEffectiveAnonymousAccess('FullRead', 'None', 'Shared'), 'None');

    const samplePosts = [
      { id: 'root', band: 'Shared' as const, isRootPost: true },
      { id: 'r1', band: 'Shared' as const },
      { id: 'r2', band: 'Team' as const },
      { id: 'r3', band: 'Shared' as const, isAcceptedAnswer: true },
      { id: 'r4', band: 'Shared' as const },
      { id: 'r5', band: 'Shared' as const },
    ];

    const teaser = filterPostsForAnonymousReader(samplePosts, 'TeaserOnly', 1);
    assert.equal(teaser.allowed, true);
    assert.deepEqual(
      teaser.visiblePosts.map((p) => p.id),
      ['root', 'r1', 'r3'],
    );
    assert.equal(teaser.hiddenPostCount, 2);
    assert.equal(teaser.requiresLoginForMore, true);
  });

  it('ranks fresh Canon-verified answers above stale high-upvote answers', () => {
    const staleEarlyAnswer = computeCompositeAnswerRank({
      netVoteScore: 25,
      expertWeightedScore: 5,
      isAcceptedAnswer: false,
      aiCanonStatus: 'PartiallyOutdated',
      aiGradeScore: 60,
      isSuperseded: true,
    });

    const freshCanonExpertAnswer = computeCompositeAnswerRank({
      netVoteScore: 6,
      expertWeightedScore: 10,
      isAcceptedAnswer: true,
      aiCanonStatus: 'CanonVerified',
      aiGradeScore: 96,
      isSuperseded: false,
    });

    assert.ok(freshCanonExpertAnswer > staleEarlyAnswer);
  });

  it('calculates point-allocation and quadratic voting math accurately', () => {
    assert.equal(computeEffectiveIdeaVotes(25, 'PointAllocation'), 25);
    assert.equal(computeEffectiveIdeaVotes(25, 'Quadratic'), 5);
    assert.equal(computeEffectiveIdeaVotes(9, 'Quadratic'), 3);

    const validAlloc = validateIdeaPointAllocation({
      initialBudget: 100,
      pointsRefunded: 0,
      currentOtherAllocationsTotal: 60,
      requestedPointsForIdea: 30,
      maxPointsPerIdea: 50,
    });
    assert.equal(validAlloc.valid, true);
    assert.equal(validAlloc.remainingPointsAfter, 10);

    const overBudget = validateIdeaPointAllocation({
      initialBudget: 100,
      pointsRefunded: 0,
      currentOtherAllocationsTotal: 80,
      requestedPointsForIdea: 30,
      maxPointsPerIdea: 50,
    });
    assert.equal(overBudget.valid, false);
    assert.equal(overBudget.errorCode, 'EXCEEDS_WALLET_BUDGET');
  });

  it('cascades 4-level Forum configuration (AppSettings -> ForumType -> Space -> Forum/Sub-Forum)', () => {
    const resolved = resolveForumConfiguration({
      globalAppSettings: {
        features: {
          anonymousAccess: { mode: 'TeaserOnly', teaserReplyLimit: 2 },
        },
      },
      forumTypeChain: [
        {
          allowedRootPostTypes: ['question', 'collaborative-artifact'],
          allowedReplyPostTypes: ['answer', 'discussion', 'interactive-mini-app'],
          defaultRootPostType: 'question',
          features: {
            qaGrading: { enabled: true, aiEpistemicGrading: true },
          },
        },
      ],
      communitySpaceConfig: {
        features: {
          moderation: { mode: 'FirstPostQueue' },
        },
      },
      forumHierarchyChain: [
        {
          features: {
            moderation: { allowScopedPseudonymousPosts: true },
          },
        },
        {
          // Sub-forum enables interactive AI games at root level too
          allowedRootPostTypes: ['question', 'collaborative-artifact', 'interactive-mini-app'],
        },
      ],
      forumBand: 'Shared',
    });

    assert.equal(resolved.defaultRootPostType, 'question');
    assert.deepEqual(resolved.allowedRootPostTypes, [
      'question',
      'collaborative-artifact',
      'interactive-mini-app',
    ]);
    assert.equal(resolved.features.anonymousAccess.mode, 'TeaserOnly');
    assert.equal(resolved.features.anonymousAccess.teaserReplyLimit, 2);
    assert.equal(resolved.features.moderation.mode, 'FirstPostQueue');
    assert.equal(resolved.features.moderation.allowScopedPseudonymousPosts, true);

    // Validate PostType placement against the resolved Forum configuration
    assert.deepEqual(
      validatePostTypePlacement(
        { name: 'answer', allowedPlacement: 'ReplyOnly', isActive: true },
        false,
        resolved,
      ),
      { allowed: false, reason: 'ROOT_PLACEMENT_NOT_ALLOWED_BY_TYPE' },
    );

    assert.deepEqual(
      validatePostTypePlacement(
        { name: 'answer', allowedPlacement: 'ReplyOnly', isActive: true },
        true,
        resolved,
      ),
      { allowed: true },
    );

    assert.deepEqual(
      validatePostTypePlacement(
        { name: 'interactive-mini-app', allowedPlacement: 'Both', isActive: true },
        false,
        resolved,
      ),
      { allowed: true },
    );
  });

  it('aggregates per-forum participant roles and expert vote weight multipliers', () => {
    const perms = resolveEffectiveForumPermissions([
      {
        roleName: 'expert-reviewer',
        canPinOrLock: false,
        canModerateQueue: false,
        canVerifyCanon: true,
        canPromoteToSpace: false,
        canConfigureForum: false,
        voteWeightMultiplier: 3.0,
      },
      {
        roleName: 'moderator',
        canPinOrLock: true,
        canModerateQueue: true,
        canVerifyCanon: false,
        canPromoteToSpace: true,
        canConfigureForum: false,
        voteWeightMultiplier: 1.5,
      },
    ]);

    assert.deepEqual(perms.activeRoleNames, ['expert-reviewer', 'moderator']);
    assert.equal(perms.canVerifyCanon, true);
    assert.equal(perms.canModerateQueue, true);
    assert.equal(perms.canConfigureForum, false);
    assert.equal(perms.effectiveVoteWeightMultiplier, 3.0);
  });
});

