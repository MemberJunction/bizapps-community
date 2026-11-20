import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IsValidUUID } from '@memberjunction/global';
import {
  CallbackCommunityEmbeddingProvider,
  COMMUNITY_ACTION_DRIVER_CLASSES,
  COMMUNITY_ACTION_IDS,
  CommunityEmbeddingPersonalizationService,
  CosineSimilarity,
  DeterministicSemanticEmbeddingProvider,
  NormalizeVector,
  ResolveCommunityActionID,
  type CommunityMemberInteraction,
  type PersonalizationCandidatePost,
} from './index.ts';

describe('@mj-biz-apps/community-core — CommunityEmbeddingPersonalizationService', () => {
  const NOW = new Date('2026-11-19T12:00:00.000Z');

  it('exposes a BaseSingleton Instance and supports pluggable ICommunityEmbeddingProvider', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    assert.equal(svc, CommunityEmbeddingPersonalizationService.Instance);
    assert.equal(svc.GetEmbeddingProvider().Name, 'DeterministicSemanticEmbeddingProvider');

    const customProvider = new CallbackCommunityEmbeddingProvider('CustomTestProvider', 4, async (text) => {
      return text.toLowerCase().includes('tax') ? [1, 0, 0, 0] : [0, 1, 0, 0];
    });

    try {
      svc.SetEmbeddingProvider(customProvider);
      assert.equal(svc.GetEmbeddingProvider().Name, 'CustomTestProvider');
      const vec = await svc.ComputePostEmbedding({
        postId: 'custom-1',
        title: 'Tax Compliance Update',
        bodyMarkdown: 'State filing deadlines',
      });
      assert.deepEqual(vec, [1, 0, 0, 0]);
    } finally {
      svc.ResetToDefaultProvider();
    }
  });

  it('produces meaningful semantic cosine similarity across related vs unrelated topics', async () => {
    const provider = new DeterministicSemanticEmbeddingProvider();
    const taxA = await provider.EmbedText('Multi-state economic nexus thresholds and sales tax compliance filing');
    const taxB = await provider.EmbedText('Wayfair state tax audit obligations and nexus exemption rules');
    const apiPost = await provider.EmbedText('GraphQL schema resolvers, webhook mutations, and REST API endpoints');

    const simTax = CosineSimilarity(taxA, taxB);
    const simCross = CosineSimilarity(taxA, apiPost);

    assert.ok(simTax > 0.4, `expected high similarity for tax posts, got ${simTax}`);
    assert.ok(simTax > simCross + 0.25, `expected tax similarity (${simTax}) >> cross-topic (${simCross})`);
    assert.ok(Math.abs(Math.hypot(...NormalizeVector(taxA)) - 1) < 1e-6);
  });

  it('produces genuinely different personalized digest rankings for Member A (Tax/Compliance) vs Member B (GraphQL/API) from the same pool', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();

    const candidatePool: PersonalizationCandidatePost[] = [
      {
        postId: 'post-tax-nexus',
        forumId: 'forum-tax',
        forumName: 'Tax & Regulatory',
        title: '50-State Economic Nexus Threshold Changes for 2027',
        bodyMarkdown:
          'Updated Wayfair economic nexus thresholds, sales tax compliance filing deadlines, and state audit readiness.',
        topicTags: ['Tax', 'Compliance', 'Nexus'],
        epistemicStatus: 'Canon Verified',
        replyCount: 14,
        reactionScore: 22,
        lastActivityAt: new Date('2026-11-18T12:00:00.000Z'),
      },
      {
        postId: 'post-graphql-resolvers',
        forumId: 'forum-dev',
        forumName: 'API & Integrations',
        title: 'Optimizing GraphQL Schema Resolvers and Webhook Mutations',
        bodyMarkdown:
          'How to batch GraphQL query resolvers, design idempotent API webhook endpoints, and validate JSON schemas.',
        topicTags: ['GraphQL', 'API', 'Webhooks'],
        epistemicStatus: 'Canon Verified',
        replyCount: 11,
        reactionScore: 19,
        lastActivityAt: new Date('2026-11-18T12:00:00.000Z'),
      },
      {
        postId: 'post-vat-audit',
        forumId: 'forum-tax',
        forumName: 'Tax & Regulatory',
        title: 'Cross-Border VAT Deduction and Jurisdiction Audit Checklist',
        bodyMarkdown:
          'Preparing statutory VAT filings, exemption certificates, and IRS/state audit documentation.',
        topicTags: ['Tax', 'Audit'],
        epistemicStatus: 'Novel Insight',
        replyCount: 6,
        reactionScore: 9,
        lastActivityAt: new Date('2026-11-17T12:00:00.000Z'),
      },
      {
        postId: 'post-api-sdk',
        forumId: 'forum-dev',
        forumName: 'API & Integrations',
        title: 'REST vs GraphQL SDK Pagination Patterns',
        bodyMarkdown:
          'Comparing cursor pagination in GraphQL queries against REST endpoint headers and JSON payloads.',
        topicTags: ['API', 'SDK'],
        epistemicStatus: 'Novel Insight',
        replyCount: 5,
        reactionScore: 8,
        lastActivityAt: new Date('2026-11-17T12:00:00.000Z'),
      },
    ];

    const taxMemberInteractions: CommunityMemberInteraction[] = [
      {
        postId: 'hist-tax-1',
        title: 'State Sales Tax Nexus Review',
        bodyText: 'Reviewing Wayfair nexus thresholds, state tax compliance audits, and exemption certificates.',
        topicTags: ['Tax', 'Compliance'],
        interactionType: 'authored',
        occurredAt: new Date('2026-11-18T00:00:00.000Z'),
      },
    ];

    const apiMemberInteractions: CommunityMemberInteraction[] = [
      {
        postId: 'hist-api-1',
        title: 'GraphQL Mutation Design',
        bodyText: 'Building strongly-typed GraphQL resolvers, API schemas, and webhook integrations.',
        topicTags: ['GraphQL', 'API'],
        interactionType: 'authored',
        occurredAt: new Date('2026-11-18T00:00:00.000Z'),
      },
    ];

    const memberARank = await svc.RankPostsForMember({
      userId: 'user-member-a',
      interactions: taxMemberInteractions,
      candidates: candidatePool,
      options: { maxItems: 4, now: NOW },
    });

    const memberBRank = await svc.RankPostsForMember({
      userId: 'user-member-b',
      interactions: apiMemberInteractions,
      candidates: candidatePool,
      options: { maxItems: 4, now: NOW },
    });

    assert.equal(memberARank.profile.isColdStart, false);
    assert.equal(memberBRank.profile.isColdStart, false);

    assert.equal(memberARank.ranked[0]?.post.postId, 'post-tax-nexus');
    assert.equal(memberBRank.ranked[0]?.post.postId, 'post-graphql-resolvers');
    assert.notEqual(
      memberARank.ranked.map((r) => r.post.postId).join(','),
      memberBRank.ranked.map((r) => r.post.postId).join(','),
    );
    assert.match(memberARank.ranked[0]?.explanation ?? '', /Tax|Compliance/i);
    assert.match(memberBRank.ranked[0]?.explanation ?? '', /GraphQL|API/i);
  });

  it('applies topic/forum diversity re-ranking so one noisy forum does not monopolize top slots', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();

    const noisyPool: PersonalizationCandidatePost[] = [
      {
        postId: 'noisy-1',
        forumId: 'forum-governance',
        forumName: 'Governance',
        title: 'Governance Licensing Policy Update Part 1',
        bodyMarkdown: 'Board governance policy, bylaw charter, and licensing compliance rules.',
        topicTags: ['Governance'],
        lastActivityAt: NOW,
      },
      {
        postId: 'noisy-2',
        forumId: 'forum-governance',
        forumName: 'Governance',
        title: 'Governance Licensing Policy Update Part 2',
        bodyMarkdown: 'Board governance policy, bylaw charter, and licensing compliance rules.',
        topicTags: ['Governance'],
        lastActivityAt: NOW,
      },
      {
        postId: 'noisy-3',
        forumId: 'forum-governance',
        forumName: 'Governance',
        title: 'Governance Licensing Policy Update Part 3',
        bodyMarkdown: 'Board governance policy, bylaw charter, and licensing compliance rules.',
        topicTags: ['Governance'],
        lastActivityAt: NOW,
      },
      {
        postId: 'diverse-1',
        forumId: 'forum-security',
        forumName: 'Security & RBAC',
        title: 'Governance Policy and OAuth RBAC Token Controls',
        bodyMarkdown: 'Applying governance policy rules to OAuth SSO authentication and RBAC permissions.',
        topicTags: ['Security', 'Governance'],
        lastActivityAt: NOW,
      },
    ];

    const res = await svc.RankPostsForMember({
      userId: 'user-gov',
      interactions: [
        {
          title: 'Governance & Licensing',
          bodyText: 'Board governance licensing policy and RBAC security controls.',
          topicTags: ['Governance', 'Security'],
          interactionType: 'followed',
          occurredAt: NOW,
        },
      ],
      candidates: noisyPool,
      options: { maxItems: 3, diversityPenaltyPerRepeat: 0.45, now: NOW },
    });

    const topIds = res.ranked.map((r) => r.post.postId);
    assert.ok(topIds.includes('diverse-1'), `expected diverse forum post in top 3, got ${topIds.join(', ')}`);
    assert.ok(res.ranked.some((r) => r.diversityPenalty < 1), 'expected diversity penalty on repeated forum/tag');
  });

  it('provides cold-start fallback for members with zero interactions and respects maxCandidateScan', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();

    const candidates: PersonalizationCandidatePost[] = [
      {
        postId: 'cold-low',
        forumId: 'forum-general',
        forumName: 'General',
        title: 'Quiet Thread',
        bodyMarkdown: 'Minimal discussion.',
        replyCount: 0,
        reactionScore: 0,
        lastActivityAt: new Date('2026-11-01T00:00:00.000Z'),
      },
      {
        postId: 'cold-high',
        forumId: 'forum-general',
        forumName: 'General',
        title: 'Canon Welcome Guide',
        bodyMarkdown: 'Essential onboarding handbook for all members.',
        epistemicStatus: 'Canon Verified',
        replyCount: 25,
        reactionScore: 40,
        lastActivityAt: NOW,
      },
    ];

    const res = await svc.RankPostsForMember({
      userId: 'new-member',
      interactions: [],
      candidates,
      options: { maxItems: 5, now: NOW },
    });

    assert.equal(res.profile.isColdStart, true);
    assert.equal(res.ranked[0]?.post.postId, 'cold-high');
    assert.equal(res.ranked[0]?.isColdStartFallback, true);
    assert.match(res.ranked[0]?.explanation ?? '', /Popular in General/);

    const bounded = await svc.RankPostsForMember({
      userId: 'new-member',
      interactions: [],
      candidates,
      options: { maxItems: 1, maxCandidateScan: 1, now: NOW },
    });
    assert.equal(bounded.ranked.length, 1);
    assert.equal(bounded.ranked[0]?.post.postId, 'cold-low');
  });
});

