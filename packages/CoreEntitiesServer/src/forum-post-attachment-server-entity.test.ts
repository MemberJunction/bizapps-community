import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  BaseEntity,
  EntityInfo,
  RunView,
  UserInfo,
  type RunViewParams,
  type RunViewResult,
} from '@memberjunction/core';
import { MJGlobal, UUIDsEqual } from '@memberjunction/global';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import {
  ForumPostAttachmentServerEntity,
  LoadBizAppsCommunityCoreEntitiesServer,
} from '../dist/index.js';

const ROLE_ID = '11111111-1111-4111-8111-111111111111';
const SPACE_1_ID = '22222222-2222-4222-8222-222222222201';
const SPACE_2_ID = '22222222-2222-4222-8222-222222222202';
const OWNER_ID = '33333333-3333-4333-8333-333333333301';
const SHARED_USER_ID = '33333333-3333-4333-8333-333333333302';
const TEAM_USER_ID = '33333333-3333-4333-8333-333333333303';
const MOD_USER_ID = '33333333-3333-4333-8333-333333333304';
const OUTSIDER_ID = '33333333-3333-4333-8333-333333333305';

const FORUM_SHARED_ID = '44444444-4444-4444-8444-444444444401';
const FORUM_TEAM_ID = '44444444-4444-4444-8444-444444444402';
const ROLE_CONTRIB_ID = '55555555-5555-4555-8555-555555555501';
const ROLE_MOD_ID = '55555555-5555-4555-8555-555555555502';

const SHARED_POST_ID = '66666666-6666-4666-8666-666666666601';
const TEAM_POST_ID = '66666666-6666-4666-8666-666666666602';
const LOCKED_POST_ID = '66666666-6666-4666-8666-666666666603';

const ENTITY_ARTIFACTS_ID = '77777777-7777-4777-8777-777777777701';
const ENTITY_FILES_ID = '77777777-7777-4777-8777-777777777702';
const ARTIFACT_ID = '88888888-8888-4888-8888-888888888801';
const ARTIFACT_VERSION_ID = '88888888-8888-4888-8888-888888888802';
const FILE_ID = '88888888-8888-4888-8888-888888888803';

const SI_VALID_SHARED_ART_ID = '99999999-9999-4999-8999-999999999901';
const SI_VALID_TEAM_ART_ID = '99999999-9999-4999-8999-999999999902';
const SI_OTHER_SPACE_ID = '99999999-9999-4999-8999-999999999903';
const SI_FAKE_POST_FILE_ID = '99999999-9999-4999-8999-999999999904';
const SI_MISMATCHED_VER_ID = '99999999-9999-4999-8999-999999999905';

function makeUser(id: string): UserInfo {
  return new UserInfo(undefined, {
    ID: id,
    Name: `User-${id.slice(-4)}`,
    Email: 'user@example.com',
    UserRoles: [{ RoleID: ROLE_ID, Role: 'Developer', UserID: id }],
  });
}

function buildAttachmentEntityInfo(): EntityInfo {
  const fields = ['ID', 'PostID', 'SpaceItemID', 'Caption', 'Sequence'];
  return new EntityInfo({
    ID: `entity-${COMMUNITY_ENTITY_NAMES.ForumPostAttachments}`,
    Name: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
    Status: 'Active',
    AllowCreateAPI: true,
    AllowUpdateAPI: true,
    AllowDeleteAPI: true,
    BaseTable: 'ForumPostAttachment',
    BaseView: 'vwForumPostAttachments',
    EntityFields: fields.map((name) => ({
      ID: `field-att-${name}`,
      Name: name,
      DisplayName: name,
      IsPrimaryKey: name === 'ID',
      AllowsNull: name === 'Caption',
      Type: name === 'Sequence' ? 'int' : 'nvarchar',
      AllowUpdateAPI: true,
    })),
    EntityPermissions: [
      { RoleID: ROLE_ID, CanCreate: true, CanRead: true, CanUpdate: true, CanDelete: true },
    ],
  });
}

function extractFilterValue(filter: string, col: string): string | null {
  const m = new RegExp(`(?:^|\\s|AND\\s)${col}\\s*=\\s*'([^']*)'`, 'i').exec(filter);
  return m ? m[1] : null;
}

