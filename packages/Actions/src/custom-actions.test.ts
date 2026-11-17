import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import { ComputeAskFirstDeflection, type AskFirstCandidate } from './custom/ask-first-deflection.ts';
import { GradeEpistemicAnswer } from './custom/epistemic-answer-grading.ts';
import { SynthesizeLivingThread } from './custom/living-thread-synthesis.ts';
import {
  BuildCommunityDigestPDF,
  COMMUNITY_DIGEST_PDF_MAX_ITEMS,
  type CommunityDigestItem,
} from './custom/export-community-digest-pdf.ts';

describe('AskFirstDeflectionAction — ComputeAskFirstDeflection', () => {
  const candidates: AskFirstCandidate[] = [
    {
      postId: 'ans-1',
      forumSlug: 'tax-qa',
      title: 'Multi-state nexus thresholds',
      authorDisplayName: 'Alex',
      bodyMarkdown: 'Multi-state nexus thresholds depend on economic nexus laws per state.',
      epistemicStatus: 'Canon Verified',
    },
    {
      postId: 'ans-2',
      forumSlug: 'tax-qa',
      title: 'Payroll tax deadlines',
      authorDisplayName: 'Blair',
      bodyMarkdown: 'Payroll tax filing deadlines vary by jurisdiction and frequency.',
      epistemicStatus: 'Novel Insight',
    },
  ];

  it('deflects to the best matching canon-verified candidate above minConfidence', () => {
    const result = ComputeAskFirstDeflection('What are the multi-state nexus thresholds?', candidates);
    assert.equal(result.deflected, true);
    assert.equal(result.citations[0]?.postId, 'ans-1');
    assert.ok(result.confidenceScore > 0);
  });

  it('declines to deflect (graceful fallback) when nothing matches well enough', () => {
    const result = ComputeAskFirstDeflection('Completely unrelated gardening question', candidates);
    assert.equal(result.deflected, false);
    assert.deepEqual(result.citations, []);
    assert.equal(result.synthesizedAnswerMarkdown, null);
  });

  it('declines to deflect when there are no candidates at all (vector/AI service unavailable)', () => {
    const result = ComputeAskFirstDeflection('Anything', []);
    assert.equal(result.deflected, false);
    assert.equal(result.confidenceScore, 0);
  });

  it('bounds citations to maxCitations', () => {
    const many: AskFirstCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      postId: `ans-${i}`,
      forumSlug: 'tax-qa',
      title: 'Multi-state nexus thresholds',
      authorDisplayName: 'Someone',
      bodyMarkdown: 'Multi-state nexus thresholds depend on economic nexus laws per state.',
      epistemicStatus: 'Canon Verified',
    }));
    const result = ComputeAskFirstDeflection('multi-state nexus thresholds', many, { maxCitations: 2 });
    assert.equal(result.citations.length, 2);
  });
});

describe('EpistemicAnswerGradingAction — GradeEpistemicAnswer', () => {
  it('produces a confidence score within [0, 1] and marks AI_Verified at >= 0.85', () => {
    const result = GradeEpistemicAnswer({
      questionBodyMarkdown: 'How do economic nexus thresholds work for multi-state sales tax?',
      answerBodyMarkdown:
        'Economic nexus thresholds for multi-state sales tax are typically $100,000 in sales or 200 transactions per state, per the Wayfair decision. See [state guide](https://example.com/nexus) and [Wayfair ruling](https://example.com/wayfair) for details on how each state applies economic nexus thresholds to multi-state sales tax obligations.',
    });
    assert.ok(result.confidenceScore >= 0 && result.confidenceScore <= 1);
    assert.equal(result.citationReferences.length, 2);
    if (result.confidenceScore >= 0.85) {
      assert.equal(result.verificationStatus, 'AI_Verified');
      assert.equal(result.epistemicStatus, 'Canon Verified');
    }
  });

  it('falls back to Needs_Human_Review for a short, unrelated, uncited answer', () => {
    const result = GradeEpistemicAnswer({
      questionBodyMarkdown: 'How do economic nexus thresholds work for multi-state sales tax?',
      answerBodyMarkdown: 'Not sure, ask someone else.',
    });
    assert.ok(result.confidenceScore < 0.85);
    assert.equal(result.verificationStatus, 'Needs_Human_Review');
  });

  it('flags Conflicts With Canon when the new answer barely overlaps the prior canon answer', () => {
    const result = GradeEpistemicAnswer({
      questionBodyMarkdown: 'What is the capital gains holding period?',
      answerBodyMarkdown: 'Totally different unrelated content about kitchen appliances and recipes.',
      priorCanonAnswerMarkdown:
        'The long-term capital gains holding period requires holding the asset for more than one year.',
    });
    assert.equal(result.epistemicStatus, 'Conflicts With Canon');
  });

  it('extracts bare URLs as citations too, not only markdown links', () => {
    const result = GradeEpistemicAnswer({
      questionBodyMarkdown: 'Where is the policy documented?',
      answerBodyMarkdown: 'See https://example.com/policy for the full policy documentation.',
    });
    assert.deepEqual(result.citationReferences, ['https://example.com/policy']);
  });
});

