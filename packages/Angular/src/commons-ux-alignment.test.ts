import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserInfo } from '@memberjunction/core';
import {
  AddStreamItemReply,
  BuildCommonsStreamItems,
  BuildDynamicSpaceDirectory,
  BuildDynamicTopicTags,
  BuildEditorialPorchHighlights,
  COMMUNITY_SPACES_DIRECTORY,
  COMMUNITY_TOPIC_TAGS,
  ComputeNextTrapFocusTarget,
  CreateAskShareStreamItem,
  FilterCommonsStream,
  FindMatchedCanonQuestion,
  GraduateStreamItem,
  PersistAskSharePost,
  PersistDetailReply,
  ResolveAuthorizedForumTarget,
  SEEDED_COMMUNITY_SESSIONS,
  STREAM_TYPE_FILTER_OPTIONS,
  ToggleReactionViaProvider,
  ToggleStreamItemUpvote,
  ValidateAskShareDraft,
  type CommunityCommonsReply,
} from './lib/community-hub-commons.ts';
import * as CommunityHubMutations from './lib/community-hub-mutations';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from './lib/community-hub-preferences.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');

function createFakeStore(): { store: IUserPreferenceStore; data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    store: {
      GetSetting: (key: string) => data.get(key),
      SetSetting: async (key: string, value: string) => {
        data.set(key, value);
        return true;
      },
    },
  };
}

describe('Slice 1 UX Alignment — Sticky Top Shell, Branding & Export Wiring', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const hubCss = readFileSync(join(LIB_DIR, 'community-hub-resource.component.css'), 'utf8');
  const commonsTs = readFileSync(join(LIB_DIR, 'community-hub-commons.ts'), 'utf8');
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');

  it('uses sticky top header bar (position: sticky; top: 0; z-index: 20) and MemberJunction Community Hub branding', () => {
    assert.match(hubCss, /\.mjc-hub-header\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;[\s\S]*z-index:\s*20;/);
    assert.ok(hubHtml.includes('MemberJunction Community Hub'));
    assert.ok(hubHtml.includes('openAskShareModal()'));
    assert.ok(hubHtml.includes('exportDigestPdf()'));
    assert.ok(hubHtml.includes('aria-label="Search community threads, Q&A canon, and playbooks"'));
    assert.ok(hubHtml.includes('clearHeaderSearch()'));
  });

  it('contains zero MoreCheese, Quincewick, Betty, or creamery demo brand copy across Angular lib sources', () => {
    const combined = `${hubTs}\n${hubHtml}\n${commonsTs}\n${streamHtml}`;
    for (const forbidden of [/more\s*cheese/i, /quincewick/i, /ask\s*betty/i, /creamery/i]) {
      assert.doesNotMatch(combined, forbidden, `Found forbidden demo brand reference ${forbidden}`);
    }
  });

  it('wires exportDigestPdf() to GraphQLActionClient and COMMUNITY_ACTION_IDS.ExportDigestPDF without window.print()', () => {
    assert.match(hubTs, /public async exportDigestPdf\(\): Promise<void>/);
    assert.match(hubTs, /RunAction\(COMMUNITY_ACTION_IDS\.ExportDigestPDF/);
    assert.doesNotMatch(hubTs, /window\.print\s*\(/);
  });
});

describe('Slice 1 UX Alignment — Collapsible Editorial Porch & 3 Featured Highlight Cards', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  it('supports porchCollapsed toggle with aria-expanded and UserInfoEngine preference persistence', async () => {
    assert.match(hubTs, /public porchCollapsed = false;/);
    assert.match(hubTs, /public togglePorch\(\): void/);
    assert.match(hubHtml, /\[attr\.aria-expanded\]="!porchCollapsed"/);
    assert.match(hubHtml, /\(click\)="togglePorch\(\)"/);

    const { store, data } = createFakeStore();
    const prefs = new CommunityHubPreferences(store);
    assert.equal(prefs.GetPorchCollapsed(), false);
    await prefs.SetPorchCollapsed(true);
    assert.equal(data.get(COMMUNITY_HUB_PREFERENCE_KEYS.porchCollapsed), 'true');
    assert.equal(prefs.GetPorchCollapsed(), true);
  });

  it('builds 3 distinct Featured Highlight Cards (Open Canon/Motion, Living Playbook, Active Graduation/Working Group)', () => {
    const items = BuildCommonsStreamItems({
      feedPosts: [{ id: 'f1', title: 'Multi-Region Read Replicas', bodyMarkdown: 'Architecture guide', status: 'Published' }],
      qaCanonItems: [
        {
          id: 'qa1',
          questionPostId: 'q1',
          title: 'How do I rotate my API key without downtime?',
          bodyMarkdown: 'Deploy secondary key before revoking legacy key.',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
        },
      ],
      ideationItems: [],
      livingDocItems: [
        {
          id: 'doc1',
          title: 'OAuth2 Partner Onboarding Playbook',
          bodyMarkdown: 'PKCE + token rotation alerts',
          postTypeCode: 'collaborative-doc',
        },
      ],
    });

    const highlights = BuildEditorialPorchHighlights({
      commonsItems: items,
      qaCanonItems: [
        {
          id: 'qa1',
          questionPostId: 'q1',
          title: 'How do I rotate my API key without downtime?',
          bodyMarkdown: 'Deploy secondary key before revoking legacy key.',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
        },
      ],
      livingDocItems: [
        {
          id: 'doc1',
          title: 'OAuth2 Partner Onboarding Playbook',
          bodyMarkdown: 'PKCE + token rotation alerts',
          postTypeCode: 'collaborative-doc',
        },
      ],
    });

    assert.equal(highlights.length, 3);
    assert.deepEqual(
      highlights.map((h) => h.kind),
      ['canon-motion', 'living-playbook', 'active-graduation'],
    );
    assert.ok(highlights.every((h) => h.ctaLabel.length > 0 && h.title.length > 0));
  });
});

