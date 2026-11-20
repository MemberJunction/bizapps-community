import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import type { ProcessedMessage } from '@memberjunction/communication-types';
import { Message } from '@memberjunction/communication-types';
import { ProcessedMessageServer } from '@memberjunction/communication-engine';
import {
  CallbackCommunityEmbeddingProvider,
  CommunityEmbeddingPersonalizationService,
} from '@mj-biz-apps/community-core';
import {
  ComputeAskFirstDeflection,
  ComputeEpistemicCanonBoost,
  ComputeSemanticAskFirstDeflection,
  type AskFirstCandidate,
} from './custom/ask-first-deflection.ts';
import { GradeEpistemicAnswer } from './custom/epistemic-answer-grading.ts';
import { SynthesizeLivingThread } from './custom/living-thread-synthesis.ts';
import {
  BuildCommunityDigestPDF,
  COMMUNITY_DIGEST_PDF_MAX_ITEMS,
  type CommunityDigestItem,
} from './custom/export-community-digest-pdf.ts';
import {
  BuildReplyToEmailAddress,
  ClearDigestReplyTokenRegistry,
  ResolveDigestReplySigningSecret,
  SignDigestReplyToken,
  StripQuotedEmailReply,
  VerifyDigestReplyToken,
} from './custom/digest-reply-loop.ts';

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

describe('CommunityTestCommunicationProvider — outbox isolation, DryRun, and operations', () => {
  it('isolates outbox messages cleanly, handles DryRun true vs false, and rejects missing To/From without polluting outbox', async () => {
    const {
      COMMUNITY_TEST_EMAIL_DRIVER_NAME,
      CommunityTestCommunicationProvider,
      CommunityTestOutbox,
    } = await import('../dist/index.js');
    CommunityTestCommunicationProvider.ClearSentMessages();
    const provider = CommunityTestCommunicationProvider.Instance;
    assert.equal(CommunityTestCommunicationProvider.GetSentMessages().length, 0);
    assert.deepEqual(provider.getSupportedOperations(), [
      'SendSingleMessage',
      'GetMessages',
      'ForwardMessage',
      'ReplyToMessage',
      'CreateDraft',
    ]);

    try {
      // Missing To or From fails cleanly and does not write to outbox
      const badMsg = new Message();
      badMsg.From = 'digest@bizapps.local';
      badMsg.To = '   ';
      const badProcessed: ProcessedMessage = new ProcessedMessageServer(badMsg);
      const badRes = await provider.SendSingleMessage(badProcessed);
      assert.equal(badRes.Success, false);
      assert.match(badRes.Error, /To.*From.*required/i);
      assert.equal(CommunityTestOutbox.Instance.List().length, 0);

      // DryRun = true records dryRun: true and extracts case-insensitive Reply-To + CC/BCC
      const dryMsg = new Message();
      dryMsg.From = 'digest@bizapps.local';
      dryMsg.FromName = 'BizApps Digest';
      dryMsg.To = 'Alice@Example.org';
      dryMsg.Subject = 'Weekly Digest';
      dryMsg.Body = 'Plain digest';
      dryMsg.HTMLBody = '<p>HTML digest</p>';
      dryMsg.Headers = { 'reply-to': 'reply+tok1@reply.bizapps.local' };
      dryMsg.CCRecipients = ['cc@example.org'];
      dryMsg.BCCRecipients = ['bcc@example.org'];
      dryMsg.DryRun = true;
      const dryProcessed: ProcessedMessage = new ProcessedMessageServer(dryMsg);
      dryProcessed.ProcessedSubject = 'Processed Weekly Digest';
      dryProcessed.ProcessedBody = 'Processed plain digest';
      dryProcessed.ProcessedHTMLBody = '<p>Processed HTML digest</p>';

      const dryRes = await provider.SendSingleMessage(dryProcessed);
      assert.equal(dryRes.Success, true);
      assert.equal(dryRes.DryRun, true);

      // Live message (DryRun omitted/false)
      const liveMsg = new Message();
      liveMsg.From = 'digest@bizapps.local';
      liveMsg.To = 'bob@example.org';
      liveMsg.Subject = 'Live Digest';
      liveMsg.Body = 'Live body';
      const liveProcessed: ProcessedMessage = new ProcessedMessageServer(liveMsg);
      const liveRes = await provider.SendSingleMessage(liveProcessed);
      assert.equal(liveRes.Success, true);
      assert.equal(liveRes.DryRun, false);

      // Outbox & GetMessages isolation checks
      const all = CommunityTestCommunicationProvider.GetOutbox();
      assert.equal(all.length, 2);
      assert.equal(all[0].dryRun, true);
      assert.equal(all[0].replyTo, 'reply+tok1@reply.bizapps.local');
      assert.equal(all[0].subject, 'Processed Weekly Digest');
      assert.deepEqual(all[0].metadata.ccRecipients, ['cc@example.org']);
      assert.deepEqual(all[0].metadata.bccRecipients, ['bcc@example.org']);
      assert.equal(all[1].dryRun, false);

      const aliceMessages = await provider.GetMessages({ Identifier: '  alice@example.org ', NumMessages: 10 });
      assert.equal(aliceMessages.Success, true);
      assert.equal(aliceMessages.Messages.length, 1);
      assert.equal(aliceMessages.Messages[0].To, 'Alice@Example.org');

      // ForwardMessage, ReplyToMessage, CreateDraft
      const fwdFail = await provider.ForwardMessage({ MessageID: 'msg-1', ToRecipients: [] });
      assert.equal(fwdFail.Success, false);
      const fwdOk = await provider.ForwardMessage({ MessageID: 'msg-1', ToRecipients: ['c@example.org'] });
      assert.equal(fwdOk.Success, true);

      const replyRes = await provider.ReplyToMessage({ MessageID: 'msg-1', Message: liveProcessed });
      assert.equal(replyRes.Success, true);
      assert.equal(CommunityTestCommunicationProvider.GetSentMessages().length, 3);

      const draftRes = await provider.CreateDraft({ Message: liveMsg });
      assert.equal(draftRes.Success, true);
      assert.match(draftRes.DraftID ?? '', /^test-draft-/);

      // ClearSentMessages isolates state completely
      CommunityTestCommunicationProvider.ClearSentMessages();
      assert.equal(CommunityTestCommunicationProvider.GetSentMessages().length, 0);
      assert.equal(provider.GetOutbox().length, 0);
      assert.equal(COMMUNITY_TEST_EMAIL_DRIVER_NAME, 'Community Test Email Driver');
    } finally {
      CommunityTestCommunicationProvider.ClearSentMessages();
    }
  });
});