describe('CR-2: ForumPostAttachmentServerEntity server-side validation guard', () => {
  const entityInfo = buildAttachmentEntityInfo();
  let existingAttachments: Array<{ ID: string; PostID: string; SpaceItemID: string }>;

  beforeEach(() => {
    LoadBizAppsCommunityCoreEntitiesServer();
    existingAttachments = [];

    const posts = [
      {
        ID: SHARED_POST_ID,
        ForumID: FORUM_SHARED_ID,
        ParentPostID: null as string | null,
        AuthorUserID: SHARED_USER_ID,
        VisibilityBand: 'Shared' as const,
        IsLocked: false,
      },
      {
        ID: TEAM_POST_ID,
        ForumID: FORUM_TEAM_ID,
        ParentPostID: null as string | null,
        AuthorUserID: TEAM_USER_ID,
        VisibilityBand: 'Team' as const,
        IsLocked: false,
      },
      {
        ID: LOCKED_POST_ID,
        ForumID: FORUM_SHARED_ID,
        ParentPostID: null as string | null,
        AuthorUserID: SHARED_USER_ID,
        VisibilityBand: 'Shared' as const,
        IsLocked: true,
      },
    ];

    const forums = [
      {
        ID: FORUM_SHARED_ID,
        SpaceID: SPACE_1_ID,
        Name: 'Shared Forum',
        VisibilityBand: 'Shared' as const,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open' as const,
        Status: 'Active' as const,
        ForumTypeID: '00000000-0000-4000-8000-000000000001',
        ParentForumID: null,
        Slug: 'shared',
        Description: null,
        Icon: null,
        ColorHex: null,
        AnonymousReadMode: 'None' as const,
        InboundEmailAlias: null,
        Sequence: 1,
        Configuration: null,
      },
      {
        ID: FORUM_TEAM_ID,
        SpaceID: SPACE_1_ID,
        Name: 'Team Forum',
        VisibilityBand: 'Team' as const,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open' as const,
        Status: 'Active' as const,
        ForumTypeID: '00000000-0000-4000-8000-000000000001',
        ParentForumID: null,
        Slug: 'team',
        Description: null,
        Icon: null,
        ColorHex: null,
        AnonymousReadMode: 'None' as const,
        InboundEmailAlias: null,
        Sequence: 2,
        Configuration: null,
      },
    ];

    const spaces = [{ ID: SPACE_1_ID, OwnerID: OWNER_ID }];
    const spaceMembers = [
      { ID: '10000000-0000-4000-8000-000000000001', SpaceID: SPACE_1_ID, UserID: SHARED_USER_ID, Band: 'Shared', Status: 'Active' },
      { ID: '10000000-0000-4000-8000-000000000002', SpaceID: SPACE_1_ID, UserID: TEAM_USER_ID, Band: 'Team', Status: 'Active' },
      { ID: '10000000-0000-4000-8000-000000000003', SpaceID: SPACE_1_ID, UserID: MOD_USER_ID, Band: 'Team', Status: 'Active' },
    ];
    const forumMembers = [
      { ID: '20000000-0000-4000-8000-000000000001', ForumID: FORUM_SHARED_ID, UserID: SHARED_USER_ID, ForumRoleTypeID: ROLE_CONTRIB_ID, Status: 'Active' },
      { ID: '20000000-0000-4000-8000-000000000002', ForumID: FORUM_SHARED_ID, UserID: MOD_USER_ID, ForumRoleTypeID: ROLE_MOD_ID, Status: 'Active' },
    ];
    const roleTypes = [
      {
        ID: ROLE_CONTRIB_ID,
        Code: 'contributor',
        Name: 'Contributor',
        Description: null,
        Level: 50,
        CanConfigureForum: false,
        CanModerateQueue: false,
        CanPinOrLock: false,
        CanAcceptAnswers: false,
        CanVerifyCanon: false,
        CanPromoteToSpace: false,
        CanCreateRootPost: true,
        CanReply: true,
        CanCoEditDocs: true,
        VoteWeightMultiplier: 1,
        Sequence: 1,
        IsActive: true,
      },
      {
        ID: ROLE_MOD_ID,
        Code: 'moderator',
        Name: 'Moderator',
        Description: null,
        Level: 10,
        CanConfigureForum: true,
        CanModerateQueue: true,
        CanPinOrLock: true,
        CanAcceptAnswers: true,
        CanVerifyCanon: true,
        CanPromoteToSpace: true,
        CanCreateRootPost: true,
        CanReply: true,
        CanCoEditDocs: true,
        VoteWeightMultiplier: 1,
        Sequence: 2,
        IsActive: true,
      },
    ];
    const spaceItems = [
      {
        ID: SI_VALID_SHARED_ART_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: ARTIFACT_VERSION_ID,
      },
      {
        ID: SI_VALID_TEAM_ART_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Team',
        Folder: 'Post Media',
        ArtifactVersionID: ARTIFACT_VERSION_ID,
      },
      {
        ID: SI_OTHER_SPACE_ID,
        SpaceID: SPACE_2_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: ARTIFACT_VERSION_ID,
      },
      {
        ID: SI_FAKE_POST_FILE_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${SHARED_POST_ID}`,
        Band: 'Shared',
        Folder: 'Post Media',
        ArtifactVersionID: null,
      },
      {
        ID: SI_MISMATCHED_VER_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: '88888888-8888-4888-8888-999999999999',
      },
    ];
    const entities = [
      { ID: ENTITY_ARTIFACTS_ID, Name: 'MJ: Artifacts' },
      { ID: ENTITY_FILES_ID, Name: 'MJ: Files' },
    ];
    const mjArtifacts = [{ ID: ARTIFACT_ID }];
    const mjArtifactVersions = [
      { ID: ARTIFACT_VERSION_ID, ArtifactID: ARTIFACT_ID, FileID: null, ContentMode: 'File' },
    ];
    const mjFiles = [{ ID: FILE_ID }];

    mock.method(
      RunView.prototype,
      'RunView',
      async <T>(params: RunViewParams): Promise<RunViewResult<T>> => {
        const filter = params.ExtraFilter ?? '';
        const idEq = extractFilterValue(filter, 'ID');
        const spaceEq = extractFilterValue(filter, 'SpaceID');
        const userEq = extractFilterValue(filter, 'UserID');
        const forumEq = extractFilterValue(filter, 'ForumID');
        const postEq = extractFilterValue(filter, 'PostID');

        let rows: object[] = [];
        switch (params.EntityName) {
          case COMMUNITY_ENTITY_NAMES.ForumPosts:
            rows = posts.filter((p) => !idEq || UUIDsEqual(p.ID, idEq));
            break;
          case COMMUNITY_ENTITY_NAMES.Forums:
            rows = forums.filter((f) => !idEq || UUIDsEqual(f.ID, idEq));
            break;
          case 'MJ_BizApps_Collaboration: Spaces':
            rows = spaces.filter((s) => !idEq || UUIDsEqual(s.ID, idEq));
            break;
          case 'MJ_BizApps_Collaboration: Space Members':
            rows = spaceMembers.filter(
              (m) =>
                (!spaceEq || UUIDsEqual(m.SpaceID, spaceEq)) &&
                (!userEq || UUIDsEqual(m.UserID, userEq)),
            );
            break;
          case COMMUNITY_ENTITY_NAMES.ForumMembers:
            rows = forumMembers.filter(
              (m) =>
                (!forumEq || UUIDsEqual(m.ForumID, forumEq)) &&
                (!userEq || UUIDsEqual(m.UserID, userEq)),
            );
            break;
          case COMMUNITY_ENTITY_NAMES.ForumRoleTypes:
            rows = roleTypes.filter((r) => !idEq || UUIDsEqual(r.ID, idEq));
            break;
          case 'MJ_BizApps_Collaboration: Space Items':
            rows = spaceItems.filter((si) => !idEq || UUIDsEqual(si.ID, idEq));
            break;
          case 'MJ: Entities':
            rows = entities.filter((e) => !idEq || UUIDsEqual(e.ID, idEq));
            break;
          case 'MJ: Artifacts':
            rows = mjArtifacts.filter((a) => !idEq || UUIDsEqual(a.ID, idEq));
            break;
          case 'MJ: Artifact Versions':
            rows = mjArtifactVersions.filter((v) => !idEq || UUIDsEqual(v.ID, idEq));
            break;
          case 'MJ: Files':
            rows = mjFiles.filter((f) => !idEq || UUIDsEqual(f.ID, idEq));
            break;
          case COMMUNITY_ENTITY_NAMES.ForumPostAttachments:
            rows = existingAttachments.filter((a) => !postEq || UUIDsEqual(a.PostID, postEq));
            break;
          default:
            rows = [];
        }
        return {
          Success: true,
          Results: rows as T[],
          UserView: null,
          TotalRowCount: rows.length,
          ExecutionTime: 0,
          ErrorMessage: '',
        };
      },
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  function createEntity(user: UserInfo, postId: string, spaceItemId: string): ForumPostAttachmentServerEntity {
    const entity = new ForumPostAttachmentServerEntity(entityInfo);
    entity.ContextCurrentUser = user;
    entity.PostID = postId;
    entity.SpaceItemID = spaceItemId;
    entity.Sequence = 1;
    return entity;
  }

  it('registers ForumPostAttachmentServerEntity in MJGlobal ClassFactory', () => {
    const reg = MJGlobal.Instance.ClassFactory.GetRegistration(
      BaseEntity,
      COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
    );
    assert.equal(reg?.SubClass, ForumPostAttachmentServerEntity);
  });

  it('allows post author and forum moderator on valid same-space, matching-band attachments', async () => {
    const authorRes = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(authorRes.Success, true);

    const modRes = await createEntity(makeUser(MOD_USER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(modRes.Success, true);

    const teamRes = await createEntity(makeUser(TEAM_USER_ID), TEAM_POST_ID, SI_VALID_TEAM_ART_ID).ValidateAsync();
    assert.equal(teamRes.Success, true);
  });

  it('rejects non-author non-moderator, outsider, and locked post writes', async () => {
    const outsiderRes = await createEntity(makeUser(OUTSIDER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(outsiderRes.Success, false);
    assert.match(outsiderRes.Errors[0]?.Message ?? '', /not authorized/i);

    const nonAuthorRes = await createEntity(makeUser(TEAM_USER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(nonAuthorRes.Success, false);
    assert.match(nonAuthorRes.Errors[0]?.Message ?? '', /Only the post author or a forum moderator/i);

    const lockedAuthorRes = await createEntity(makeUser(SHARED_USER_ID), LOCKED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(lockedAuthorRes.Success, false);
    assert.match(lockedAuthorRes.Errors[0]?.Message ?? '', /locked/i);

    const lockedModRes = await createEntity(makeUser(MOD_USER_ID), LOCKED_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(lockedModRes.Success, true);
  });

  it('rejects cross-space SpaceItem, band mismatches, fake ForumPost.ID file RecordID, and missing ArtifactVersionID', async () => {
    const crossSpace = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_OTHER_SPACE_ID).ValidateAsync();
    assert.equal(crossSpace.Success, false);
    assert.match(crossSpace.Errors[0]?.Message ?? '', /different Space/i);

    const teamPostWithSharedSi = await createEntity(makeUser(TEAM_USER_ID), TEAM_POST_ID, SI_VALID_SHARED_ART_ID).ValidateAsync();
    assert.equal(teamPostWithSharedSi.Success, false);
    assert.match(teamPostWithSharedSi.Errors[0]?.Message ?? '', /Team-band post/i);

    const sharedPostWithTeamSi = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VALID_TEAM_ART_ID).ValidateAsync();
    assert.equal(sharedPostWithTeamSi.Success, false);
    assert.match(sharedPostWithTeamSi.Errors[0]?.Message ?? '', /Team-band SpaceItem/i);

    const fakeFileTarget = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_FAKE_POST_FILE_ID).ValidateAsync();
    assert.equal(fakeFileTarget.Success, false);
    assert.match(fakeFileTarget.Errors[0]?.Message ?? '', /fake MJ: Files target/i);

    const badVer = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_MISMATCHED_VER_ID).ValidateAsync();
    assert.equal(badVer.Success, false);
    assert.match(badVer.Errors[0]?.Message ?? '', /Artifact Version/i);
  });
});
