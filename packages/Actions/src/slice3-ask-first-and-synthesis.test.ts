import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import {
  CallbackCommunityEmbeddingProvider,
  CommunityEmbeddingPersonalizationService,
} from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import {
  ComputeAskFirstDeflection,
  ComputeEpistemicCanonBoost,
  ComputeSemanticAskFirstDeflection,
  type AskFirstCandidate,
} from './custom/ask-first-deflection.ts';
import { SynthesizeLivingThread } from './custom/living-thread-synthesis.ts';

const FORUM_ID = '11111111-1111-4111-8111-111111111111';
const QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const ANSWER_VERIFIED_ID = '33333333-3333-4333-8333-333333333333';
const ANSWER_ACCEPTED_ID = '44444444-4444-4444-8444-444444444444';
const ROOT_POST_ID = '55555555-5555-4555-8555-555555555555';
const REPLY_1_ID = '66666666-6666-4666-8666-666666666666';
const REPLY_2_ID = '77777777-7777-4777-8777-777777777777';
const TAG_NEXUS_ID = '88888888-8888-4888-8888-888888888888';
const USER_ID = '99999999-9999-4999-8999-999999999999';

describe('Slice 3 — Semantic Ask-First Deflection', () => {
  it('deflects paraphrased questions via CommunityEmbeddingPersonalizationService cosine similarity even with minimal exact word overlap', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();

    const candidates: AskFirstCandidate[] = [
      {
        postId: ANSWER_VERIFIED_ID,
        forumSlug: 'tax-regulatory',
        title: 'Wayfair Economic Nexus Jurisdiction Rules',
        authorDisplayName: 'Elena CPA',
        bodyMarkdown:
          'Out-of-state merchants trigger economic nexus filing obligations once gross revenue or transaction thresholds are exceeded in a state jurisdiction.',
        epistemicStatus: 'Canon Verified',
        topicTags: ['Tax', 'Compliance', 'Nexus'],
        isAcceptedByAuthor: true,
        isVerifiedByModerator: true,
      },
      {
        postId: 'ans-graphql',
        forumSlug: 'api-graphql',
        title: 'GraphQL Mutation Batching',
        authorDisplayName: 'Bob Architect',
        bodyMarkdown: 'Use DataLoader to batch resolver queries and avoid N+1 database calls in GraphQL endpoints.',
        epistemicStatus: 'Canon Verified',
        topicTags: ['GraphQL', 'API'],
        isVerifiedByModerator: true,
      },
    ];

    // Paraphrased query: avoids "Wayfair", "economic", "nexus", "jurisdiction" — uses "sales tax", "audit", "statute", "exemption"
    const paraphraseQuery = 'What state sales tax compliance statute and audit exemption rules apply?';
    const lexicalOnly = ComputeAskFirstDeflection(paraphraseQuery, candidates);
    const hybrid = await ComputeSemanticAskFirstDeflection(paraphraseQuery, candidates);

    assert.equal(hybrid.deflected, true, `expected semantic deflection for paraphrase, got score=${hybrid.confidenceScore}`);
    assert.equal(hybrid.citations[0]?.postId, ANSWER_VERIFIED_ID);
    assert.ok((hybrid.citations[0]?.semanticSimilarity ?? 0) > 0.35);
    assert.ok(hybrid.confidenceScore > lexicalOnly.confidenceScore);
    assert.ok(hybrid.suggestedTagSlugs.includes('tax'));
  });

  it('orders epistemic canon boosts strictly: Verified > Accepted > Unverified > Partially Outdated > Conflicts With Canon', async () => {
    const verifiedBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: 'Canon Verified',
      isAcceptedByAuthor: false,
      isVerifiedByModerator: true,
    });
    const verifiedAndAcceptedBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: 'Canon Verified',
      isAcceptedByAuthor: true,
      isVerifiedByModerator: true,
    });
    const acceptedBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: null,
      isAcceptedByAuthor: true,
      isVerifiedByModerator: false,
    });
    const unverifiedBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: null,
      isAcceptedByAuthor: false,
      isVerifiedByModerator: false,
    });
    const outdatedBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: 'Partially Outdated',
      isAcceptedByAuthor: false,
      isVerifiedByModerator: false,
    });
    const conflictBoost = ComputeEpistemicCanonBoost({
      epistemicStatus: 'Conflicts With Canon',
      isAcceptedByAuthor: false,
      isVerifiedByModerator: false,
    });

    assert.ok(verifiedAndAcceptedBoost >= verifiedBoost);
    assert.ok(verifiedBoost > acceptedBoost);
    assert.ok(acceptedBoost > unverifiedBoost);
    assert.ok(unverifiedBoost > outdatedBoost);
    assert.ok(outdatedBoost > conflictBoost);

    // Identical body/title across 3 candidates: Verified must rank #1, Accepted #2, Unverified #3
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    svc.ResetToDefaultProvider();
    const sharedBody = 'Rotate OAuth API tokens with dual-key overlap windows to prevent client downtime.';
    const sharedTitle = 'Zero-downtime OAuth token rotation';

    const res = await ComputeSemanticAskFirstDeflection(
      'How to rotate OAuth API tokens without downtime?',
      [
        {
          postId: 'unverified-1',
          forumSlug: 'security',
          title: sharedTitle,
          authorDisplayName: 'Unverified Author',
          bodyMarkdown: sharedBody,
          epistemicStatus: null,
          isAcceptedByAuthor: false,
          isVerifiedByModerator: false,
        },
        {
          postId: 'accepted-1',
          forumSlug: 'security',
          title: sharedTitle,
          authorDisplayName: 'Accepted Author',
          bodyMarkdown: sharedBody,
          epistemicStatus: null,
          isAcceptedByAuthor: true,
          isVerifiedByModerator: false,
        },
        {
          postId: 'verified-1',
          forumSlug: 'security',
          title: sharedTitle,
          authorDisplayName: 'Verified Author',
          bodyMarkdown: sharedBody,
          epistemicStatus: 'Canon Verified',
          isAcceptedByAuthor: false,
          isVerifiedByModerator: true,
        },
      ],
      { maxCitations: 3 },
    );

    assert.equal(res.deflected, true);
    assert.deepEqual(
      res.citations.map((c) => c.postId),
      ['verified-1', 'accepted-1', 'unverified-1'],
    );
    assert.equal(res.citations[0]?.isVerified, true);
    assert.equal(res.citations[1]?.isAccepted, true);
  });

  it('supports pluggable ICommunityEmbeddingProvider and declines unrelated questions cleanly', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    const customProvider = new CallbackCommunityEmbeddingProvider('AskFirstTestEmbedder', 4, async (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('oauth') || lower.includes('credential') || lower.includes('sso')) {
        return [1, 0, 0, 0];
      }
      if (lower.includes('gardening') || lower.includes('tomato')) {
        return [0, 0, 0, 1];
      }
      return [0, 1, 0, 0];
    });

    try {
      svc.SetEmbeddingProvider(customProvider);
      const candidates: AskFirstCandidate[] = [
        {
          postId: 'sso-canon',
          forumSlug: 'security',
          title: 'OIDC SSO Credential Rollover',
          authorDisplayName: 'Security Lead',
          bodyMarkdown: 'Configure OAuth signing key rotation with overlapping JWKS keys.',
          epistemicStatus: 'Canon Verified',
          isVerifiedByModerator: true,
        },
      ];

      // Zero overlapping words ("credential" vs "OAuth" / "JWKS"), yet custom vector space aligns!
      const match = await ComputeSemanticAskFirstDeflection('How do we handle SSO credential failover?', candidates);
      assert.equal(match.deflected, true);
      assert.equal(match.citations[0]?.postId, 'sso-canon');

      const unrelated = await ComputeSemanticAskFirstDeflection('When should I prune tomato plants?', candidates);
      assert.equal(unrelated.deflected, false);
      assert.deepEqual(unrelated.citations, []);
      assert.equal(unrelated.synthesizedAnswerMarkdown, null);
    } finally {
      svc.ResetToDefaultProvider();
    }
  });

  it('executes AskFirstDeflectionAction end-to-end against RunView joins (Forums, ForumPosts, AnswerPosts, QuestionPosts, Tags)', async () => {
    const { AskFirstDeflectionAction } = await import('../dist/index.js');
    CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();
    const action = new AskFirstDeflectionAction();

    try {
      let runViewsBatchCalls = 0;
      const askFirstHandler = async (params: { EntityName: string; Fields?: string[]; ExtraFilter?: string }) => {
        if (params.Fields?.includes('ForumPostID') || params.ExtraFilter?.includes('ForumPostID')) {
          throw new Error(`Invalid schema query: ForumPostID does not exist on ${params.EntityName}; must use PostID.`);
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.Forums) {
          return { Success: true, Results: [{ ID: FORUM_ID, Slug: 'tax-regulatory' }] };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
          return {
            Success: true,
            Results: [
              {
                ID: QUESTION_ID,
                ForumID: FORUM_ID,
                RootPostID: null,
                ParentPostID: null,
                Title: 'How do state sales tax nexus thresholds work?',
                BodyMarkdown: 'Looking for 2026 economic nexus thresholds across states.',
                SummaryMarkdown: null,
                AuthorUserID: USER_ID,
                AuthorUser: 'Question Author',
              },
              {
                ID: ANSWER_VERIFIED_ID,
                ForumID: FORUM_ID,
                RootPostID: QUESTION_ID,
                ParentPostID: QUESTION_ID,
                Title: null,
                BodyMarkdown:
                  'Most states enforce $100,000 in gross sales or 200 annual transactions for Wayfair economic nexus compliance.',
                SummaryMarkdown: null,
                AuthorUserID: USER_ID,
                AuthorUser: 'Elena Rostova',
              },
              {
                ID: ANSWER_ACCEPTED_ID,
                ForumID: FORUM_ID,
                RootPostID: QUESTION_ID,
                ParentPostID: QUESTION_ID,
                Title: null,
                BodyMarkdown: 'Check individual state revenue portals for nexus threshold updates.',
                SummaryMarkdown: null,
                AuthorUserID: USER_ID,
                AuthorUser: 'Peer Reviewer',
              },
            ],
          };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts) {
          return {
            Success: true,
            Results: [
              {
                ID: ANSWER_VERIFIED_ID,
                QuestionPostID: QUESTION_ID,
                IsAcceptedByAuthor: true,
                IsVerifiedByModerator: true,
                AIEpistemicStatus: 'Canon Verified',
              },
              {
                ID: ANSWER_ACCEPTED_ID,
                QuestionPostID: QUESTION_ID,
                IsAcceptedByAuthor: false,
                IsVerifiedByModerator: false,
                AIEpistemicStatus: null,
              },
            ],
          };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumQuestionPosts) {
          return {
            Success: true,
            Results: [
              {
                ID: QUESTION_ID,
                AcceptedAnswerPostID: ANSWER_VERIFIED_ID,
                AICanonAnswerPostID: ANSWER_VERIFIED_ID,
              },
            ],
          };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPostTags) {
          assert.ok(params.Fields?.includes('PostID'), 'ForumPostTags query must select PostID');
          assert.match(params.ExtraFilter ?? '', /\bPostID\b/);
          return {
            Success: true,
            Results: [{ PostID: QUESTION_ID, TopicTagID: TAG_NEXUS_ID }],
          };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumTopicTags) {
          return {
            Success: true,
            Results: [{ ID: TAG_NEXUS_ID, Name: 'Economic Nexus' }],
          };
        }
        return { Success: true, Results: [] };
      };
      mock.method(RunView.prototype, 'RunView', askFirstHandler);
      mock.method(RunView.prototype, 'RunViews', async (list: Array<{ EntityName: string; Fields?: string[]; ExtraFilter?: string }>) => {
        runViewsBatchCalls += 1;
        return Promise.all(list.map((p) => askFirstHandler(p)));
      });

      const user = new UserInfo(undefined, { ID: USER_ID });
      const runParams = new RunActionParams();
      runParams.ContextUser = user;
      runParams.Filters = [];
      runParams.Params = [
        { Name: 'QueryText', Value: 'What are state sales tax compliance obligations for nexus?', Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: FORUM_ID, Type: 'Input' },
        { Name: 'MaxCitations', Value: '2', Type: 'Input' },
      ];

      const res = await action.Run(runParams);
      assert.equal(runViewsBatchCalls, 2, 'AskFirstDeflectionAction must batch Forums+Posts and Answers+Questions+PostTags via RunViews');
      assert.equal(res.Success, true, res.Message);
      assert.equal(res.ResultCode, 'DEFLECTED');

      const getOut = (name: string) => res.Params?.find((p) => p.Name === name)?.Value;
      assert.equal(getOut('Deflected'), true);
      assert.match(String(getOut('SynthesizedAnswerMarkdown') ?? ''), /\$100,000/);

      const citations = JSON.parse(String(getOut('Citations') ?? '[]')) as Array<{
        postId: string;
        forumSlug: string;
        title: string;
        authorDisplayName: string;
        epistemicStatus: string | null;
        isVerified?: boolean;
        isAccepted?: boolean;
      }>;
      assert.equal(citations.length, 2);
      assert.equal(citations[0].postId, ANSWER_VERIFIED_ID);
      assert.equal(citations[0].forumSlug, 'tax-regulatory');
      assert.equal(citations[0].title, 'How do state sales tax nexus thresholds work?');
      assert.equal(citations[0].authorDisplayName, 'Elena Rostova');
      assert.equal(citations[0].epistemicStatus, 'Canon Verified');
      assert.equal(citations[0].isVerified, true);
      assert.equal(citations[0].isAccepted, true);

      const tagSlugs = JSON.parse(String(getOut('SuggestedTagSlugs') ?? '[]')) as string[];
      assert.ok(tagSlugs.includes('economic-nexus'));

      // Malformed AllowedForumIDs must fail closed with INVALID_FORUM_ID
      const badParams = new RunActionParams();
      badParams.ContextUser = user;
      badParams.Filters = [];
      badParams.Params = [
        { Name: 'QueryText', Value: 'nexus', Type: 'Input' },
        { Name: 'AllowedForumIDs', Value: "' OR '1'='1", Type: 'Input' },
      ];
      const badRes = await action.Run(badParams);
      assert.equal(badRes.Success, false);
      assert.equal(badRes.ResultCode, 'INVALID_FORUM_ID');
    } finally {
      mock.restoreAll();
    }
  });
});