describe('Slice 1 UX Alignment — Matched Question Spotlight Banner', () => {
  const qaItems = [
    {
      id: 'ans-1',
      questionPostId: 'q-1',
      title: 'How do I rotate my API key without downtime?',
      bodyMarkdown: 'Mint a secondary client secret, deploy workers, then revoke the legacy key.',
      epistemicStatus: 'Canon Verified',
      confidenceScore: 0.95,
      isAccepted: true,
    },
    {
      id: 'ans-2',
      questionPostId: 'q-2',
      title: 'How do webhook delivery retries handle 429 rate limits?',
      bodyMarkdown: 'Exponential jitter backoff respects Retry-After headers up to 15 minutes.',
      epistemicStatus: 'Verified',
      confidenceScore: 0.88,
      isAccepted: false,
    },
  ];
  const commons = BuildCommonsStreamItems({
    feedPosts: [],
    qaCanonItems: qaItems,
    ideationItems: [],
    livingDocItems: [],
  });

  it('returns null for empty or single-char queries and unmatched terms', () => {
    assert.equal(FindMatchedCanonQuestion('', qaItems, commons), null);
    assert.equal(FindMatchedCanonQuestion('a', qaItems, commons), null);
    assert.equal(FindMatchedCanonQuestion('nonexistent-xyzzy-term', qaItems, commons), null);
  });

  it('matches canonical Q&A records by query and links to source item and Q&A Canon', () => {
    const match = FindMatchedCanonQuestion('rotate API key', qaItems, commons);
    assert.ok(match);
    assert.equal(match.id, 'ans-1');
    assert.equal(match.epistemicStatus, 'Canon Verified');
    assert.equal(match.confidenceScore, 0.95);
    assert.equal(match.sourceItemId, 'qa-ans-1');

    const rateMatch = FindMatchedCanonQuestion('429 rate limits', qaItems, commons);
    assert.ok(rateMatch);
    assert.equal(rateMatch.id, 'ans-2');
  });
});