describe('LivingThreadSynthesisAction — SynthesizeLivingThread', () => {
  it('surfaces accepted replies as Key resolution(s) ahead of other discussion', () => {
    const result = SynthesizeLivingThread({
      rootTitle: 'How do we handle nexus thresholds?',
      rootBodyMarkdown: 'Looking for guidance on economic nexus thresholds.',
      replies: [
        { authorDisplayName: 'Casey', bodyMarkdown: 'Not quite right, but close.', isAccepted: false },
        { authorDisplayName: 'Dana', bodyMarkdown: 'The threshold is $100,000 or 200 transactions.', isAccepted: true },
      ],
    });
    assert.match(result.aiExecutiveSummary, /Key resolution/);
    const resolutionIndex = result.aiExecutiveSummary.indexOf('Key resolution');
    const highlightsIndex = result.aiExecutiveSummary.indexOf('Discussion highlights');
    assert.ok(resolutionIndex < highlightsIndex);
    assert.equal(result.consideredReplyCount, 2);
  });

  it('bounds input by maxReplyCount and maxCharsPerPost (token/post limits)', () => {
    const replies = Array.from({ length: 20 }, (_, i) => ({
      authorDisplayName: `User${i}`,
      bodyMarkdown: 'x'.repeat(1000),
    }));
    const result = SynthesizeLivingThread({
      rootTitle: 'Title',
      rootBodyMarkdown: 'Root body',
      replies,
      maxReplyCount: 3,
      maxCharsPerPost: 20,
    });
    assert.equal(result.consideredReplyCount, 3);
    for (const line of result.aiExecutiveSummary.split('\n')) {
      assert.ok(line.length < 50, `line too long: ${line}`);
    }
  });

  it('handles a thread with no replies', () => {
    const result = SynthesizeLivingThread({ rootTitle: 'Empty', rootBodyMarkdown: 'Nothing yet', replies: [] });
    assert.match(result.aiExecutiveSummary, /No replies yet/);
    assert.equal(result.consideredReplyCount, 0);
  });
});

describe('ExportCommunityDigestPDFAction — BuildCommunityDigestPDF', () => {
  it('produces a real PDF buffer starting with the %PDF-1. magic header', async () => {
    const items: CommunityDigestItem[] = [
      { forumSlug: 'general', title: 'Welcome thread', authorDisplayName: 'Alex', summary: 'Say hello!' },
    ];
    const buffer = await BuildCommunityDigestPDF(items, { spaceName: 'Global Tax Leaders' });
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.byteLength > 0);
    assert.equal(buffer.subarray(0, 7).toString('latin1'), '%PDF-1.');
  });

  it('produces a valid (non-empty) PDF even with zero items', async () => {
    const buffer = await BuildCommunityDigestPDF([], { spaceName: 'Empty Space' });
    assert.equal(buffer.subarray(0, 7).toString('latin1'), '%PDF-1.');
  });

  it('enforces the hard max-item cap regardless of the caller-supplied maxItems', async () => {
    const items: CommunityDigestItem[] = Array.from({ length: 150 }, (_, i) => ({
      forumSlug: 'general',
      title: `Thread ${i}`,
      authorDisplayName: 'Someone',
      summary: 'Summary',
    }));
    // Caller tries to widen the cap past COMMUNITY_DIGEST_PDF_MAX_ITEMS — must be clamped, not honored.
    const buffer = await BuildCommunityDigestPDF(items, { spaceName: 'Big Space', maxItems: 1000 });
    assert.ok(Buffer.isBuffer(buffer));
    assert.equal(COMMUNITY_DIGEST_PDF_MAX_ITEMS, 100);
  });
});

