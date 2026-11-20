import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserInfo } from '@memberjunction/core';
import {
  GRADUATE_COMMUNITY_THREAD_MUTATION,
  InvokeGraduateCommunityThreadMutation,
  InvokePromoteCommunityAnswerToCanonMutation,
  PROMOTE_COMMUNITY_ANSWER_TO_CANON_MUTATION,
  PromoteAnswerToCanonViaProvider,
  type CommunityGraphQLExecutor,
} from './lib/community-hub-mutations.ts';
import {
  CalculateSlaCapacitySpec,
  ComputeIdeationWalletSummary,
  ComputeIdeaPointPresets,
  ComputeQaCanonStats,
  ComputeQuadraticEffectiveVotes,
  DEFAULT_CAMPAIGN_BUDGET_POINTS,
  FilterLivingDocItems,
  FilterQaCanonItems,
  GetEpistemicBadgeTone,
  GetLivingDocTypeMeta,
  NormalizeCampaignBudget,
  ResolveVisibleLivingDoc,
  ResolveVisibleQaItem,
  SyncLivingDocSelection,
  SyncQaSelection,
} from './lib/community-hub-workbench.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');

describe('Slice 1 Polish — Active Campaign Budget Initialization & ExportDigestPDF Preservation', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const hubCss = readFileSync(join(LIB_DIR, 'community-hub-resource.component.css'), 'utf8');

  it('normalizes null, undefined, or non-positive campaign DefaultBudgetPoints to 100 so initial wallet never shows 0 pts', () => {
    assert.equal(NormalizeCampaignBudget(undefined), DEFAULT_CAMPAIGN_BUDGET_POINTS);
    assert.equal(NormalizeCampaignBudget(null), DEFAULT_CAMPAIGN_BUDGET_POINTS);
    assert.equal(NormalizeCampaignBudget(0), DEFAULT_CAMPAIGN_BUDGET_POINTS);
    assert.equal(NormalizeCampaignBudget(-25), DEFAULT_CAMPAIGN_BUDGET_POINTS);
    assert.equal(NormalizeCampaignBudget(NaN), DEFAULT_CAMPAIGN_BUDGET_POINTS);
    assert.equal(NormalizeCampaignBudget(150), 150);

    assert.match(hubTs, /NormalizeCampaignBudget\(c\.DefaultBudgetPoints/);
    assert.match(hubTs, /ComputeIdeationWalletSummary\(this\.visibleIdeationItems,\s*this\.activeCampaign\.budgetPoints\)/);
  });

  it('retains Community.ExportDigestPDF action wiring and active tab hover specificity fix', () => {
    assert.match(hubTs, /ResolveCommunityActionIDWithRunView\('ExportDigestPDF'\)/);
    assert.ok(hubHtml.includes('exportDigestPdf()'));
    assert.match(hubCss, /\.mjc-community-hub__tab--active,\s*\n\.mjc-community-hub__tab--active:hover/);
  });
});

