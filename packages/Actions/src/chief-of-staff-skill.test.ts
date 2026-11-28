import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RunView, type RunViewParams, type RunViewResult, UserInfo } from '@memberjunction/core';
import { RunActionParams } from '@memberjunction/actions-base';
import { CommunityEmbeddingPersonalizationService } from '@mj-biz-apps/community-core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import { AskFirstDeflectionAction } from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../..');
const METADATA_ROOT = join(REPO_ROOT, 'metadata');
const SKILL_DIR = join(METADATA_ROOT, 'chief-of-staff-skills');

const UUID_V4_UPPER_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

interface SkillMetadataRecord {
  fields: {
    Name: string;
    Description: string;
    Instructions: string;
    Status: string;
    ActivationMode: string;
    CreatedByUserID: string;
  };
  relatedEntities?: {
    'MJ: AI Agent Skills'?: Array<{
      fields: {
        AgentID: string;
        SkillID: string;
        Status: string;
      };
      primaryKey: { ID: string };
      sync?: Record<string, string>;
    }>;
    'MJ: AI Skill Actions'?: Array<{
      fields: {
        SkillID: string;
        ActionID: string;
        Role: string;
        ExposeToModel: boolean;
      };
      primaryKey: { ID: string };
      sync?: Record<string, string>;
    }>;
  };
  primaryKey: { ID: string };
  sync?: Record<string, string>;
}

interface ActionMetadataRecord {
  fields: {
    Name: string;
    DriverClass: string;
  };
}

interface AgentRecord {
  ID: string;
  Name: string;
  BaseAgentID: string | null;
}

interface CommunityForumRow {
  ID: string;
  Slug: string;
  VisibilityBand: 'Shared' | 'Team' | 'PrivateForum';
}

interface CommunityPostRow {
  ID: string;
  ForumID: string;
  RootPostID: string | null;
  ParentPostID: string | null;
  Title: string | null;
  BodyMarkdown: string;
  SummaryMarkdown: string | null;
  AuthorUserID: string;
  AuthorUser: string;
  VisibilityBand: 'Shared' | 'Team';
  Status: 'Published' | 'Answered' | 'Resolved' | 'PendingModeration' | 'Draft';
}

interface CommunityAnswerRow {
  ID: string;
  QuestionPostID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  AIEpistemicStatus: 'Canon Verified' | 'Novel Insight' | 'Partially Outdated' | 'Conflicts With Canon' | null;
}

interface CommunityQuestionRow {
  ID: string;
  AcceptedAnswerPostID: string | null;
  AICanonAnswerPostID: string | null;
}

interface CommunityForumAccessGrant {
  ForumID: string;
  CanSeeTeam: boolean;
  CanModerate: boolean;
}

const PUBLIC_FORUM_ID = '11111111-1111-4111-8111-111111111111';
const PRIVATE_TEAM_FORUM_ID = '22222222-2222-4222-8222-222222222222';
const SHARED_QUESTION_ID = '33333333-3333-4333-8333-333333333333';
const SHARED_ANSWER_ID = '44444444-4444-4444-8444-444444444444';
const TEAM_QUESTION_ID = '55555555-5555-4555-8555-555555555555';
const TEAM_ANSWER_ID = '66666666-6666-4666-8666-666666666666';
const PRIVATE_QUESTION_ID = '77777777-7777-4777-8777-777777777777';
const PRIVATE_ANSWER_ID = '88888888-8888-4888-8888-888888888888';

const USER_A_MEMBER_ID = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
const USER_B_MODERATOR_ID = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB';

function createUser(id: string, name: string, email: string): UserInfo {
  const user = new UserInfo();
  user.ID = id;
  user.Name = name;
  user.Email = email;
  return user;
}

function resolveInheritedSkillsForAgent(
  agent: AgentRecord,
  allAgents: AgentRecord[],
  grantedSkills: Array<{ AgentName: string; SkillName: string; Status: string }>,
): string[] {
  const active = new Set<string>();
  const lineageNames = new Set<string>([agent.Name]);
  let parentId = agent.BaseAgentID;
  while (parentId) {
    const parent = allAgents.find((a) => a.ID === parentId);
    if (!parent) break;
    lineageNames.add(parent.Name);
    parentId = parent.BaseAgentID;
  }
  for (const grant of grantedSkills) {
    if (grant.Status === 'Active' && lineageNames.has(grant.AgentName)) {
      active.add(grant.SkillName);
    }
  }
  return [...active];
}