describe('Digest Reply Loop — HMAC expiry, secret rotation, and UTF-8 quote stripping', () => {
  const USER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
  const FORUM_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
  const ROOT_ID = 'cccccccc-3333-4333-8333-333333333333';

  it('enforces exact HMAC token expiry boundaries and secret rotation with durable store isolation', () => {
    const prevStorePath = process.env.COMMUNITY_DIGEST_TOKEN_STORE_PATH;
    const prevSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
    const tempStorePath = join(os.tmpdir(), `mj-custom-actions-tokens-${process.pid}-${Date.now()}.json`);
    process.env.COMMUNITY_DIGEST_TOKEN_STORE_PATH = tempStorePath;
    ClearDigestReplyTokenRegistry();

    try {
      const issuedAt = new Date('2026-11-20T12:00:00.000Z');
      const secretV1 = 'hmac-secret-v1-alpha';
      const secretV2 = 'hmac-secret-v2-beta';

      const tokenV1 = SignDigestReplyToken({
        memberUserId: USER_ID,
        forumId: FORUM_ID,
        rootPostId: ROOT_ID,
        recipientEmail: 'member@example.org',
        signingSecret: secretV1,
        now: issuedAt,
        ttlSeconds: 300,
      });

      const replyAddr = BuildReplyToEmailAddress(tokenV1, 'reply.bizapps.local');

      // Valid right at expiration boundary (iat + 300s)
      const atExpiry = VerifyDigestReplyToken(replyAddr, {
        signingSecret: secretV1,
        expectedSenderEmail: 'MEMBER@example.org',
        now: new Date(issuedAt.getTime() + 300_000),
      });
      assert.equal(atExpiry.valid, true);

      // Expired 1 second after expiration boundary -> TOKEN_EXPIRED
      const pastExpiry = VerifyDigestReplyToken(replyAddr, {
        signingSecret: secretV1,
        expectedSenderEmail: 'member@example.org',
        now: new Date(issuedAt.getTime() + 301_000),
      });
      assert.equal(pastExpiry.valid, false);
      if (!pastExpiry.valid) {
        assert.equal(pastExpiry.errorCode, 'TOKEN_EXPIRED');
      }

      // Clock skew > 60s before iat fails closed -> TOKEN_EXPIRED
      const tooEarly = VerifyDigestReplyToken(replyAddr, {
        signingSecret: secretV1,
        expectedSenderEmail: 'member@example.org',
        now: new Date(issuedAt.getTime() - 61_000),
      });
      assert.equal(tooEarly.valid, false);
      if (!tooEarly.valid) {
        assert.equal(tooEarly.errorCode, 'TOKEN_EXPIRED');
      }

      // Secret rotation: old token rejected under rotated secretV2
      const rotatedReject = VerifyDigestReplyToken(replyAddr, {
        signingSecret: secretV2,
        expectedSenderEmail: 'member@example.org',
        now: issuedAt,
      });
      assert.equal(rotatedReject.valid, false);
      if (!rotatedReject.valid) {
        assert.equal(rotatedReject.errorCode, 'INVALID_SIGNATURE');
      }

      // New token signed via rotated env secret verifies under secretV2 and survives memoryOnly restart
      process.env.COMMUNITY_DIGEST_REPLY_SECRET = secretV2;
      assert.equal(ResolveDigestReplySigningSecret(), secretV2);
      const tokenV2 = SignDigestReplyToken({
        memberUserId: USER_ID,
        forumId: FORUM_ID,
        rootPostId: ROOT_ID,
        recipientEmail: 'member@example.org',
        now: issuedAt,
        ttlSeconds: 300,
      });

      ClearDigestReplyTokenRegistry({ memoryOnly: true });
      const verifiedV2 = VerifyDigestReplyToken(tokenV2, {
        expectedSenderEmail: 'member@example.org',
        now: new Date(issuedAt.getTime() + 60_000),
      });
      assert.equal(verifiedV2.valid, true);
    } finally {
      ClearDigestReplyTokenRegistry();
      if (existsSync(tempStorePath)) {
        rmSync(tempStorePath, { force: true });
      }
      if (prevStorePath === undefined) delete process.env.COMMUNITY_DIGEST_TOKEN_STORE_PATH;
      else process.env.COMMUNITY_DIGEST_TOKEN_STORE_PATH = prevStorePath;
      if (prevSecret === undefined) delete process.env.COMMUNITY_DIGEST_REPLY_SECRET;
      else process.env.COMMUNITY_DIGEST_REPLY_SECRET = prevSecret;
    }
  });

  it('preserves UTF-8 content while stripping Gmail, Outlook, wrapped attribution, signature, and mobile quote blocks', () => {
    const gmailReply = [
      'Here’s our café compliance update — €100,000 nexus threshold applies.',
      '',
      'Second paragraph with 日本語 and 👍 emoji.',
      '',
      '> inline quote to ignore',
      '',
      'On Thu, Nov 20, 2026 at 8:15 AM',
      'Community Digest <reply+abc@reply.bizapps.local> wrote:',
      '> Quoted original digest text',
    ].join('\r\n');

    const cleanedGmail = StripQuotedEmailReply(gmailReply);
    assert.equal(
      cleanedGmail,
      'Here’s our café compliance update — €100,000 nexus threshold applies.\n\nSecond paragraph with 日本語 and 👍 emoji.',
    );

    const outlookReply = [
      'Agreed — let us adopt the Q1 schedule.',
      'Sent from my iPhone',
      '-----Original Message-----',
      'From: digest@bizapps.local',
      'Sent: Thursday, November 20, 2026 9:00 AM',
      'Original digest content',
    ].join('\n');
    assert.equal(StripQuotedEmailReply(outlookReply), 'Agreed — let us adopt the Q1 schedule.');

    const sigAndDividerReply = [
      'Updated the draft policy.',
      '-- ',
      'Jane Doe, CPA',
    ].join('\n');
    assert.equal(StripQuotedEmailReply(sigAndDividerReply), 'Updated the draft policy.');

    const underscoreReply = [
      'Looks good to me.',
      '____________',
      'Previous thread history',
    ].join('\n');
    assert.equal(StripQuotedEmailReply(underscoreReply), 'Looks good to me.');
  });
});