describe('Slice 1 UX Alignment — 3-Column Commons Workspace Filtering & Layout', () => {
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');
  const streamCss = readFileSync(join(LIB_DIR, 'knowledge-stream.component.css'), 'utf8');

  const items = BuildCommonsStreamItems({
    feedPosts: [
      { id: 'f1', title: 'Multi-Region GraphQL Read Replica Architecture', bodyMarkdown: 'Latency benchmarks', status: 'Published' },
    ],
    qaCanonItems: [
      {
        id: 'qa1',
        questionPostId: 'q1',
        title: 'How do I rotate my API key without downtime?',
        bodyMarkdown: 'Dual-key rotation steps',
        epistemicStatus: 'Canon Verified',
        confidenceScore: 0.94,
        isAccepted: true,
      },
    ],
    ideationItems: [
      {
        id: 'idea1',
        campaignId: 'camp1',
        title: 'Add webhook signing secrets rotation API',
        summary: 'Zero-downtime dual HMAC secrets.',
        totalPointsAllocated: 36,
        effectiveQuadraticVotes: 6,
      },
    ],
    livingDocItems: [
      {
        id: 'doc1',
        title: 'OAuth2 Partner Onboarding Playbook',
        bodyMarkdown: 'PKCE checklist',
        postTypeCode: 'collaborative-doc',
      },
    ],
    includeDemoFixtures: true,
  });

  it('exposes the 5 canonical spaces, topics, stream types, and 3-column responsive grid', () => {
    assert.deepEqual(
      COMMUNITY_SPACES_DIRECTORY.map((s) => s.name),
      ['All Spaces', 'Architecture & Standards', 'Product Ideation', 'Operations & Playbooks', 'Governance & RFCs'],
    );
    assert.ok(COMMUNITY_TOPIC_TAGS.length >= 5);
    assert.deepEqual(
      STREAM_TYPE_FILTER_OPTIONS.map((o) => o.label),
      ['All Activity', 'Posts', 'Verified Q&A', 'Ideation', 'Living Guides'],
    );
    assert.ok(SEEDED_COMMUNITY_SESSIONS.length >= 3);
    assert.match(streamCss, /grid-template-columns:\s*260px\s+minmax\(0,\s*1fr\)\s+300px/);
    assert.match(streamHtml, /mjc-commons__left-rail/);
    assert.match(streamHtml, /mjc-commons__stream/);
    assert.match(streamHtml, /mjc-commons__right-rail/);
    assert.match(streamHtml, /<mjc-ask-first-deflection-widget/);
  });

  it('filters Commons stream items cleanly by space, topic, stream type, and search query', () => {
    const governanceOnly = FilterCommonsStream(items, {
      spaceFilter: 'governance-rfcs',
      topicFilter: null,
      streamTypeFilter: 'all',
      searchQuery: '',
    });
    assert.ok(governanceOnly.length >= 1);
    assert.ok(governanceOnly.every((i) => i.spaceId === 'governance-rfcs'));

    const ideationOnly = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: null,
      streamTypeFilter: 'ideation',
      searchQuery: '',
    });
    assert.equal(ideationOnly.length, 1);
    assert.equal(ideationOnly[0].streamType, 'ideation');

    const topicFiltered = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: 'API Security',
      streamTypeFilter: 'all',
      searchQuery: '',
    });
    assert.ok(topicFiltered.length >= 1);
    assert.ok(topicFiltered.every((i) => i.tags.includes('API Security')));

    const queryFiltered = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: null,
      streamTypeFilter: 'all',
      searchQuery: 'webhook',
    });
    assert.ok(queryFiltered.length >= 1);
    assert.ok(queryFiltered.every((i) => `${i.title} ${i.excerpt} ${i.bodyMarkdown}`.toLowerCase().includes('webhook')));
  });
});