describe('Slice 2 UX Alignment — Q&A Canon Workbench Component & Epistemic Helpers', () => {
  const qaTs = readFileSync(join(LIB_DIR, 'qa-canon-workbench.component.ts'), 'utf8');
  const qaHtml = readFileSync(join(LIB_DIR, 'qa-canon-workbench.component.html'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  const sampleQa = [
    {
      id: 'qa-1',
      questionPostId: 'q-1',
      title: 'How do I rotate my API key without downtime?',
      bodyMarkdown: 'Deploy secondary key before revoking legacy key.',
      epistemicStatus: 'Canon Verified' as const,
      confidenceScore: 0.94,
      isAccepted: true,
    },
    {
      id: 'qa-2',
      questionPostId: 'q-2',
      title: 'How do webhook delivery retries handle 429 rate limits?',
      bodyMarkdown: 'Exponential backoff honors Retry-After.',
      epistemicStatus: 'Partially Outdated' as const,
      confidenceScore: 0.78,
      isAccepted: false,
    },
    {
      id: 'qa-3',
      questionPostId: 'q-3',
      title: 'How should tenant schema migrations stay deterministic?',
      bodyMarkdown: 'Validate dual-dialect parity and boolean casts.',
      epistemicStatus: 'Novel Insight' as const,
      confidenceScore: null,
      isAccepted: false,
    },
    {
      id: 'qa-4',
      questionPostId: 'q-4',
      title: 'Legacy v1 XML token exchange endpoint',
      bodyMarkdown: 'Deprecated in favor of OAuth2 PKCE.',
      epistemicStatus: 'Conflicts With Canon' as const,
      confidenceScore: 0.4,
      isAccepted: false,
    },
  ];

  it('computes accurate Q&A Canon summary stats and epistemic badge tones', () => {
    const stats = ComputeQaCanonStats(sampleQa);
    assert.equal(stats.total, 4);
    assert.equal(stats.canonVerifiedCount, 1);
    assert.equal(stats.canonVerifiedCount, FilterQaCanonItems(sampleQa, 'canon-verified', '').length);
    assert.equal(stats.acceptedCount, 1);
    assert.equal(stats.averageConfidencePct, 71);

    assert.equal(GetEpistemicBadgeTone('Canon Verified', true), 'success');
    assert.equal(GetEpistemicBadgeTone('Partially Outdated', false), 'warning');
    assert.equal(GetEpistemicBadgeTone('Novel Insight', false), 'warning');
    assert.equal(GetEpistemicBadgeTone('Conflicts With Canon', false), 'danger');
  });

  it('filters Q&A entries cleanly by epistemic status and search query', () => {
    assert.equal(FilterQaCanonItems(sampleQa, 'all', '').length, 4);
    assert.equal(FilterQaCanonItems(sampleQa, 'canon-verified', '').length, 1);
    assert.equal(FilterQaCanonItems(sampleQa, 'novel-insight', '').length, 1);
    assert.equal(FilterQaCanonItems(sampleQa, 'needs-review', '').length, 2);
    assert.equal(FilterQaCanonItems(sampleQa, 'all', '429 rate').length, 1);
  });

  it('syncs Q&A selection only on user filter/search helpers and omits ngOnChanges in child components', () => {
    const visible = ResolveVisibleQaItem(sampleQa, 'qa-3', 'canon-verified', '');
    assert.equal(visible?.id, 'qa-1');
    const sync = SyncQaSelection({
      items: sampleQa,
      selectedQaId: 'qa-3',
      filterKey: 'canon-verified',
      searchQuery: '',
    });
    assert.equal(sync.changed, true);
    assert.equal(sync.selectedQaId, 'qa-1');
    assert.doesNotMatch(qaTs, /\bngOnChanges\b/);
  });

  it('wires QaCanonWorkbenchComponent with OnPush and required E2E/ARIA selectors', () => {
    assert.match(qaTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(hubHtml, /<mjc-qa-canon-workbench/);
    for (const selectorId of [
      'mjc-qa-toggle-composer-btn',
      'mjc-qa-new-title',
      'mjc-qa-new-body',
      'mjc-qa-submit-question-btn',
      'mjc-qa-grade-btn',
      'mjc-qa-promote-btn',
      'mjc-qa-answer-input',
      'mjc-qa-submit-answer-btn',
    ]) {
      assert.ok(qaHtml.includes(selectorId), `Missing Q&A selector ${selectorId}`);
    }
    assert.ok(qaHtml.includes('mjc-community-hub__status'));
  });
});

describe('Slice 2 UX Alignment — Quadratic Ideation Wallet Board & Presets', () => {
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  it('computes wallet summary, utilization, and quadratic effective votes accurately', () => {
    const summary = ComputeIdeationWalletSummary(
      [
        {
          id: 'i1',
          campaignId: 'c1',
          title: 'Idea 1',
          summary: 'S1',
          totalPointsAllocated: 36,
          effectiveQuadraticVotes: 6,
          myPointsAllocated: 36,
          myEffectiveVotes: 6,
        },
        {
          id: 'i2',
          campaignId: 'c1',
          title: 'Idea 2',
          summary: 'S2',
          totalPointsAllocated: 0,
          effectiveQuadraticVotes: 0,
          myPointsAllocated: 0,
          myEffectiveVotes: 0,
        },
      ],
      100,
    );
    assert.equal(summary.budgetPoints, 100);
    assert.equal(summary.spentPoints, 36);
    assert.equal(summary.remainingPoints, 64);
    assert.equal(summary.utilizationPct, 36);
    assert.equal(summary.backedIdeasCount, 1);
    assert.equal(ComputeQuadraticEffectiveVotes(25, 'Quadratic'), 5);
    assert.equal(ComputeQuadraticEffectiveVotes(25, 'Point Allocation'), 25);
  });

  it('computes valid point presets capped by remaining wallet and maxPointsPerIdea', () => {
    const presets = ComputeIdeaPointPresets({
      mode: 'Quadratic',
      currentPoints: 16,
      remainingBudget: 24,
      maxPointsPerIdea: 40,
      budgetPoints: 100,
    });
    assert.deepEqual(presets, [0, 4, 9, 16, 25, 36]);
  });

  it('renders wallet hero summary, 2-column ideation grid, and sticky allocation console', () => {
    assert.ok(hubHtml.includes('mjc-wallet-hero'));
    assert.ok(hubHtml.includes('mjc-wallet-stat-card'));
    assert.ok(hubHtml.includes('mjc-ideation-grid'));
    assert.ok(hubHtml.includes('mjc-ideation-console'));
    assert.ok(hubHtml.includes('applyQuickIdeaAllocation('));
  });
});

describe('Slice 2 UX Alignment — Living Co-Authoring & Interactive Mini-Apps Workbench', () => {
  const livingTs = readFileSync(join(LIB_DIR, 'living-co-authoring.component.ts'), 'utf8');
  const livingHtml = readFileSync(join(LIB_DIR, 'living-co-authoring.component.html'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  const sampleDocs = [
    {
      id: 'd1',
      title: 'OAuth2 Partner Onboarding Playbook',
      bodyMarkdown: 'Configure PKCE callback URLs',
      postTypeCode: 'collaborative-doc' as const,
    },
    {
      id: 'd2',
      title: 'Partner Readiness Check-In Form',
      bodyMarkdown: 'Inline readiness form',
      postTypeCode: 'collaborative-sheet' as const,
    },
    {
      id: 'd3',
      title: 'Platform Trivia: Test Your Onboarding Knowledge',
      bodyMarkdown: 'Interactive knowledge check',
      postTypeCode: 'interactive-experience' as const,
      experienceKind: 'Trivia' as const,
    },
  ];

  it('filters living artifacts by type and maps domain-neutral type metadata', () => {
    assert.equal(FilterLivingDocItems(sampleDocs, 'all', '').length, 3);
    assert.equal(FilterLivingDocItems(sampleDocs, 'playbooks', '').length, 1);
    assert.equal(FilterLivingDocItems(sampleDocs, 'forms', '').length, 1);
    assert.equal(FilterLivingDocItems(sampleDocs, 'mini-apps', '').length, 1);

    assert.equal(GetLivingDocTypeMeta(sampleDocs[0]).label, 'Living Playbook');
    assert.equal(GetLivingDocTypeMeta(sampleDocs[1]).label, 'Inline Form');
    assert.equal(GetLivingDocTypeMeta(sampleDocs[2]).badgeText, 'Sandbox · Trivia');

    const visibleDoc = ResolveVisibleLivingDoc(sampleDocs, 'd1', 'forms', '');
    assert.equal(visibleDoc?.id, 'd2');
    const syncDoc = SyncLivingDocSelection({
      items: sampleDocs,
      selectedDocId: 'd1',
      editingDocMarkdown: '',
      filterKey: 'forms',
      searchQuery: '',
    });
    assert.equal(syncDoc.changed, true);
    assert.equal(syncDoc.selectedDocId, 'd2');
    assert.doesNotMatch(livingTs, /\bngOnChanges\b/);
  });

  it('computes domain-neutral SLA & Capacity calculator specs deterministically', () => {
    const single = CalculateSlaCapacitySpec({
      targetRps: 500,
      maxP95LatencyMs: 150,
      topologyProfile: 'single-region',
    });
    const multi = CalculateSlaCapacitySpec({
      targetRps: 500,
      maxP95LatencyMs: 150,
      topologyProfile: 'multi-region-active',
    });
    assert.equal(single.recommendedReplicas, 2);
    assert.equal(multi.recommendedReplicas, 3);
    assert.ok(multi.burstQueueCapacity > single.burstQueueCapacity);
  });

  it('wires LivingCoAuthoringComponent with OnPush, sandbox="allow-scripts", and required E2E IDs', () => {
    assert.match(livingTs, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
    assert.match(hubHtml, /<mjc-living-co-authoring/);
    for (const selectorId of [
      'mjc-living-doc-editor',
      'mjc-living-doc-save-btn',
      'mjc-living-doc-synth-btn',
      'mjc-form-respondent',
      'mjc-form-rating',
      'mjc-form-comments',
      'mjc-form-submit-btn',
      'mjc-interactive-miniapp-frame',
      'mjc-miniapp-reset-btn',
      'mjc-calc-save-preset-btn',
    ]) {
      assert.ok(livingHtml.includes(selectorId), `Missing Living Co-Authoring selector ${selectorId}`);
    }
    assert.match(livingHtml, /sandbox="allow-scripts"/);
  });
});

describe('Slice 2 — Graduation/Canon GraphQL Bridge & Idea PostType Fix', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const rootPostId = '11111111-1111-4111-8111-111111111111';
  const questionId = '22222222-2222-4222-8222-222222222222';
  const answerId = '33333333-3333-4333-8333-333333333333';
  const spaceId = '44444444-4444-4444-8444-444444444444';

  it('InvokeGraduateCommunityThreadMutation sends typed ExecuteGQL payload and returns promoted Space details', async () => {
    let capturedQuery = '';
    let capturedInput: object | null = null;
    const executor: CommunityGraphQLExecutor = {
      ExecuteGQL: async (query, variables) => {
        capturedQuery = query;
        capturedInput = variables.input;
        return {
          GraduateCommunityThread: {
            Success: true,
            PromotedToSpaceID: spaceId,
            TargetSpaceTypeCode: 'working-group',
            SeededTaskID: null,
            InvitedParticipantCount: 3,
          },
        };
      },
    };

    const res = await InvokeGraduateCommunityThreadMutation(executor, {
      RootPostID: rootPostId,
      TargetSpaceTypeCode: 'working-group',
      TargetSpaceName: 'Tax Policy Group',
      IncludeParticipantUserIDs: ['55555555-5555-4555-8555-555555555555'],
    });

    assert.equal(capturedQuery, GRADUATE_COMMUNITY_THREAD_MUTATION);
    assert.deepEqual(capturedInput, {
      RootPostID: rootPostId,
      TargetSpaceTypeCode: 'working-group',
      TargetSpaceName: 'Tax Policy Group',
      IncludeParticipantUserIDs: ['55555555-5555-4555-8555-555555555555'],
    });
    assert.equal(res.Success, true);
    assert.equal(res.PromotedToSpaceID, spaceId);
    assert.equal(res.InvitedParticipantCount, 3);
  });

  it('PromoteAnswerToCanonViaProvider calls server GraphQL mutation atomically when provider exists', async () => {
    const user = new UserInfo(undefined, { ID: '66666666-6666-4666-8666-666666666666' });
    let executedQuery = '';
    const res = await PromoteAnswerToCanonViaProvider({
      questionPostId: questionId,
      canonAnswerPostId: answerId,
      provider: {
        CurrentUser: user,
        ExecuteGQL: async (query) => {
          executedQuery = query;
          return {
            PromoteCommunityAnswerToCanon: {
              Success: true,
              QuestionPostID: questionId,
              CanonAnswerPostID: answerId,
              AlreadyPromoted: false,
            },
          };
        },
      },
    });

    assert.equal(executedQuery, PROMOTE_COMMUNITY_ANSWER_TO_CANON_MUTATION);
    assert.equal(res.success, true);
    assert.equal(res.offlineFallback, false);
    assert.equal(res.alreadyPromoted, false);
  });

  it('PromoteAnswerToCanonViaProvider fails closed when Metadata.Provider exists and GraphQL/auth/mutation fails, and falls back only when !provider', async () => {
    const user = new UserInfo(undefined, { ID: '66666666-6666-4666-8666-666666666666' });

    // Missing CurrentUser when provider exists -> fail closed
    const noUserRes = await PromoteAnswerToCanonViaProvider({
      questionPostId: questionId,
      canonAnswerPostId: answerId,
      provider: {
        CurrentUser: undefined,
        ExecuteGQL: async () => ({ PromoteCommunityAnswerToCanon: { Success: true } }),
      },
    });
    assert.equal(noUserRes.success, false);
    assert.equal(noUserRes.offlineFallback, false);

    // Missing ExecuteGQL when provider exists -> fail closed
    const noGqlRes = await PromoteAnswerToCanonViaProvider({
      questionPostId: questionId,
      canonAnswerPostId: answerId,
      provider: { CurrentUser: user },
    });
    assert.equal(noGqlRes.success, false);
    assert.equal(noGqlRes.offlineFallback, false);

    // Server denies permission -> fail closed
    const deniedRes = await PromoteAnswerToCanonViaProvider({
      questionPostId: questionId,
      canonAnswerPostId: answerId,
      provider: {
        CurrentUser: user,
        ExecuteGQL: async () => ({
          PromoteCommunityAnswerToCanon: {
            Success: false,
            ErrorMessage: 'Only the question author or a forum moderator may promote an answer to Knowledge Canon.',
          },
        }),
      },
    });
    assert.equal(deniedRes.success, false);
    assert.match(deniedRes.errorMessage ?? '', /question author or a forum moderator/i);

    // Standalone offline harness (!Metadata.Provider) -> offline fallback preserved
    const offlineRes = await PromoteAnswerToCanonViaProvider({
      questionPostId: questionId,
      canonAnswerPostId: answerId,
      provider: null,
    });
    assert.equal(offlineRes.success, true);
    assert.equal(offlineRes.offlineFallback, true);
  });

  it('InvokePromoteCommunityAnswerToCanonMutation handles empty GraphQL response cleanly', async () => {
    const executor: CommunityGraphQLExecutor = {
      ExecuteGQL: async () => null,
    };
    const res = await InvokePromoteCommunityAnswerToCanonMutation(executor, {
      QuestionPostID: questionId,
      CanonAnswerPostID: answerId,
    });
    assert.equal(res.Success, false);
    assert.match(res.ErrorMessage ?? '', /empty response/i);
  });

  it('CommunityHubResource uses IDEA_POST_TYPE_CODE ("idea-proposal") and PromoteAnswerToCanonViaProvider without split client saves', () => {
    assert.match(hubTs, /resolvePostTypeId\(IDEA_POST_TYPE_CODE\)/);
    assert.doesNotMatch(hubTs, /resolvePostTypeId\(['"]idea['"]\)/);
    assert.match(hubTs, /PromoteAnswerToCanonViaProvider\(/);
    assert.doesNotMatch(hubTs, /question\.AICanonAnswerPostID\s*=/);
  });
});