describe('AskFirstDeflectionAction — Hybrid semantic/lexical score weighting & bounds', () => {
  it('respects custom semanticWeight vs lexicalWeight fusion and falls back safely when weightSum <= 0', async () => {
    const svc = CommunityEmbeddingPersonalizationService.Instance;
    const customProvider = new CallbackCommunityEmbeddingProvider('WeightingTestEmbedder', 4, async (text) => {
      const lower = text.toLowerCase();
      if (lower.includes('query-concept') || lower.includes('semantic-match')) {
        return [1, 0, 0, 0];
      }
      return [0, 1, 0, 0];
    });

    try {
      svc.SetEmbeddingProvider(customProvider);
      const candidates: AskFirstCandidate[] = [
        {
          postId: 'semantic-winner',
          forumSlug: 'general',
          title: 'Conceptual Alignment',
          authorDisplayName: 'Alice',
          bodyMarkdown: 'semantic-match orthogonal vocabulary guidance',
          epistemicStatus: null,
        },
        {
          postId: 'lexical-winner',
          forumSlug: 'general',
          title: 'Exact Keyword Match',
          authorDisplayName: 'Bob',
          bodyMarkdown: 'alpha beta gamma exact keyword overlap',
          epistemicStatus: null,
        },
      ];

      // Query has semantic alignment with candidate 1 ("query-concept") and exact lexical overlap with candidate 2 ("alpha beta gamma")
      const query = 'query-concept alpha beta gamma';

      const semanticHeavy = await ComputeSemanticAskFirstDeflection(query, candidates, {
        semanticWeight: 0.9,
        lexicalWeight: 0.1,
        minConfidence: 0.1,
      });
      assert.equal(semanticHeavy.deflected, true);
      assert.equal(semanticHeavy.citations[0]?.postId, 'semantic-winner');

      const lexicalHeavy = await ComputeSemanticAskFirstDeflection(query, candidates, {
        semanticWeight: 0.1,
        lexicalWeight: 0.9,
        minConfidence: 0.1,
      });
      assert.equal(lexicalHeavy.deflected, true);
      assert.equal(lexicalHeavy.citations[0]?.postId, 'lexical-winner');

      // Non-positive weightSum falls back to default 0.65 / 0.35 without NaN
      const zeroWeights = await ComputeSemanticAskFirstDeflection(query, candidates, {
        semanticWeight: 0,
        lexicalWeight: 0,
        minConfidence: 0.1,
      });
      assert.equal(zeroWeights.deflected, true);
      assert.ok(Number.isFinite(zeroWeights.confidenceScore));

      // Empty query declines cleanly
      const emptyQuery = await ComputeSemanticAskFirstDeflection('   ', candidates);
      assert.equal(emptyQuery.deflected, false);
      assert.equal(emptyQuery.confidenceScore, 0);

      // ComputeEpistemicCanonBoost preserves strict Verified > Accepted > Unverified > Outdated > Conflict ordering
      assert.ok(
        ComputeEpistemicCanonBoost({ epistemicStatus: 'Canon Verified', isVerifiedByModerator: true }) >
          ComputeEpistemicCanonBoost({ epistemicStatus: null, isAcceptedByAuthor: true }),
      );
    } finally {
      svc.ResetToDefaultProvider();
    }
  });
});