describe('Slice 3 — Living Thread Synthesis (Takeaways, Open Questions, Contributor Citations)', () => {
  it('emits Key Takeaways, Open Questions, and Contributor Attribution with inline citations', () => {
    const result = SynthesizeLivingThread({
      rootTitle: 'Webhook Retry & Dead-Letter Queue Standard',
      rootBodyMarkdown: 'How should services handle transient 429 webhook responses?',
      replies: [
        {
          postId: REPLY_1_ID,
          authorDisplayName: 'Aisha Bell',
          bodyMarkdown:
            'Respect the Retry-After header and apply capped exponential backoff with jitter. Should we standardize on a 24-hour dead-letter retention window?',
          isAccepted: true,
          isVerified: true,
          epistemicStatus: 'Canon Verified',
        },
        {
          postId: REPLY_2_ID,
          authorDisplayName: 'Chidi Okonkwo',
          bodyMarkdown:
            'Include OpenTelemetry traceparent headers on every retry attempt. Open question: do regional relays share a single dead-letter bucket?',
          isAccepted: false,
        },
      ],
    });

    assert.equal(result.consideredReplyCount, 2);
    assert.equal(result.keyTakeaways.length, 2);
    assert.equal(result.openQuestions.length, 2);
    assert.equal(result.contributorCitations.length, 2);

    assert.match(result.aiExecutiveSummary, /\*\*Key resolution\(s\):\*\*/);
    assert.match(result.aiExecutiveSummary, /\*\*Key Takeaways:\*\*/);
    assert.match(result.aiExecutiveSummary, /\*\*Open Questions:\*\*/);
    assert.match(result.aiExecutiveSummary, /\*\*Contributor Attribution:\*\*/);
    assert.match(result.aiExecutiveSummary, /\[1\]/);
    assert.match(result.aiExecutiveSummary, /\[2\]/);
    assert.match(result.aiExecutiveSummary, /Aisha Bell \(Accepted & Canon Verified, post:66666666\)/);
    assert.match(result.aiExecutiveSummary, /Chidi Okonkwo \(Contributor, post:77777777\)/);
  });

  it('executes LivingThreadSynthesisAction end-to-end and persists SummaryMarkdown, SummaryGeneratedAt, and watermark onto root post', async () => {
    const { LivingThreadSynthesisAction } = await import('../dist/index.js');
    const action = new LivingThreadSynthesisAction();

    const savedPosts: Array<{
      SummaryMarkdown: string | null;
      SummaryGeneratedAt: Date | null;
      SummaryReplyWatermark: number;
    }> = [];

    try {
      const synthesisHandler1 = async (params: { EntityName: string; ExtraFilter?: string }) => {
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
          if (params.ExtraFilter?.includes(`RootPostID = '${ROOT_POST_ID}'`)) {
            return {
              Success: true,
              Results: [
                {
                  ID: REPLY_1_ID,
                  BodyMarkdown: 'Invalidate tenant cache keys via pub/sub events within 500ms.',
                  AuthorUserID: USER_ID,
                  AuthorUser: 'Elena Rostova',
                },
                {
                  ID: REPLY_2_ID,
                  BodyMarkdown: 'What fallback TTL should apply if the pub/sub bus drops a message?',
                  AuthorUserID: USER_ID,
                  AuthorUser: 'Mateo Lindqvist',
                },
              ],
            };
          }
          if (params.ExtraFilter?.includes(`ID = '${ROOT_POST_ID}'`)) {
            return {
              Success: true,
              Results: [
                {
                  ID: ROOT_POST_ID,
                  Title: 'Multi-Region GraphQL Caching Architecture',
                  BodyMarkdown: 'Discussing edge cache invalidation strategies across regions.',
                },
              ],
            };
          }
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts) {
          return {
            Success: true,
            Results: [
              {
                ID: REPLY_1_ID,
                IsAcceptedByAuthor: true,
                IsVerifiedByModerator: true,
                AIEpistemicStatus: 'Canon Verified',
              },
            ],
          };
        }
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumQuestionPosts) {
          return {
            Success: true,
            Results: [
              {
                ID: ROOT_POST_ID,
                AcceptedAnswerPostID: REPLY_1_ID,
                AICanonAnswerPostID: REPLY_1_ID,
              },
            ],
          };
        }
        return { Success: true, Results: [] };
      };
      mock.method(RunView.prototype, 'RunView', synthesisHandler1);
      mock.method(RunView.prototype, 'RunViews', async (list: Array<{ EntityName: string; ExtraFilter?: string }>) =>
        Promise.all(list.map((p) => synthesisHandler1(p))),
      );

      mock.method(Metadata.prototype, 'GetEntityObject', async () => {
        const entity = {
          SummaryMarkdown: null as string | null,
          SummaryGeneratedAt: null as Date | null,
          SummaryReplyWatermark: 0,
          Save: async () => {
            savedPosts.push({
              SummaryMarkdown: entity.SummaryMarkdown,
              SummaryGeneratedAt: entity.SummaryGeneratedAt,
              SummaryReplyWatermark: entity.SummaryReplyWatermark,
            });
            return true;
          },
        };
        return entity;
      });

      const user = new UserInfo(undefined, { ID: USER_ID });
      const runParams = new RunActionParams();
      runParams.ContextUser = user;
      runParams.Filters = [];
      runParams.Params = [{ Name: 'RootPostID', Value: ROOT_POST_ID, Type: 'Input' }];

      const res = await action.Run(runParams);
      assert.equal(res.Success, true, res.Message);
      assert.equal(res.ResultCode, 'SUCCESS');
      assert.equal(savedPosts.length, 1);
      assert.equal(savedPosts[0].SummaryReplyWatermark, 2);
      assert.ok(savedPosts[0].SummaryGeneratedAt instanceof Date);
      assert.match(savedPosts[0].SummaryMarkdown ?? '', /\*\*Key Takeaways:\*\*/);
      assert.match(savedPosts[0].SummaryMarkdown ?? '', /\*\*Open Questions:\*\*/);
      assert.match(savedPosts[0].SummaryMarkdown ?? '', /\*\*Contributor Attribution:\*\*/);
      assert.match(savedPosts[0].SummaryMarkdown ?? '', /Elena Rostova/);

      const getOut = (name: string) => res.Params?.find((p) => p.Name === name)?.Value;
      const takeaways = JSON.parse(String(getOut('KeyTakeaways') ?? '[]')) as string[];
      const openQuestions = JSON.parse(String(getOut('OpenQuestions') ?? '[]')) as string[];
      assert.equal(takeaways.length, 2);
      assert.equal(openQuestions.length, 1);
    } finally {
      mock.restoreAll();
    }
  });

  it('uses managed AI Prompt (Gemini 3.5 Flash-Lite), serves cache hits when thread is unchanged, and regenerates on thread edits or ForceRegenerate', async () => {
    const { LivingThreadSynthesisAction } = await import('../dist/index.js');

    let promptCalls = 0;
    let saveCalls = 0;
    let storedSummary: string | null = null;
    let storedGeneratedAt: Date | null = null;
    let storedWatermark: number | null = null;
    let replies = [
      {
        ID: REPLY_1_ID,
        BodyMarkdown: 'Use dual-active keys for 24h before revoking the legacy secret.',
        AuthorUserID: USER_ID,
        AuthorUser: 'Elena Rostova',
      },
    ];

    class TestableSynthesisAction extends LivingThreadSynthesisAction {
      protected override async findSynthesisPrompt() {
        return { ID: '268C3B8F-9284-4DA2-84A8-40FEF21AB5ED', Name: 'Community: Living Thread Synthesis' } as never;
      }

      protected override async executeSynthesisPrompt() {
        promptCalls += 1;
        return {
          success: true,
          modelName: 'Gemini 3.5 Flash-Lite',
          result: {
            executiveSummary: `AI synthesis run #${promptCalls}: dual-active rollover recommended.`,
            keyTakeaways: ['Mint secondary key and overlap for 24h [1]'],
            openQuestions: [],
          },
        };
      }
    }

    const action = new TestableSynthesisAction();
    try {
      const synthesisHandler2 = async (params: { EntityName: string; ExtraFilter?: string }) => {
        if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
          if (params.ExtraFilter?.includes(`RootPostID = '${ROOT_POST_ID}'`)) {
            return { Success: true, Results: replies };
          }
          if (params.ExtraFilter?.includes(`ID = '${ROOT_POST_ID}'`)) {
            return {
              Success: true,
              Results: [
                {
                  ID: ROOT_POST_ID,
                  Title: 'Zero-Downtime Key Rotation',
                  BodyMarkdown: 'How should we rotate API keys safely?',
                  SummaryMarkdown: storedSummary,
                  SummaryGeneratedAt: storedGeneratedAt,
                  SummaryReplyWatermark: storedWatermark,
                },
              ],
            };
          }
        }
        return { Success: true, Results: [] };
      };
      mock.method(RunView.prototype, 'RunView', synthesisHandler2);
      mock.method(RunView.prototype, 'RunViews', async (list: Array<{ EntityName: string; ExtraFilter?: string }>) =>
        Promise.all(list.map((p) => synthesisHandler2(p))),
      );

      mock.method(Metadata.prototype, 'GetEntityObject', async () => {
        const entity = {
          SummaryMarkdown: null as string | null,
          SummaryGeneratedAt: null as Date | null,
          SummaryReplyWatermark: 0,
          Save: async () => {
            saveCalls += 1;
            storedSummary = entity.SummaryMarkdown;
            storedGeneratedAt = entity.SummaryGeneratedAt;
            storedWatermark = entity.SummaryReplyWatermark;
            return true;
          },
        };
        return entity;
      });

      const user = new UserInfo(undefined, { ID: USER_ID });
      const invoke = async (force = false) => {
        const rp = new RunActionParams();
        rp.ContextUser = user;
        rp.Filters = [];
        rp.Params = [{ Name: 'RootPostID', Value: ROOT_POST_ID, Type: 'Input' }];
        if (force) {
          rp.Params.push({ Name: 'ForceRegenerate', Value: 'true', Type: 'Input' });
        }
        const out = await action.Run(rp);
        const param = (name: string) => out.Params?.find((p) => p.Name === name)?.Value;
        return { out, param };
      };

      // 1st call: cache miss -> calls Gemini 3.5 Flash-Lite & persists cache metadata
      const first = await invoke(false);
      assert.equal(first.out.Success, true);
      assert.equal(promptCalls, 1);
      assert.equal(saveCalls, 1);
      assert.equal(first.param('CacheHit'), 'false');
      assert.equal(first.param('ModelUsed'), 'Gemini 3.5 Flash-Lite');
      assert.equal(first.param('AIExecutiveSummary'), 'AI synthesis run #1: dual-active rollover recommended.');

      // 2nd call (thread unchanged): cache hit -> 0 extra LLM calls, 0 extra saves
      const second = await invoke(false);
      assert.equal(second.out.Success, true);
      assert.equal(promptCalls, 1);
      assert.equal(saveCalls, 1);
      assert.equal(second.param('CacheHit'), 'true');
      assert.equal(second.param('ModelUsed'), 'Gemini 3.5 Flash-Lite');
      assert.equal(second.param('AIExecutiveSummary'), 'AI synthesis run #1: dual-active rollover recommended.');

      // 3rd call (ForceRegenerate=true): bypasses cache and regenerates
      const forced = await invoke(true);
      assert.equal(forced.out.Success, true);
      assert.equal(promptCalls, 2);
      assert.equal(saveCalls, 2);
      assert.equal(forced.param('CacheHit'), 'false');
      assert.equal(forced.param('AIExecutiveSummary'), 'AI synthesis run #2: dual-active rollover recommended.');

      // 4th call (new reply added): fingerprint & watermark change -> cache invalidated automatically
      replies = [
        ...replies,
        {
          ID: REPLY_2_ID,
          BodyMarkdown: 'Should we also emit a webhook alert when legacy keys are retired?',
          AuthorUserID: USER_ID,
          AuthorUser: 'Mateo Lindqvist',
        },
      ];
      const afterNewReply = await invoke(false);
      assert.equal(afterNewReply.out.Success, true);
      assert.equal(promptCalls, 3);
      assert.equal(saveCalls, 3);
      assert.equal(afterNewReply.param('CacheHit'), 'false');
      assert.equal(afterNewReply.param('ConsideredReplyCount'), 2);
    } finally {
      mock.restoreAll();
    }
  });
});
