import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  type CompositeKey,
  Metadata,
  RunView,
  TransactionGroupBase,
  type TransactionResult,
  UserInfo,
} from '@memberjunction/core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';

const prevDbDatabase = process.env.DB_DATABASE;
const prevDbUsername = process.env.DB_USERNAME;
const prevDbPassword = process.env.DB_PASSWORD;
if (!process.env.DB_DATABASE) process.env.DB_DATABASE = 'mj_ci_unit_test';
if (!process.env.DB_USERNAME) process.env.DB_USERNAME = 'mj_ci_unit_test';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'mj_ci_unit_test_placeholder';

const {
  BuildDeterministicGraduationUUID,
  CommunityGraduationResolver,
  ThreadGraduationService,
} = await (async () => {
  try {
    return await import('../dist/index.js');
  } finally {
    if (prevDbDatabase === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = prevDbDatabase;
    if (prevDbUsername === undefined) delete process.env.DB_USERNAME;
    else process.env.DB_USERNAME = prevDbUsername;
    if (prevDbPassword === undefined) delete process.env.DB_PASSWORD;
    else process.env.DB_PASSWORD = prevDbPassword;
  }
})();

class InMemoryTxGroup extends TransactionGroupBase {
  public submitCalls = 0;
  public shouldFailSubmit = false;

  public override async Submit(allowRetryOfFailedTransaction?: boolean): Promise<boolean> {
    this.submitCalls += 1;
    if (this.shouldFailSubmit) {
      return false;
    }
    return super.Submit(allowRetryOfFailedTransaction);
  }

  protected override async HandleSubmit(): Promise<TransactionResult[]> {
    return [];
  }
}

const ROOT_POST_ID = '11111111-aaaa-4aaa-8aaa-111111111111';
const ROOT_NO_SUMMARY_ID = '22222222-aaaa-4aaa-8aaa-222222222222';
const FORUM_ID = '33333333-bbbb-4bbb-8bbb-333333333333';
const PARENT_SPACE_ID = '44444444-cccc-4ccc-8ccc-444444444444';
const PARENT_SPACE_TYPE_ID = '55555555-dddd-4ddd-8ddd-555555555555';
const WG_SPACE_TYPE_ID = '66666666-dddd-4ddd-8ddd-666666666666';
const FORUM_ROLE_ID = '77777777-eeee-4eee-8eee-777777777777';
const SPACE_MEMBER_ROLE_ID = '88888888-eeee-4eee-8eee-888888888888';
const TASK_TYPE_ID = '99999999-ffff-4fff-8fff-999999999999';
const USER_1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const USER_2 = 'bbbbbbbb-0000-4000-8000-000000000002';

interface SimulatedStore {
  rootPost: {
    ID: string;
    ParentPostID: string | null;
    ForumID: string;
    Title: string | null;
    BodyMarkdown: string;
    SummaryMarkdown: string | null;
    PromotedToSpaceID: string | null;
    LinkedTaskID: string | null;
    TransactionGroup?: TransactionGroupBase;
    Save: () => Promise<boolean>;
  };
  spaces: Array<{
    ID: string;
    SpaceTypeID: string;
    ParentID: string | null;
    Name: string;
    Description: string | null;
    OwnerID: string;
    InheritsMembership: boolean;
    AgentRetrieval: string;
    StartedAt: Date | null;
    deleted: boolean;
  }>;
  tasks: Array<{
    ID: string;
    Name: string;
    Description: string | null;
    TypeID: string;
    UserID: string | null;
  }>;
  members: Array<{
    SpaceID: string;
    UserID: string;
    SpaceRoleTypeID: string;
    Band: string;
    Status: string;
  }>;
}

function setupGraduationMocks(initialSummary: string | null, txGroup: InMemoryTxGroup, rootPostId = ROOT_POST_ID): SimulatedStore {
  const store: SimulatedStore = {
    rootPost: {
      ID: rootPostId,
      ParentPostID: null,
      ForumID: FORUM_ID,
      Title: 'Webhook Dead-Letter Telemetry Standard',
      BodyMarkdown: 'Standardizing retry backoff and dead-letter alerting across member deployments.',
      SummaryMarkdown: initialSummary,
      PromotedToSpaceID: null,
      LinkedTaskID: null,
      Save: async () => true,
    },
    spaces: [],
    tasks: [],
    members: [],
  };

  mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => txGroup);
  mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string, _keyOrUser?: CompositeKey | UserInfo) => {
    if (entityName === COMMUNITY_ENTITY_NAMES.ForumPosts) {
      return store.rootPost;
    }
    if (entityName === COMMUNITY_ENTITY_NAMES.Forums) {
      return { ID: FORUM_ID, SpaceID: PARENT_SPACE_ID, Save: async () => true };
    }
    if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
      const spaceRecord = {
        ID: '',
        SpaceTypeID: '',
        ParentID: null as string | null,
        Name: '',
        Description: null as string | null,
        OwnerID: '',
        InheritsMembership: false,
        AgentRetrieval: 'Included',
        StartedAt: null as Date | null,
        deleted: false,
        Save: async () => {
          // Delay slightly to expose any race condition if concurrent lock fails
          await new Promise((r) => setTimeout(r, 10));
          store.spaces.push(spaceRecord);
          return true;
        },
        Delete: async () => {
          spaceRecord.deleted = true;
          return true;
        },
      };
      return spaceRecord;
    }
    if (entityName === 'MJ: Tasks') {
      const taskRecord = {
        ID: '',
        Name: '',
        Description: null as string | null,
        TypeID: '',
        UserID: null as string | null,
        TransactionGroup: undefined as TransactionGroupBase | undefined,
        Save: async () => {
          store.tasks.push({
            ID: taskRecord.ID,
            Name: taskRecord.Name,
            Description: taskRecord.Description,
            TypeID: taskRecord.TypeID,
            UserID: taskRecord.UserID,
          });
          return true;
        },
      };
      return taskRecord;
    }
    if (entityName === 'MJ_BizApps_Collaboration: Space Members') {
      const memberRecord = {
        SpaceID: '',
        UserID: '',
        SpaceRoleTypeID: '',
        Band: 'Shared',
        Status: 'Invited',
        TransactionGroup: undefined as TransactionGroupBase | undefined,
        Save: async () => {
          store.members.push({
            SpaceID: memberRecord.SpaceID,
            UserID: memberRecord.UserID,
            SpaceRoleTypeID: memberRecord.SpaceRoleTypeID,
            Band: memberRecord.Band,
            Status: memberRecord.Status,
          });
          return true;
        },
      };
      return memberRecord;
    }
    return { Save: async () => true };
  });

  const runViewHandler = async (query: { EntityName: string; ExtraFilter?: string }) => {
    const filter = query.ExtraFilter ?? '';
    if (query.EntityName === COMMUNITY_ENTITY_NAMES.ForumMembers) {
      return { Success: true, Results: [{ ForumRoleTypeID: FORUM_ROLE_ID }] };
    }
    if (query.EntityName === COMMUNITY_ENTITY_NAMES.ForumRoleTypes) {
      return { Success: true, Results: [{ CanModerateQueue: true, CanPromoteToSpace: true }] };
    }
    if (query.EntityName === COMMUNITY_ENTITY_NAMES.ForumPosts && filter.includes(`RootPostID = '${rootPostId}'`)) {
      return {
        Success: true,
        Results: [
          {
            ID: 'aaaaaaaa-1111-4111-8111-111111111111',
            BodyMarkdown: 'Use OpenTelemetry spans for dead-letter retry counts.',
            AuthorUserID: USER_2,
            AuthorUser: 'Chidi Okonkwo',
          },
        ],
      };
    }
    if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
      if (filter.includes(PARENT_SPACE_ID)) {
        return { Success: true, Results: [{ ID: PARENT_SPACE_ID, SpaceTypeID: PARENT_SPACE_TYPE_ID }] };
      }
      const existing = store.spaces.filter((s) => !s.deleted && filter.includes(s.ID));
      return { Success: true, Results: existing.map((s) => ({ ID: s.ID })) };
    }
    if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
      if (filter.includes(PARENT_SPACE_TYPE_ID)) {
        return {
          Success: true,
          Results: [
            {
              ID: PARENT_SPACE_TYPE_ID,
              Code: 'community',
              Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group', 'project'] } }),
            },
          ],
        };
      }
      return { Success: true, Results: [{ ID: WG_SPACE_TYPE_ID }] };
    }
    if (query.EntityName === 'MJ_BizApps_Collaboration: Space Role Types') {
      return { Success: true, Results: [{ ID: SPACE_MEMBER_ROLE_ID }] };
    }
    if (query.EntityName === 'MJ: Task Types') {
      return { Success: true, Results: [{ ID: TASK_TYPE_ID }] };
    }
    if (query.EntityName === 'MJ_BizApps_Collaboration: Space Members') {
      return { Success: true, Results: store.members.map((m) => ({ UserID: m.UserID })) };
    }
    return { Success: true, Results: [] };
  };
  mock.method(RunView.prototype, 'RunView', runViewHandler);
  mock.method(RunView.prototype, 'RunViews', async (queries: Array<{ EntityName: string; ExtraFilter?: string }>) =>
    Promise.all(queries.map((q) => runViewHandler(q))),
  );

  return store;
}