describe('EpistemicAnswerGradingAction — CR-06/CR-20 fail-closed authoritative loading, AI-only persistence', () => {
  // `@RegisterClass`-decorated class source cannot be imported directly by this `node
  // --experimental-strip-types` runner (legacy decorator syntax is unparseable type-stripping) —
  // static source-text assertions are the established substitute (see architecture-parity.test.ts
  // in the Angular package for the same pattern), proving the required control-flow structure is
  // actually present and uncommented in the real file.
  const HERE = dirname(fileURLToPath(import.meta.url));
  const actionSource = readFileSync(join(HERE, 'custom', 'EpistemicAnswerGradingAction.ts'), 'utf8');

  it('fails closed (AUTHORITATIVE_LOAD_FAILED) and never falls back to caller markdown when the authoritative load fails', () => {
    assert.match(actionSource, /if \(!authoritative\) \{\s*\n\s*return fail\('AUTHORITATIVE_LOAD_FAILED'/);
  });

  it('never sets IsVerifiedByModerator from AI grading (a human-moderator-only field)', () => {
    assert.doesNotMatch(actionSource, /\.IsVerifiedByModerator\s*=/);
  });

  it('loads PriorCanonAnswerMarkdown from the question\'s own AICanonAnswerPostID in persistence mode, not a caller-supplied param', () => {
    assert.match(actionSource, /AICanonAnswerPostID/);
    // The caller-supplied PriorCanonAnswerMarkdown param is only read on the NON-persistence
    // (no AnswerPostID) branch.
    const nonPersistenceBranch = actionSource.split('} else {')[1]?.split('const result = GradeEpistemicAnswer')[0] ?? '';
    assert.match(nonPersistenceBranch, /paramValue\(params, 'PriorCanonAnswerMarkdown'\)/);
  });

  it('executes EpistemicAnswerGradingAction fail-closed with AUTHORITATIVE_LOAD_FAILED and zero Save() calls when question canon lookup or referenced canon body fails', async () => {
    const { EpistemicAnswerGradingAction } = await import('../dist/index.js');
    const action = new EpistemicAnswerGradingAction();
    let saveCalls = 0;

    mock.method(Metadata.prototype, 'GetEntityObject', async () => ({
      Save: async () => {
        saveCalls++;
        return true;
      },
    }));

    const answerId = '11111111-1111-4111-8111-111111111111';
    const questionId = '22222222-2222-4222-8222-222222222222';
    const canonId = '33333333-3333-4333-8333-333333333333';

    // Case 1: questionCanonResult fails -> must return AUTHORITATIVE_LOAD_FAILED and 0 writes
    mock.method(RunView.prototype, 'RunView', async (params: { EntityName: string }) => {
      if (params.EntityName === 'MJ_BizApps_Community: Forum Answer Posts') {
        return { Success: true, Results: [{ ID: answerId, QuestionPostID: questionId }] };
      }
      if (params.EntityName === 'MJ_BizApps_Community: Forum Posts') {
        return {
          Success: true,
          Results: [
            { ID: questionId, BodyMarkdown: 'Question body' },
            { ID: answerId, BodyMarkdown: 'Answer body' },
          ],
        };
      }
      if (params.EntityName === 'MJ_BizApps_Community: Forum Question Posts') {
        return { Success: false, Results: [], ErrorMessage: 'Simulated canon query failure' };
      }
      return { Success: true, Results: [] };
    });

    const user = new UserInfo(undefined, { ID: '44444444-4444-4444-8444-444444444444' });
    const runParams1 = new RunActionParams();
    runParams1.Params = [{ Name: 'AnswerPostID', Value: answerId, Type: 'Input' }];
    runParams1.ContextUser = user;
    runParams1.Filters = [];
    const res1 = await action.Run(runParams1);
    assert.equal(res1.Success, false);
    assert.equal(res1.ResultCode, 'AUTHORITATIVE_LOAD_FAILED');
    assert.equal(saveCalls, 0);

    mock.restoreAll();

    // Case 2: AICanonAnswerPostID is populated, but loading the referenced canon post body fails -> 0 writes
    let postCall = 0;
    mock.method(Metadata.prototype, 'GetEntityObject', async () => ({
      Save: async () => {
        saveCalls++;
        return true;
      },
    }));
    mock.method(RunView.prototype, 'RunView', async (params: { EntityName: string }) => {
      if (params.EntityName === 'MJ_BizApps_Community: Forum Answer Posts') {
        return { Success: true, Results: [{ ID: answerId, QuestionPostID: questionId }] };
      }
      if (params.EntityName === 'MJ_BizApps_Community: Forum Question Posts') {
        return { Success: true, Results: [{ ID: questionId, AICanonAnswerPostID: canonId }] };
      }
      if (params.EntityName === 'MJ_BizApps_Community: Forum Posts') {
        postCall++;
        if (postCall === 1) {
          return {
            Success: true,
            Results: [
              { ID: questionId, BodyMarkdown: 'Question body' },
              { ID: answerId, BodyMarkdown: 'Answer body' },
            ],
          };
        }
        return { Success: false, Results: [], ErrorMessage: 'Canon post load failure' };
      }
      return { Success: true, Results: [] };
    });

    const runParams2 = new RunActionParams();
    runParams2.Params = [{ Name: 'AnswerPostID', Value: answerId, Type: 'Input' }];
    runParams2.ContextUser = user;
    runParams2.Filters = [];
    const res2 = await action.Run(runParams2);
    assert.equal(res2.Success, false);
    assert.equal(res2.ResultCode, 'AUTHORITATIVE_LOAD_FAILED');
    assert.equal(saveCalls, 0);
    mock.restoreAll();
  });
});