describe('@mj-biz-apps/community-core — ResolveCommunityActionID (CR-03)', () => {
  it('defines canonical valid UUIDs for every action and resolves live ActionEngineBase catalog entries by DriverClass or Name', () => {
    for (const [key, id] of Object.entries(COMMUNITY_ACTION_IDS)) {
      assert.equal(IsValidUUID(id), true, `COMMUNITY_ACTION_IDS.${key} (${id}) must be a valid UUID`);
    }

    const liveDigestId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const resolvedFromDriver = ResolveCommunityActionID('SendPersonalizedDigest', [
      { ID: '11111111-1111-4111-8111-111111111111', DriverClass: 'Other.Action', Status: 'Active' },
      {
        ID: liveDigestId,
        DriverClass: COMMUNITY_ACTION_DRIVER_CLASSES.SendPersonalizedDigest,
        Name: 'Send Personalized Community Digest',
        Status: 'Active',
      },
    ]);
    assert.equal(resolvedFromDriver, liveDigestId);

    // Ignores inactive entries and falls back to canonical UUID constant when absent
    const fallback = ResolveCommunityActionID('SendPersonalizedDigest', [
      {
        ID: '22222222-2222-4222-8222-222222222222',
        DriverClass: COMMUNITY_ACTION_DRIVER_CLASSES.SendPersonalizedDigest,
        Status: 'Disabled',
      },
    ]);
    assert.equal(fallback, COMMUNITY_ACTION_IDS.SendPersonalizedDigest);
  });
});