describe('Slice 3 — 1-Click Graduation to Collaboration Working Space', () => {
  it('graduates a thread carrying synthesized summary, seeded Task, participants, and PromotedToSpaceID, and is strictly idempotent sequentially & concurrently', async () => {
    const service = new ThreadGraduationService();
    const user = new UserInfo(undefined, { ID: USER_1 });
    const txGroup = new InMemoryTxGroup();
    const summary = '**Topic:** Webhook Standard\n\n**Key Takeaways:**\n- Cap retry jitter [1]';
    const store = setupGraduationMocks(summary, txGroup, ROOT_POST_ID);

    try {
      const request = {
        rootPostId: ROOT_POST_ID,
        targetSpaceTypeCode: 'working-group',
        targetSpaceName: 'Webhook Telemetry Working Group',
        seedInitialTaskTitle: 'Draft Alerting Spec v1',
        includeParticipantUserIds: [USER_1, USER_2, USER_1.toUpperCase()],
      };

      // Concurrent 1-click requests for the same thread must serialize and create ONLY ONE Space, Task, and Member set
      const [first, second] = await Promise.all([
        service.GraduateThreadToSpace({ request, contextUser: user }),
        service.GraduateThreadToSpace({ request, contextUser: user }),
      ]);

      const expectedSpaceId = BuildDeterministicGraduationUUID('space', ROOT_POST_ID);
      const expectedTaskId = BuildDeterministicGraduationUUID('task', ROOT_POST_ID);

      assert.equal(first.promotedToSpaceId, expectedSpaceId);
      assert.equal(first.seededTaskId, expectedTaskId);
      assert.equal(first.invitedParticipantCount, 2);
      assert.equal(first.alreadyGraduated, false);

      assert.equal(second.promotedToSpaceId, expectedSpaceId);
      assert.equal(second.alreadyGraduated, true);
      assert.equal(second.seededTaskId, null);
      assert.equal(second.invitedParticipantCount, 0);

      assert.equal(store.spaces.length, 1);
      assert.equal(store.spaces[0].Description, summary);
      assert.equal(store.spaces[0].ParentID, PARENT_SPACE_ID);
      assert.equal(store.spaces[0].OwnerID, USER_1);

      assert.equal(store.tasks.length, 1);
      assert.equal(store.tasks[0].Name, 'Draft Alerting Spec v1');
      assert.equal(store.tasks[0].Description, summary);
      assert.equal(store.tasks[0].UserID, USER_1);

      assert.equal(store.members.length, 2);
      assert.equal(store.rootPost.PromotedToSpaceID, expectedSpaceId);
      assert.equal(store.rootPost.LinkedTaskID, expectedTaskId);
      assert.equal(txGroup.submitCalls, 1);

      // Sequential re-graduation retry must also return the existing Space with zero new writes
      const third = await service.GraduateThreadToSpace({ request, contextUser: user });
      assert.equal(third.promotedToSpaceId, expectedSpaceId);
      assert.equal(third.alreadyGraduated, true);
      assert.equal(store.spaces.length, 1);
      assert.equal(store.tasks.length, 1);
      assert.equal(store.members.length, 2);
      assert.equal(txGroup.submitCalls, 1);
    } finally {
      mock.restoreAll();
    }
  });

  it('synthesizes thread context onto Space.Description and Task.Description when SummaryMarkdown is initially empty', async () => {
    const service = new ThreadGraduationService();
    const user = new UserInfo(undefined, { ID: USER_1 });
    const txGroup = new InMemoryTxGroup();
    const store = setupGraduationMocks(null, txGroup, ROOT_NO_SUMMARY_ID);

    try {
      const result = await service.GraduateThreadToSpace({
        request: {
          rootPostId: ROOT_NO_SUMMARY_ID,
          targetSpaceTypeCode: 'working-group',
          targetSpaceName: 'Telemetry Working Group',
          seedInitialTaskTitle: 'Bootstrap Telemetry Repo',
          includeParticipantUserIds: [USER_2],
        },
        contextUser: user,
      });

      assert.equal(result.alreadyGraduated, false);
      assert.equal(store.spaces.length, 1);
      assert.match(store.spaces[0].Description ?? '', /\*\*Key Takeaways:\*\*/);
      assert.match(store.spaces[0].Description ?? '', /OpenTelemetry spans/);
      assert.equal(store.tasks[0].Description, store.spaces[0].Description);
    } finally {
      mock.restoreAll();
    }
  });

  it('rolls back newly created parent Space when TransactionGroup.Submit() fails', async () => {
    const service = new ThreadGraduationService();
    const user = new UserInfo(undefined, { ID: USER_1 });
    const txGroup = new InMemoryTxGroup();
    txGroup.shouldFailSubmit = true;
    const store = setupGraduationMocks('Summary text', txGroup, ROOT_POST_ID);

    try {
      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              targetSpaceTypeCode: 'working-group',
              targetSpaceName: 'Rollback Test Space',
              seedInitialTaskTitle: 'Task 1',
              includeParticipantUserIds: [USER_2],
            },
            contextUser: user,
          }),
        /Transactional commit failed/,
      );
      assert.equal(store.spaces.length, 1);
      assert.equal(store.spaces[0].deleted, true);
    } finally {
      mock.restoreAll();
    }
  });

  it('surfaces AlreadyGraduated on CommunityGraduationResolver.GraduateCommunityThread GraphQL payload', async () => {
    const resolver = new CommunityGraduationResolver();
    const user = new UserInfo(undefined, { ID: USER_1 });
    mock.method(resolver, 'GetUserFromPayload', () => user);
    mock.method(ThreadGraduationService.prototype, 'GraduateThreadToSpace', async () => ({
      promotedToSpaceId: PARENT_SPACE_ID,
      targetSpaceTypeCode: 'working-group',
      seededTaskId: null,
      invitedParticipantCount: 0,
      alreadyGraduated: true,
    }));

    try {
      const payload = await resolver.GraduateCommunityThread(
        {
          RootPostID: ROOT_POST_ID,
          TargetSpaceTypeCode: 'working-group',
          TargetSpaceName: 'Existing Group',
        },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );

      assert.equal(payload.Success, true);
      assert.equal(payload.PromotedToSpaceID, PARENT_SPACE_ID);
      assert.equal(payload.AlreadyGraduated, true);
    } finally {
      mock.restoreAll();
    }
  });
});