describe('Chief of Staff Community Skill — Metadata & Auto-Install Integrity', () => {
  it('wires metadata/chief-of-staff-skills into mj-app.json and metadata/.mj-sync.json with zero manual steps', () => {
    const mjApp = JSON.parse(readFileSync(join(REPO_ROOT, 'mj-app.json'), 'utf8')) as {
      metadata?: { directory?: string };
    };
    assert.equal(mjApp.metadata?.directory, 'metadata');

    const rootSync = JSON.parse(readFileSync(join(METADATA_ROOT, '.mj-sync.json'), 'utf8')) as {
      directoryOrder?: string[];
    };
    const order = rootSync.directoryOrder ?? [];
    const actionsIdx = order.indexOf('actions');
    const skillsIdx = order.indexOf('chief-of-staff-skills');
    assert.ok(actionsIdx >= 0, 'actions must be in directoryOrder');
    assert.ok(skillsIdx > actionsIdx, 'chief-of-staff-skills must be ordered after actions');

    const skillSync = JSON.parse(readFileSync(join(SKILL_DIR, '.mj-sync.json'), 'utf8')) as {
      entity: string;
      filePattern: string;
    };
    assert.equal(skillSync.entity, 'MJ: AI Skills');
    assert.equal(skillSync.filePattern, '**/.*.json');
  });

  it('defines valid UUIDv4 primary keys, zero sync blocks, Chief of Staff grant inherited by Pepper, and valid actions with zero raw SQL', () => {
    const skillPath = join(SKILL_DIR, '.chief-of-staff-community-skill.json');
    const rawJson = readFileSync(skillPath, 'utf8');
    assert.equal(rawJson.includes('"sync"'), false, 'skill metadata must contain zero "sync" blocks');

    const records = JSON.parse(rawJson) as SkillMetadataRecord[];
    assert.equal(records.length, 1);
    const skill = records[0];

    assert.match(skill.primaryKey.ID, UUID_V4_UPPER_RE);
    assert.equal(skill.fields.Name, 'Community');
    assert.equal(skill.fields.Status, 'Active');
    assert.equal(skill.fields.ActivationMode, 'Auto');
    assert.equal(skill.fields.CreatedByUserID, '@lookup:MJ: Users.Name=System');
    assert.ok(skill.fields.Instructions.startsWith('@file:'));

    const templateRelPath = skill.fields.Instructions.slice('@file:'.length);
    const templateAbsPath = join(SKILL_DIR, templateRelPath);
    assert.equal(existsSync(templateAbsPath), true, `template must exist: ${templateAbsPath}`);
    const templateMd = readFileSync(templateAbsPath, 'utf8');
    assert.ok(templateMd.includes('MJ_BizApps_Community: Forums'));
    assert.ok(templateMd.includes('MJ_BizApps_Community: Forum Posts'));
    assert.ok(templateMd.includes('MJ_BizApps_Community: Forum Answer Posts'));
    assert.ok(templateMd.includes('RunView'));
    assert.ok(templateMd.toLowerCase().includes('never execute raw sql'));

    const agentGrants = skill.relatedEntities?.['MJ: AI Agent Skills'] ?? [];
    assert.equal(agentGrants.length, 1);
    assert.match(agentGrants[0].primaryKey.ID, UUID_V4_UPPER_RE);
    assert.equal(agentGrants[0].fields.AgentID, '@lookup:MJ: AI Agents.Name=Chief of Staff');
    assert.equal(agentGrants[0].fields.SkillID, '@parent:ID');
    assert.equal(agentGrants[0].fields.Status, 'Active');

    // Verify personal Chief of Staff instance ("Pepper") inherits the skill via BaseAgentID
    const cosTemplate: AgentRecord = { ID: 'COS-TEMPLATE', Name: 'Chief of Staff', BaseAgentID: null };
    const pepper: AgentRecord = { ID: 'PEPPER-PERSONAL', Name: 'Pepper', BaseAgentID: cosTemplate.ID };
    const inherited = resolveInheritedSkillsForAgent(pepper, [cosTemplate, pepper], [
      {
        AgentName: agentGrants[0].fields.AgentID.replace('@lookup:MJ: AI Agents.Name=', ''),
        SkillName: skill.fields.Name,
        Status: agentGrants[0].fields.Status,
      },
    ]);
    assert.deepEqual(inherited, ['Community']);

    // Verify all bound actions exist in metadata/actions/.community-actions.json
    const actionsMetadata = JSON.parse(
      readFileSync(join(METADATA_ROOT, 'actions', '.community-actions.json'), 'utf8'),
    ) as ActionMetadataRecord[];
    const knownActionNames = new Set(actionsMetadata.map((a) => a.fields.Name));
    const boundActions = skill.relatedEntities?.['MJ: AI Skill Actions'] ?? [];
    assert.ok(boundActions.length >= 1, 'Community skill should bind its typed actions');
    for (const bound of boundActions) {
      assert.match(bound.primaryKey.ID, UUID_V4_UPPER_RE);
      assert.equal(bound.fields.SkillID, '@parent:ID');
      const actionName = bound.fields.ActionID.replace('@lookup:MJ: Actions.Name=', '');
      assert.ok(knownActionNames.has(actionName), `bound action must exist in metadata/actions: ${actionName}`);
    }

    // Verify zero raw SQL in all bound action source files
    const boundActionFiles = [
      'AskFirstDeflectionAction.ts',
      'LivingThreadSynthesisAction.ts',
      'EpistemicAnswerGradingAction.ts',
      'ExportCommunityDigestPDFAction.ts',
    ];
    for (const fileName of boundActionFiles) {
      const src = readFileSync(join(__dirname, 'custom', fileName), 'utf8');
      assert.equal(/\bExecuteSQL\b|\bSELECT\s+\*|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b/i.test(src), false, `${fileName} must not use raw SQL`);
    }
  });
});