describe('Slice 1 UX Alignment — Slide-Over Detail Sheet Drawer & + Ask or Share Modal', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  it('declares accessible role="dialog" + aria-modal="true" + Escape dismissal for Detail Sheet & Ask/Share Modal', () => {
    assert.match(hubHtml, /id="mjc-detail-sheet-backdrop"[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="mjc-detail-sheet-title"/);
    assert.match(hubHtml, /id="mjc-ask-share-modal-backdrop"[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="mjc-ask-share-title"/);
    assert.match(hubTs, /@HostListener\('document:keydown\.escape'\)/);
  });

  it('supports upvoting, replying, and graduating threads inside the Detail Sheet', () => {
    const initial = BuildCommonsStreamItems({
      feedPosts: [{ id: 'p1', title: 'Test Thread', bodyMarkdown: 'Initial body', status: 'Published' }],
      qaCanonItems: [],
      ideationItems: [],
      livingDocItems: [],
    });
    const target = initial[0];
    const startUpvotes = target.upvoteCount;

    const upvoted = ToggleStreamItemUpvote(initial, target.id);
    assert.equal(upvoted.find((i) => i.id === target.id)?.upvoteCount, startUpvotes + 1);
    assert.equal(upvoted.find((i) => i.id === target.id)?.upvotedByMe, true);

    const unvoted = ToggleStreamItemUpvote(upvoted, target.id);
    assert.equal(unvoted.find((i) => i.id === target.id)?.upvoteCount, startUpvotes);

    const replied = AddStreamItemReply(unvoted, target.id, 'Verified fix in staging.', 'Ada Lovelace', 'Staff Architect');
    const updatedAfterReply = replied.find((i) => i.id === target.id)!;
    assert.equal(updatedAfterReply.replies.length, target.replies.length + 1);
    assert.equal(updatedAfterReply.replyCount, updatedAfterReply.replies.length);

    const graduated = GraduateStreamItem(replied, target.id);
    const updatedAfterGrad = graduated.find((i) => i.id === target.id)!;
    assert.equal(updatedAfterGrad.graduatedToDeliverable, true);
    assert.equal(updatedAfterGrad.statusBadge, 'Graduated · Working Group');
  });

  it('validates Ask or Share drafts and creates Question, Discussion Post, and Playbook Note items', () => {
    const invalid = ValidateAskShareDraft({
      entryType: 'Question',
      title: '   ',
      spaceId: 'architecture-standards',
      body: '',
      tagsInput: '',
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.title);
    assert.ok(invalid.errors.body);

    const valid = ValidateAskShareDraft({
      entryType: 'Playbook Note',
      title: 'Zero-Downtime Blue/Green Migration Guide',
      spaceId: 'operations-playbooks',
      body: 'Step 1: Verify schema parity before traffic shift.',
      tagsInput: 'Schema Parity, Multi-Region',
    });
    assert.equal(valid.valid, true);

    const createdPlaybook = CreateAskShareStreamItem({
      entryType: 'Playbook Note',
      title: 'Zero-Downtime Blue/Green Migration Guide',
      spaceId: 'operations-playbooks',
      body: 'Step 1: Verify schema parity before traffic shift.',
      tagsInput: 'Schema Parity, Multi-Region',
    });
    assert.equal(createdPlaybook.streamType, 'living-guide');
    assert.equal(createdPlaybook.spaceId, 'operations-playbooks');
    assert.deepEqual(createdPlaybook.tags, ['Schema Parity', 'Multi-Region']);

    const createdQuestion = CreateAskShareStreamItem({
      entryType: 'Question',
      title: 'How should tenant read replicas handle failover?',
      spaceId: 'architecture-standards',
      body: 'Looking for recommended connection pool drain timeouts.',
      tagsInput: 'Multi-Region',
    });
    assert.equal(createdQuestion.streamType, 'verified-qa');
    assert.equal(createdQuestion.entryTypeLabel, 'Question');
    assert.equal(createdQuestion.upvoteCount, 0);
    assert.equal(createdQuestion.upvotedByMe, false);
  });

  it('enforces ResolveAuthorizedForumTarget case-insensitivity and ComputeNextTrapFocusTarget wrap-around', () => {
    const allowed = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
    assert.equal(
      ResolveAuthorizedForumTarget(' 22222222-2222-4222-8222-222222222222 ', allowed),
      '22222222-2222-4222-8222-222222222222',
    );
    assert.equal(
      ResolveAuthorizedForumTarget('22222222-2222-4222-8222-222222222222'.toUpperCase(), allowed),
      '22222222-2222-4222-8222-222222222222',
    );
    assert.equal(ResolveAuthorizedForumTarget('33333333-3333-4333-8333-333333333333', allowed), null);
    assert.equal(ResolveAuthorizedForumTarget('', allowed), null);

    const els = ['first', 'middle', 'last'];
    assert.equal(ComputeNextTrapFocusTarget([], 'first', false), null);
    assert.equal(ComputeNextTrapFocusTarget(els, 'first', true), 'last');
    assert.equal(ComputeNextTrapFocusTarget(els, 'last', false), 'first');
    assert.equal(ComputeNextTrapFocusTarget(els, 'first', false), 'middle');
    assert.equal(ComputeNextTrapFocusTarget(els, 'last', true), 'middle');
  });

  it('persists Questions with ForumQuestionPosts subtype and fails closed with rollback on invalid forum or subtype error', async () => {
    const allowedForum = '11111111-1111-4111-8111-111111111111';
    const postTypes = new Map<string, string>([
      ['question', 'pt-question'],
      ['discussion', 'pt-discussion'],
    ]);

    let postSaved = false;
    const unauthorized = await PersistAskSharePost({
      draft: {
        entryType: 'Discussion Post',
        title: 'Unauthorized forum attempt',
        spaceId: 'architecture-standards',
        body: 'Should never hit post.Save()',
        tagsInput: '',
      },
      isOfflineDemoMode: false,
      targetForumId: '99999999-9999-4999-8999-999999999999',
      allowedForumIDs: [allowedForum],
      postTypeIdByCode: postTypes,
      currentUserId: 'user-1',
      authorName: 'Ada',
      createForumPostEntity: async () => ({
        ID: 'post-1',
        ForumID: '',
        AuthorUserID: '',
        PostTypeID: '',
        Title: '',
        BodyMarkdown: '',
        Status: 'Draft',
        Save: async () => {
          postSaved = true;
          return true;
        },
      }),
    });
    assert.equal(unauthorized.success, false);
    assert.equal(postSaved, false);

    let rolledBack = false;
    let qSavedId: string | null = null;
    const rollbackCase = await PersistAskSharePost({
      draft: {
        entryType: 'Question',
        title: 'Question failing subtype save',
        spaceId: 'architecture-standards',
        body: 'Must delete base post when subtype fails.',
        tagsInput: '',
      },
      isOfflineDemoMode: false,
      targetForumId: allowedForum,
      allowedForumIDs: [allowedForum],
      postTypeIdByCode: postTypes,
      currentUserId: 'user-1',
      authorName: 'Ada',
      createForumPostEntity: async () => ({
        ID: 'saved-base-1',
        ForumID: '',
        AuthorUserID: '',
        PostTypeID: '',
        Title: '',
        BodyMarkdown: '',
        Status: 'Draft',
        Save: async () => true,
        Delete: async () => {
          rolledBack = true;
          return true;
        },
      }),
      createQuestionPostEntity: async () => ({
        ID: '',
        Save: async () => false,
      }),
    });
    assert.equal(rollbackCase.success, false);
    assert.equal(rolledBack, true);

    const successCase = await PersistAskSharePost({
      draft: {
        entryType: 'Question',
        title: 'How do dual-dialect tests validate CHECK constraints?',
        spaceId: 'architecture-standards',
        body: 'Ensure SQL Server and PostgreSQL parity checks run cleanly.',
        tagsInput: 'Schema',
      },
      isOfflineDemoMode: false,
      targetForumId: allowedForum,
      allowedForumIDs: [allowedForum],
      authorizedForums: [{ id: allowedForum, name: 'Architecture & Standards', spaceId: 'architecture-standards' }],
      postTypeIdByCode: postTypes,
      currentUserId: 'user-1',
      authorName: 'Ada',
      createForumPostEntity: async () => ({
        ID: 'saved-question-42',
        ForumID: '',
        AuthorUserID: '',
        PostTypeID: '',
        Title: '',
        BodyMarkdown: '',
        Status: 'Draft',
        Save: async () => true,
        Delete: async () => true,
      }),
      createQuestionPostEntity: async () => {
        const entity = {
          ID: '',
          Save: async () => {
            qSavedId = entity.ID;
            return true;
          },
        };
        return entity;
      },
    });
    assert.equal(successCase.success, true);
    assert.equal(successCase.persistedPostId, 'saved-question-42');
    assert.equal(successCase.resolvedForumId, allowedForum);
    assert.equal(qSavedId, 'saved-question-42');
    assert.equal(successCase.createdItem?.upvoteCount, 0);
    assert.equal(successCase.createdItem?.upvotedByMe, false);
  });
});

describe('Slice 3 — Live Thread Reply, Upvote Reaction, Dynamic Directories, Tag Persistence & Graduation', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const streamTs = readFileSync(join(LIB_DIR, 'knowledge-stream.component.ts'), 'utf8');

  const FORUM_ID = '11111111-1111-4111-8111-111111111111';
  const POST_ID = '22222222-2222-4222-8222-222222222222';
  const USER_ID = '33333333-3333-4333-8333-333333333333';
  const SPACE_ID = '44444444-4444-4444-8444-444444444444';
  const REPLY_PT_ID = '55555555-5555-4555-8555-555555555555';
  const TAG_1_ID = '66666666-6666-4666-8666-666666666666';
  const TAG_2_ID = '77777777-7777-4777-8777-777777777777';

  function makeLiveCommonsItem() {
    return BuildCommonsStreamItems({
      feedPosts: [
        {
          id: POST_ID,
          forumId: FORUM_ID,
          title: 'Multi-Region Failover Notes',
          bodyMarkdown: 'Failover details',
          status: 'Published',
          upvoteCount: 3,
          upvotedByMe: false,
          tags: ['Multi-Region'],
        },
      ],
      qaCanonItems: [],
      ideationItems: [],
      livingDocItems: [],
    })[0];
  }

  it('persists detail replies as child ForumPosts (PostType=reply) and reloads from DB; fails closed on error', async () => {
    const item = makeLiveCommonsItem();
    const postTypes = new Map<string, string>([['reply', REPLY_PT_ID]]);
    let capturedFields: Record<string, string | number | null> | null = null;
    const reloadedReplies: CommunityCommonsReply[] = [
      {
        id: '88888888-8888-4888-8888-888888888888',
        authorName: 'Ada Lovelace',
        authorRole: 'Member',
        authorInitials: 'AL',
        timestampLabel: 'Published',
        bodyMarkdown: 'Verified in staging cluster.',
        isAccepted: false,
        upvotes: 0,
      },
    ];

    const ok = await PersistDetailReply({
      item,
      replyBody: 'Verified in staging cluster.',
      authorName: 'Ada Lovelace',
      isOfflineDemoMode: false,
      postTypeIdByCode: postTypes,
      currentUserId: USER_ID,
      createForumPostEntity: async () => {
        const entity = {
          ID: '88888888-8888-4888-8888-888888888888',
          ForumID: '',
          PostTypeID: '',
          RootPostID: null as string | null,
          ParentPostID: null as string | null,
          ReplyDepth: 0,
          AuthorUserID: null as string | null,
          BodyMarkdown: '',
          Status: 'Draft' as const,
          Save: async () => {
            capturedFields = {
              ForumID: entity.ForumID,
              PostTypeID: entity.PostTypeID,
              RootPostID: entity.RootPostID,
              ParentPostID: entity.ParentPostID,
              ReplyDepth: entity.ReplyDepth,
              AuthorUserID: entity.AuthorUserID,
              BodyMarkdown: entity.BodyMarkdown,
              Status: entity.Status,
            };
            return true;
          },
        };
        return entity;
      },
      reloadThreadReplies: async (rootId) => {
        assert.equal(rootId, POST_ID);
        return reloadedReplies;
      },
    });

    assert.equal(ok.success, true);
    assert.equal(ok.offlineFallback, false);
    assert.equal(ok.replies.length, 1);
    assert.equal(ok.replyCount, 1);
    assert.deepEqual(capturedFields, {
      ForumID: FORUM_ID,
      PostTypeID: REPLY_PT_ID,
      RootPostID: POST_ID,
      ParentPostID: POST_ID,
      ReplyDepth: 1,
      AuthorUserID: USER_ID,
      BodyMarkdown: 'Verified in staging cluster.',
      Status: 'Published',
    });

    // Fail-closed when Save() returns false — never adds a fake local reply
    const failed = await PersistDetailReply({
      item,
      replyBody: 'Should fail on server rejection.',
      authorName: 'Ada Lovelace',
      isOfflineDemoMode: false,
      postTypeIdByCode: postTypes,
      currentUserId: USER_ID,
      createForumPostEntity: async () => ({
        ID: '99999999-9999-4999-8999-999999999999',
        ForumID: '',
        PostTypeID: '',
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: null,
        BodyMarkdown: '',
        Status: 'Draft',
        LatestResult: { CompleteMessage: 'Thread is locked by moderator.' },
        Save: async () => false,
      }),
      reloadThreadReplies: async () => reloadedReplies,
    });
    assert.equal(failed.success, false);
    assert.equal(failed.errorMessage, 'Thread is locked by moderator.');
    assert.equal(failed.replies.length, 0);

    // Offline fallback ONLY when isOfflineDemoMode === true
    const offline = await PersistDetailReply({
      item,
      replyBody: 'Offline demo reply.',
      authorName: 'Demo User',
      isOfflineDemoMode: true,
      postTypeIdByCode: new Map(),
      currentUserId: null,
      createForumPostEntity: null,
      reloadThreadReplies: null,
    });
    assert.equal(offline.success, true);
    assert.equal(offline.offlineFallback, true);
    assert.equal(offline.replies.length, 1);
  });

  it('toggles ForumPostReaction Upvote persistence in live mode and fails closed on Save/Delete errors', async () => {
    const item = makeLiveCommonsItem();
    let createdKind = '';
    let createdWeight = 0;

    const up = await ToggleReactionViaProvider({
      item,
      isOfflineDemoMode: false,
      currentUserId: USER_ID,
      findExistingReactionId: async () => null,
      loadReactionEntityById: async () => null,
      createReactionEntity: async () => {
        const entity = {
          ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          PostID: '',
          UserID: '',
          ReactionKind: 'Upvote' as const,
          Weight: 0,
          Save: async () => {
            createdKind = entity.ReactionKind;
            createdWeight = entity.Weight;
            return true;
          },
          Delete: async () => true,
        };
        return entity;
      },
      refreshPostReactionScore: async () => 4,
    });

    assert.equal(up.success, true);
    assert.equal(up.upvotedByMe, true);
    assert.equal(up.upvoteCount, 4);
    assert.equal(createdKind, 'Upvote');
    assert.equal(createdWeight, 1);

    let deletedCalled = false;
    const down = await ToggleReactionViaProvider({
      item: { ...item, upvotedByMe: true, upvoteCount: 4 },
      isOfflineDemoMode: false,
      currentUserId: USER_ID,
      findExistingReactionId: async () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      loadReactionEntityById: async () => ({
        ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        PostID: POST_ID,
        UserID: USER_ID,
        ReactionKind: 'Upvote',
        Weight: 1,
        Save: async () => true,
        Delete: async () => {
          deletedCalled = true;
          return true;
        },
      }),
      createReactionEntity: async () => null,
      refreshPostReactionScore: async () => 3,
    });
    assert.equal(deletedCalled, true);
    assert.equal(down.success, true);
    assert.equal(down.upvotedByMe, false);
    assert.equal(down.upvoteCount, 3);

    // Fail-closed when Save() rejects
    const failedSave = await ToggleReactionViaProvider({
      item,
      isOfflineDemoMode: false,
      currentUserId: USER_ID,
      findExistingReactionId: async () => null,
      loadReactionEntityById: async () => null,
      createReactionEntity: async () => ({
        ID: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        PostID: '',
        UserID: '',
        ReactionKind: 'Upvote',
        Weight: 0,
        LatestResult: { CompleteMessage: 'Self-vote rejected.' },
        Save: async () => false,
        Delete: async () => true,
      }),
      refreshPostReactionScore: async () => 99,
    });
    assert.equal(failedSave.success, false);
    assert.equal(failedSave.upvotedByMe, false);
    assert.equal(failedSave.upvoteCount, 3);
    assert.equal(failedSave.errorMessage, 'Self-vote rejected.');
  });

  it('builds real Space & Topic directories in live mode without falling back to seeded fixtures on empty DB', () => {
    const emptyLiveSpaces = BuildDynamicSpaceDirectory({
      isOfflineDemoMode: false,
      spaces: [],
      forums: [],
    });
    assert.deepEqual(
      emptyLiveSpaces.map((s) => s.id),
      ['all'],
    );
    assert.deepEqual(
      BuildDynamicTopicTags({ isOfflineDemoMode: false, topicTags: [] }),
      [],
    );

    const liveSpaces = BuildDynamicSpaceDirectory({
      isOfflineDemoMode: false,
      spaces: [
        { ID: SPACE_ID, Name: 'Platform Engineering', CommunityKind: 'Product Community' },
      ],
      forums: [
        { ID: FORUM_ID, Name: 'Core Runtime Forum', SpaceID: SPACE_ID },
        { ID: '12121212-1212-4121-8121-121212121212', Name: 'Working Group Forum', SpaceID: null },
      ],
    });
    assert.deepEqual(
      liveSpaces.map((s) => s.name),
      ['All Spaces', 'Platform Engineering', 'Working Group Forum'],
    );

    const liveTopics = BuildDynamicTopicTags({
      isOfflineDemoMode: false,
      topicTags: [
        { ID: TAG_1_ID, SpaceID: SPACE_ID, Name: 'Zero Downtime', PostCount: 2 },
        { ID: TAG_2_ID, SpaceID: SPACE_ID, Name: 'GraphQL Resolvers', PostCount: 9 },
        { ID: 'abababab-abab-4bab-8bab-abababababab', SpaceID: SPACE_ID, Name: 'graphql resolvers', PostCount: 1 },
      ],
    });
    assert.deepEqual(liveTopics, ['GraphQL Resolvers', 'Zero Downtime']);

    const demoSpaces = BuildDynamicSpaceDirectory({ isOfflineDemoMode: true });
    assert.equal(demoSpaces.length, COMMUNITY_SPACES_DIRECTORY.length);
    const demoTopics = BuildDynamicTopicTags({ isOfflineDemoMode: true });
    assert.deepEqual(demoTopics, [...COMMUNITY_TOPIC_TAGS]);
  });

  it('persists ForumPostTag rows from Ask/Share selected topic tags & tag names, rolling back on tag failure', async () => {
    const topicCatalog = [
      { ID: TAG_1_ID, SpaceID: SPACE_ID, Slug: 'api-security', Name: 'API Security', PostCount: 5 },
      { ID: TAG_2_ID, SpaceID: SPACE_ID, Slug: 'multi-region', Name: 'Multi-Region', PostCount: 3 },
    ];
    const postTypes = new Map<string, string>([['discussion', REPLY_PT_ID]]);
    const savedTagRows: Array<{ PostID: string; TopicTagID: string; AssignedByAI: boolean }> = [];

    const ok = await PersistAskSharePost({
      draft: {
        entryType: 'Discussion Post',
        title: 'API Gateway Timeout Tuning',
        spaceId: SPACE_ID,
        body: 'Configure per-route deadline propagation across regional meshes.',
        tagsInput: 'Multi-Region',
      },
      isOfflineDemoMode: false,
      targetForumId: FORUM_ID,
      allowedForumIDs: [FORUM_ID],
      authorizedForums: [{ id: FORUM_ID, name: 'Core Runtime', spaceId: SPACE_ID, dbSpaceId: SPACE_ID }],
      postTypeIdByCode: postTypes,
      currentUserId: USER_ID,
      authorName: 'Ada',
      selectedTopicTagIds: [TAG_1_ID],
      topicTags: topicCatalog,
      createForumPostEntity: async () => ({
        ID: POST_ID,
        ForumID: '',
        AuthorUserID: '',
        PostTypeID: '',
        Title: '',
        BodyMarkdown: '',
        Status: 'Draft',
        Save: async () => true,
        Delete: async () => true,
      }),
      createPostTagEntity: async () => {
        const row = {
          PostID: '',
          TopicTagID: '',
          AssignedByAI: true,
          Save: async () => {
            savedTagRows.push({
              PostID: row.PostID,
              TopicTagID: row.TopicTagID,
              AssignedByAI: row.AssignedByAI,
            });
            return true;
          },
        };
        return row;
      },
    });

    assert.equal(ok.success, true);
    assert.deepEqual(savedTagRows, [
      { PostID: POST_ID, TopicTagID: TAG_1_ID, AssignedByAI: false },
      { PostID: POST_ID, TopicTagID: TAG_2_ID, AssignedByAI: false },
    ]);

    let rolledBack = false;
    const tagFail = await PersistAskSharePost({
      draft: {
        entryType: 'Discussion Post',
        title: 'Tag Failure Rollback Test',
        spaceId: SPACE_ID,
        body: 'Ensures ForumPost is deleted when ForumPostTag save fails.',
        tagsInput: 'API Security',
      },
      isOfflineDemoMode: false,
      targetForumId: FORUM_ID,
      allowedForumIDs: [FORUM_ID],
      authorizedForums: [{ id: FORUM_ID, name: 'Core Runtime', spaceId: SPACE_ID, dbSpaceId: SPACE_ID }],
      postTypeIdByCode: postTypes,
      currentUserId: USER_ID,
      authorName: 'Ada',
      topicTags: topicCatalog,
      createForumPostEntity: async () => ({
        ID: POST_ID,
        ForumID: '',
        AuthorUserID: '',
        PostTypeID: '',
        Title: '',
        BodyMarkdown: '',
        Status: 'Draft',
        Save: async () => true,
        Delete: async () => {
          rolledBack = true;
          return true;
        },
      }),
      createPostTagEntity: async () => ({
        PostID: '',
        TopicTagID: '',
        AssignedByAI: false,
        Save: async () => false,
      }),
    });
    assert.equal(tagFail.success, false);
    assert.equal(rolledBack, true);
  });

  it('invokes GraduateCommunityThread GraphQL mutation via CommunityHubMutations.GraduateThreadViaProvider and fails closed on errors', async () => {
    const PROMOTED_SPACE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const user = new UserInfo(undefined, { ID: USER_ID, Name: 'Ada' });
    let capturedQuery = '';
    const liveOk = await CommunityHubMutations.GraduateThreadViaProvider({
      rootPostId: POST_ID,
      targetSpaceTypeCode: 'working-group',
      targetSpaceName: 'Multi-Region Failover — Working Group',
      seedInitialTaskTitle: 'Document failover runbook',
      provider: {
        CurrentUser: user,
        ExecuteGQL: async (query) => {
          capturedQuery = query;
          return {
            GraduateCommunityThread: {
              Success: true,
              PromotedToSpaceID: PROMOTED_SPACE_ID,
              TargetSpaceTypeCode: 'working-group',
              SeededTaskID: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              InvitedParticipantCount: 4,
            },
          };
        },
      },
    });

    assert.match(capturedQuery, /mutation GraduateCommunityThread/);
    assert.equal(liveOk.success, true);
    assert.equal(liveOk.offlineFallback, false);
    assert.equal(liveOk.promotedToSpaceId, PROMOTED_SPACE_ID);

    // Fails closed without CurrentUser when provider exists
    const unauth = await CommunityHubMutations.GraduateThreadViaProvider({
      rootPostId: POST_ID,
      targetSpaceName: 'Unauth Group',
      provider: { CurrentUser: undefined },
    });
    assert.equal(unauth.success, false);

    // Offline fallback ONLY when provider is null
    const offline = await CommunityHubMutations.GraduateThreadViaProvider({
      rootPostId: 'seed-feed-1',
      targetSpaceName: 'Offline Group',
      provider: null,
    });
    assert.equal(offline.success, true);
    assert.equal(offline.offlineFallback, true);
  });

  it('wires KnowledgeStream inputs/errors cleanly and never applies seeded fallbacks inside live catch blocks', () => {
    assert.match(streamTs, /@Input\(\)\s+public\s+spaces:\s*ReadonlyArray<CommunitySpaceDirectoryItem>\s*=\s*\[\];/);
    assert.match(streamTs, /@Input\(\)\s+public\s+topics:\s*ReadonlyArray<string>\s*=\s*\[\];/);
    assert.doesNotMatch(streamTs, /seed-feed-1/);
    assert.match(hubTs, /PersistDetailReply\(/);
    assert.match(hubTs, /ToggleReactionViaProvider\(/);
    assert.match(hubTs, /CommunityHubMutations.GraduateThreadViaProvider\(/);
    assert.doesNotMatch(hubTs, /catch\s*\([^)]*\)\s*\{[^}]*applySeededFallback/);
    assert.match(hubHtml, /id="mjc-detail-promoted-space"/);
    assert.match(hubHtml, /id="mjc-detail-error-banner"/);
    assert.match(hubHtml, /id="mjc-hub-load-error"/);

    // Every clickable <div> or <span> in Angular templates must declare an explicit ARIA role attribute
    for (const templateName of ['community-hub-resource.component.html', 'knowledge-stream.component.html']) {
      const html = readFileSync(join(LIB_DIR, templateName), 'utf8');
      const clickableNonButtonMatches = html.match(/<(?:div|span)\b[^>]*\(click\)="[^"]*"[^>]*>/g) ?? [];
      for (const tag of clickableNonButtonMatches) {
        assert.match(tag, /\brole="/, `Clickable <div>/<span> in ${templateName} must declare an ARIA role: ${tag}`);
      }
    }
  });
});