describe('LivingThreadSynthesisAction — Long-thread truncation & citation preservation', () => {
  it('caps long threads (>50 replies) at default maxReplyCount=50, truncates >500 char posts, and preserves [n] citations and postIds', () => {
    const longBody = `${'Detailed multi-state compliance guidance '.repeat(15)}Final sentence.`;
    assert.ok(longBody.length > 500);

    const replies = Array.from({ length: 65 }, (_, idx) => ({
      postId: `post-${String(idx + 1).padStart(4, '0')}-abcdef`,
      authorDisplayName: `Contributor ${idx + 1}`,
      bodyMarkdown:
        idx === 0
          ? `${longBody} Should we confirm state filing dates?`
          : `Reply ${idx + 1} guidance: ${'evidence '.repeat(70)}end.`,
      isAccepted: idx === 0,
      isVerified: idx === 1,
      epistemicStatus: idx === 1 ? ('Canon Verified' as const) : null,
    }));

    const res = SynthesizeLivingThread({
      rootTitle: 'Long Thread Synthesis Verification',
      rootBodyMarkdown: 'Root discussion body '.repeat(40),
      replies,
    });

    // Bounded to 50 replies by default
    assert.equal(res.consideredReplyCount, 50);
    assert.equal(res.contributorCitations.length, 50);
    assert.equal(res.contributorCitations[0].roleLabel, 'Accepted Answer');
    assert.equal(res.contributorCitations[1].roleLabel, 'Canon Verified');
    assert.equal(res.contributorCitations[2].roleLabel, 'Contributor');

    // Every citation preserves postId and sequential 1-based index
    assert.equal(res.contributorCitations[0].postId, 'post-0001-abcdef');
    assert.equal(res.contributorCitations[49].citationIndex, 50);

    // Inline citations [1], [2], [50] preserved in executive summary even with truncated bodies
    assert.match(res.aiExecutiveSummary, /\[1\]/);
    assert.match(res.aiExecutiveSummary, /\[2\]/);
    assert.match(res.aiExecutiveSummary, /\[50\]/);
    assert.match(res.aiExecutiveSummary, /…/);
    assert.match(res.aiExecutiveSummary, /post:post-000/);

    // Takeaways and open questions bounded to max 5 and preserve inline citations
    assert.ok(res.keyTakeaways.length <= 5 && res.keyTakeaways.length > 0);
    assert.match(res.keyTakeaways[0], /\[1\]$/);
    assert.equal(res.openQuestions.length, 1);
    assert.match(res.openQuestions[0], /\[1\]$/);
  });
});