describe('Chief of Staff Community Skill — Two-User RLS Isolation', () => {
  it('returns strictly different, RLS-scoped answers for a regular member vs. a team moderator invoking the same skill action', async () => {
    CommunityEmbeddingPersonalizationService.Instance.ResetToDefaultProvider();

    const forumsTable: CommunityForumRow[] = [
      { ID: PUBLIC_FORUM_ID, Slug: 'member-qa', VisibilityBand: 'Shared' },
      { ID: PRIVATE_TEAM_FORUM_ID, Slug: 'exec-board-ops', VisibilityBand: 'PrivateForum' },
    ];

    const postsTable: CommunityPostRow[] = [
      {
        ID: SHARED_QUESTION_ID,
        ForumID: PUBLIC_FORUM_ID,
        RootPostID: null,
        ParentPostID: null,
        Title: 'Annual compliance audit renewal checklist',
        BodyMarkdown: 'What is the standard annual compliance audit renewal deadline for general members?',
        SummaryMarkdown: null,
        AuthorUserID: USER_A_MEMBER_ID,
        AuthorUser: 'Member Alice',
        VisibilityBand: 'Shared',
        Status: 'Answered',
      },
      {
        ID: SHARED_ANSWER_ID,
        ForumID: PUBLIC_FORUM_ID,
        RootPostID: SHARED_QUESTION_ID,
        ParentPostID: SHARED_QUESTION_ID,
        Title: null,
        BodyMarkdown: 'General members submit the public compliance audit renewal checklist by December 15 each year.',
        SummaryMarkdown: null,
        AuthorUserID: USER_B_MODERATOR_ID,
        AuthorUser: 'Moderator Bob',
        VisibilityBand: 'Shared',
        Status: 'Published',
      },
      {
        ID: TEAM_QUESTION_ID,
        ForumID: PUBLIC_FORUM_ID,
        RootPostID: null,
        ParentPostID: null,
        Title: 'Confidential audit escalation protocol for internal staff',
        BodyMarkdown: 'Internal team compliance audit renewal escalation secret waiver code.',
        SummaryMarkdown: null,
        AuthorUserID: USER_B_MODERATOR_ID,
        AuthorUser: 'Moderator Bob',
        VisibilityBand: 'Team',
        Status: 'Answered',
      },
      {
        ID: TEAM_ANSWER_ID,
        ForumID: PUBLIC_FORUM_ID,
        RootPostID: TEAM_QUESTION_ID,
        ParentPostID: TEAM_QUESTION_ID,
        Title: null,
        BodyMarkdown: 'INTERNAL-TEAM-ONLY: Use confidential compliance audit renewal escalation code DELTA-99.',
        SummaryMarkdown: null,
        AuthorUserID: USER_B_MODERATOR_ID,
        AuthorUser: 'Moderator Bob',
        VisibilityBand: 'Team',
        Status: 'Published',
      },
      {
        ID: PRIVATE_QUESTION_ID,
        ForumID: PRIVATE_TEAM_FORUM_ID,
        RootPostID: null,
        ParentPostID: null,
        Title: 'Executive board merger contingency',
        BodyMarkdown: 'Confidential board merger contingency plan.',
        SummaryMarkdown: null,
        AuthorUserID: USER_B_MODERATOR_ID,
        AuthorUser: 'Moderator Bob',
        VisibilityBand: 'Shared',
        Status: 'Answered',
      },
      {
        ID: PRIVATE_ANSWER_ID,
        ForumID: PRIVATE_TEAM_FORUM_ID,
        RootPostID: PRIVATE_QUESTION_ID,
        ParentPostID: PRIVATE_QUESTION_ID,
        Title: null,
        BodyMarkdown: 'PRIVATE-FORUM-ONLY: Board merger contingency approval requires unanimous committee consent.',
        SummaryMarkdown: null,
        AuthorUserID: USER_B_MODERATOR_ID,
        AuthorUser: 'Moderator Bob',
        VisibilityBand: 'Shared',
        Status: 'Published',
      },
    ];

    const answersTable: CommunityAnswerRow[] = [
      {
        ID: SHARED_ANSWER_ID,
        QuestionPostID: SHARED_QUESTION_ID,
        IsAcceptedByAuthor: true,
        IsVerifiedByModerator: true,
        AIEpistemicStatus: 'Canon Verified',
      },
      {
        ID: TEAM_ANSWER_ID,
        QuestionPostID: TEAM_QUESTION_ID,
        IsAcceptedByAuthor: true,
        IsVerifiedByModerator: true,
        AIEpistemicStatus: 'Canon Verified',
      },
      {
        ID: PRIVATE_ANSWER_ID,
        QuestionPostID: PRIVATE_QUESTION_ID,
        IsAcceptedByAuthor: true,
        IsVerifiedByModerator: true,
        AIEpistemicStatus: 'Canon Verified',
      },
    ];

    const questionsTable: CommunityQuestionRow[] = [
      { ID: SHARED_QUESTION_ID, AcceptedAnswerPostID: SHARED_ANSWER_ID, AICanonAnswerPostID: SHARED_ANSWER_ID },
      { ID: TEAM_QUESTION_ID, AcceptedAnswerPostID: TEAM_ANSWER_ID, AICanonAnswerPostID: TEAM_ANSWER_ID },
      { ID: PRIVATE_QUESTION_ID, AcceptedAnswerPostID: PRIVATE_ANSWER_ID, AICanonAnswerPostID: PRIVATE_ANSWER_ID },
    ];

    // Exact shadow of metadata/row-level-security-filters/.row-level-security-filters.json
    const accessByUser = new Map<string, CommunityForumAccessGrant[]>([
      [
        USER_A_MEMBER_ID,
        [{ ForumID: PUBLIC_FORUM_ID, CanSeeTeam: false, CanModerate: false }],
      ],
      [
        USER_B_MODERATOR_ID,
        [
          { ForumID: PUBLIC_FORUM_ID, CanSeeTeam: true, CanModerate: true },
          { ForumID: PRIVATE_TEAM_FORUM_ID, CanSeeTeam: true, CanModerate: true },
        ],
      ],
    ]);

    function rlsEvaluate(params: RunViewParams, contextUser?: UserInfo): RunViewResult<Record<string, string | number | boolean | null>> {
      const grants = contextUser ? (accessByUser.get(contextUser.ID) ?? []) : [];
      const grantByForum = new Map(grants.map((g) => [g.ForumID.toLowerCase(), g]));
      const filterText = (typeof params.ExtraFilter === 'string' ? params.ExtraFilter : '').toLowerCase();

      if (params.EntityName === COMMUNITY_ENTITY_NAMES.Forums) {
        const visible = forumsTable.filter((f) => {
          if (!grantByForum.has(f.ID.toLowerCase())) return false;
          if (filterText.includes('id in')) {
            return filterText.includes(f.ID.toLowerCase());
          }
          return true;
        });
        return {
          Success: true,
          Results: visible.map((f) => ({ ID: f.ID, Slug: f.Slug })),
          RowCount: visible.length,
          TotalRowCount: visible.length,
          ExecutionTime: 1,
          ErrorMessage: '',
        };
      }

      if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
        const visible = postsTable.filter((p) => {
          const grant = grantByForum.get(p.ForumID.toLowerCase());
          if (!grant) return false;
          const bandAllowed = p.VisibilityBand === 'Shared' || (p.VisibilityBand === 'Team' && grant.CanSeeTeam);
          const statusAllowed =
            p.Status === 'Published' ||
            p.Status === 'Answered' ||
            p.Status === 'Resolved' ||
            p.AuthorUserID === contextUser?.ID ||
            grant.CanModerate;
          if (!bandAllowed || !statusAllowed) return false;
          if (filterText.includes('forumid in')) {
            return filterText.includes(p.ForumID.toLowerCase());
          }
          return true;
        });
        return {
          Success: true,
          Results: visible.map((p) => ({
            ID: p.ID,
            ForumID: p.ForumID,
            RootPostID: p.RootPostID,
            ParentPostID: p.ParentPostID,
            Title: p.Title,
            BodyMarkdown: p.BodyMarkdown,
            SummaryMarkdown: p.SummaryMarkdown,
            AuthorUserID: p.AuthorUserID,
            AuthorUser: p.AuthorUser,
          })),
          RowCount: visible.length,
          TotalRowCount: visible.length,
          ExecutionTime: 1,
          ErrorMessage: '',
        };
      }

      if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumAnswerPosts) {
        const visible = answersTable.filter((a) => filterText.includes(a.ID.toLowerCase()));
        return {
          Success: true,
          Results: visible.map((a) => ({
            ID: a.ID,
            QuestionPostID: a.QuestionPostID,
            IsAcceptedByAuthor: a.IsAcceptedByAuthor,
            IsVerifiedByModerator: a.IsVerifiedByModerator,
            AIEpistemicStatus: a.AIEpistemicStatus,
          })),
          RowCount: visible.length,
          TotalRowCount: visible.length,
          ExecutionTime: 1,
          ErrorMessage: '',
        };
      }

      if (params.EntityName === COMMUNITY_ENTITY_NAMES.ForumQuestionPosts) {
        const visible = questionsTable.filter((q) => filterText.includes(q.ID.toLowerCase()));
        return {
          Success: true,
          Results: visible.map((q) => ({
            ID: q.ID,
            AcceptedAnswerPostID: q.AcceptedAnswerPostID,
            AICanonAnswerPostID: q.AICanonAnswerPostID,
          })),
          RowCount: visible.length,
          TotalRowCount: visible.length,
          ExecutionTime: 1,
          ErrorMessage: '',
        };
      }

      return {
        Success: true,
        Results: [],
        RowCount: 0,
        TotalRowCount: 0,
        ExecutionTime: 1,
        ErrorMessage: '',
      };
    }

    const runViewMock = mock.method(
      RunView.prototype,
      'RunView',
      async (params: RunViewParams, contextUser?: UserInfo) => rlsEvaluate(params, contextUser),
    );
    const runViewsMock = mock.method(
      RunView.prototype,
      'RunViews',
      async (paramsList: RunViewParams[], contextUser?: UserInfo) =>
        paramsList.map((params) => rlsEvaluate(params, contextUser)),
    );

    try {
      const userA = createUser(USER_A_MEMBER_ID, 'Member Alice', 'alice@example.com');
      const userB = createUser(USER_B_MODERATOR_ID, 'Moderator Bob', 'bob@example.com');
      const action = new AskFirstDeflectionAction();

      async function askCommunityAsUser(user: UserInfo, query: string): Promise<{
        visibleForumIds: string[];
        deflected: boolean;
        synthesizedAnswer: string | null;
        citedPostIds: string[];
      }> {
        // Step 1 from skill instructions: resolve AllowedForumIDs via RunView under caller's ContextUser
        const rv = new RunView();
        const forumsRes = await rv.RunView<{ ID: string }>(
          { EntityName: COMMUNITY_ENTITY_NAMES.Forums, Fields: ['ID'], ResultType: 'simple' },
          user,
        );
        const visibleForumIds = (forumsRes.Results ?? []).map((f) => f.ID);

        // Step 2: invoke the bound Ask-First Deflection action with the caller's ContextUser
        const actionParams = new RunActionParams();
        actionParams.ContextUser = user;
        actionParams.Params = [
          { Name: 'QueryText', Value: query, Type: 'Input' },
          { Name: 'AllowedForumIDs', Value: visibleForumIds.join(','), Type: 'Input' },
          { Name: 'MinConfidence', Value: '0.2', Type: 'Input' },
        ];
        const res = await action.Run(actionParams);
        assert.equal(res.Success, true);

        const outputParams = res.Params ?? actionParams.Params;
        const deflected = Boolean(outputParams.find((p) => p.Name === 'Deflected')?.Value);
        const synthesizedRaw = outputParams.find((p) => p.Name === 'SynthesizedAnswerMarkdown')?.Value;
        const synthesizedAnswer = typeof synthesizedRaw === 'string' ? synthesizedRaw : null;
        const citationsRaw = outputParams.find((p) => p.Name === 'Citations')?.Value;
        const citations = typeof citationsRaw === 'string'
          ? (JSON.parse(citationsRaw) as Array<{ postId: string }>)
          : [];
        return {
          visibleForumIds,
          deflected,
          synthesizedAnswer,
          citedPostIds: citations.map((c) => c.postId),
        };
      }

      // Query 1: Ask about the internal team escalation code DELTA-99
      const teamQuery = 'What is the internal team compliance audit renewal escalation waiver code?';
      const userATeamRes = await askCommunityAsUser(userA, teamQuery);
      const userBTeamRes = await askCommunityAsUser(userB, teamQuery);

      assert.deepEqual(userATeamRes.visibleForumIds, [PUBLIC_FORUM_ID]);
      assert.deepEqual(userBTeamRes.visibleForumIds, [PUBLIC_FORUM_ID, PRIVATE_TEAM_FORUM_ID]);

      // User A must NEVER see Team-band answer content or ID even though it lives in PUBLIC_FORUM_ID
      assert.equal(userATeamRes.citedPostIds.includes(TEAM_ANSWER_ID), false);
      assert.equal((userATeamRes.synthesizedAnswer ?? '').includes('DELTA-99'), false);

      // User B (CanSeeTeam = true) receives the Team-band answer
      assert.equal(userBTeamRes.deflected, true);
      assert.equal(userBTeamRes.citedPostIds.includes(TEAM_ANSWER_ID), true);
      assert.ok((userBTeamRes.synthesizedAnswer ?? '').includes('DELTA-99'));

      // Query 2: Ask about the private executive board merger contingency forum
      const privateQuery = 'What is the executive board merger contingency plan approval rule?';
      const userAPrivateRes = await askCommunityAsUser(userA, privateQuery);
      const userBPrivateRes = await askCommunityAsUser(userB, privateQuery);

      assert.equal(userAPrivateRes.deflected, false);
      assert.deepEqual(userAPrivateRes.citedPostIds, []);
      assert.equal(userBPrivateRes.deflected, true);
      assert.equal(userBPrivateRes.citedPostIds.includes(PRIVATE_ANSWER_ID), true);
      assert.ok((userBPrivateRes.synthesizedAnswer ?? '').includes('PRIVATE-FORUM-ONLY'));
    } finally {
      runViewMock.mock.restore();
      runViewsMock.mock.restore();
    }
  });
});
