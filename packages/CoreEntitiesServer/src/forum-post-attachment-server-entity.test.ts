import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  BaseEntity,
  CompositeKey,
  EntityInfo,
  RunView,
  UserInfo,
  type EntityDeleteOptions,
  type EntitySaveOptions,
  type IEntityDataProvider,
  type IRunViewProvider,
  type RecordChange,
  type RunViewParams,
  type RunViewResult,
} from '@memberjunction/core';
import { MJGlobal, UUIDsEqual } from '@memberjunction/global';
import { COMMUNITY_ATTACHMENT_MAX_FILE_BYTES } from '@mj-biz-apps/community-core';
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
const FILE_2_ID = '88888888-8888-4888-8888-888888888804';
const FILE_MISSING_META_ID = '88888888-8888-4888-8888-888888888805';

const VER_BOUND_FILE_ID = '88888888-8888-4888-8888-888888888811';
const VER_NULL_FILE_ID = '88888888-8888-4888-8888-888888888812';
const VER_BAD_MIME_ID = '88888888-8888-4888-8888-888888888813';
const VER_MISSING_SIZE_ID = '88888888-8888-4888-8888-888888888814';
const VER_BLOB_URL_ID = '88888888-8888-4888-8888-888888888815';
const VER_9MIB_ID = '88888888-8888-4888-8888-888888888816';

const SI_VALID_SHARED_ART_ID = '99999999-9999-4999-8999-999999999901';
const SI_VALID_TEAM_ART_ID = '99999999-9999-4999-8999-999999999902';
const SI_OTHER_SPACE_ID = '99999999-9999-4999-8999-999999999903';
const SI_FAKE_POST_FILE_ID = '99999999-9999-4999-8999-999999999904';
const SI_MISMATCHED_VER_ID = '99999999-9999-4999-8999-999999999905';
const SI_FILE_VALID_BOUND_ID = '99999999-9999-4999-8999-999999999906';
const SI_FILE_NULL_FILEID_VER_ID = '99999999-9999-4999-8999-999999999907';
const SI_FILE_MISMATCHED_FILEID_VER_ID = '99999999-9999-4999-8999-999999999908';
const SI_FILE_ONLY_MISSING_META_ID = '99999999-9999-4999-8999-999999999909';
const SI_VER_BAD_MIME_ID = '99999999-9999-4999-8999-999999999910';
const SI_VER_MISSING_SIZE_ID = '99999999-9999-4999-8999-999999999911';
const SI_VER_BLOB_URL_ID = '99999999-9999-4999-8999-999999999912';
const SI_VER_9MIB_ID = '99999999-9999-4999-8999-999999999913';

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

function extractInValues(filter: string, col: string): string[] | null {
  const m = new RegExp(`(?:^|\\s|AND\\s)${col}\\s+IN\\s*\\(([^)]*)\\)`, 'i').exec(filter);
  if (!m) return null;
  const out: string[] = [];
  const itemRe = /'([^']*)'/g;
  let item = itemRe.exec(m[1]);
  while (item) {
    out.push(item[1]);
    item = itemRe.exec(m[1]);
  }
  return out;
}

interface MockSavedAttachmentRow {
  ID: string;
  PostID: string;
  SpaceItemID: string;
  Caption: string | null;
  Sequence: number;
}

class MockAttachmentProvider implements IEntityDataProvider, IRunViewProvider {
  public saveCallCount = 0;
  public savedRows: MockSavedAttachmentRow[];
  private seq = 1;
  private readonly runViewHandler: <T>(params: RunViewParams) => Promise<RunViewResult<T>>;

  constructor(
    savedRows: MockSavedAttachmentRow[],
    runViewHandler: <T>(params: RunViewParams) => Promise<RunViewResult<T>>,
  ) {
    this.savedRows = savedRows;
    this.runViewHandler = runViewHandler;
  }

  public get SupportsEntityTransactions(): boolean {
    return false;
  }

  public async Config(): Promise<boolean> {
    return true;
  }

  public async GetRecordChanges(): Promise<RecordChange[]> {
    return [];
  }

  public async Load(): Promise<Record<string, string | number | boolean | Date | null>> {
    return {};
  }

  public async Save(
    entity: BaseEntity,
    _user: UserInfo,
    _options: EntitySaveOptions,
  ): Promise<Record<string, string | number | boolean | Date | null>> {
    this.saveCallCount += 1;
    const attachment = entity as ForumPostAttachmentServerEntity;
    const id = attachment.ID || `60000000-0000-4000-8000-${String(this.seq++).padStart(12, '0')}`;
    const record: MockSavedAttachmentRow = {
      ID: id,
      PostID: attachment.PostID,
      SpaceItemID: attachment.SpaceItemID,
      Caption: attachment.Caption ?? null,
      Sequence: attachment.Sequence ?? 1,
    };
    this.savedRows.push(record);
    return { ...record };
  }

  public async Delete(
    _entity: BaseEntity,
    _options: EntityDeleteOptions,
    _user: UserInfo,
  ): Promise<boolean> {
    return true;
  }

  public async RunView<T>(params: RunViewParams): Promise<RunViewResult<T>> {
    return this.runViewHandler<T>(params);
  }

  public async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
    return Promise.all(params.map((p) => this.RunView<T>(p)));
  }
}

describe('CR-2 & CR-4: ForumPostAttachmentServerEntity server-side validation guard', () => {
  const entityInfo = buildAttachmentEntityInfo();
  let existingAttachments: MockSavedAttachmentRow[];
  let provider: MockAttachmentProvider;

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
      {
        ID: SI_FILE_VALID_BOUND_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_ID}`,
        Band: 'Shared',
        Folder: 'Post Media',
        ArtifactVersionID: VER_BOUND_FILE_ID,
      },
      {
        ID: SI_FILE_NULL_FILEID_VER_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_ID}`,
        Band: 'Shared',
        Folder: 'Post Media',
        ArtifactVersionID: VER_NULL_FILE_ID,
      },
      {
        ID: SI_FILE_MISMATCHED_FILEID_VER_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_2_ID}`,
        Band: 'Shared',
        Folder: 'Post Media',
        ArtifactVersionID: VER_BOUND_FILE_ID,
      },
      {
        ID: SI_FILE_ONLY_MISSING_META_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_MISSING_META_ID}`,
        Band: 'Shared',
        Folder: 'Post Media',
        ArtifactVersionID: null,
      },
      {
        ID: SI_VER_BAD_MIME_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: VER_BAD_MIME_ID,
      },
      {
        ID: SI_VER_MISSING_SIZE_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: VER_MISSING_SIZE_ID,
      },
      {
        ID: SI_VER_BLOB_URL_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: VER_BLOB_URL_ID,
      },
      {
        ID: SI_VER_9MIB_ID,
        SpaceID: SPACE_1_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        Folder: 'Library',
        ArtifactVersionID: VER_9MIB_ID,
      },
    ];
    const entities = [
      { ID: ENTITY_ARTIFACTS_ID, Name: 'MJ: Artifacts' },
      { ID: ENTITY_FILES_ID, Name: 'MJ: Files' },
    ];
    const mjArtifacts = [{ ID: ARTIFACT_ID }];
    const mjArtifactVersions = [
      {
        ID: ARTIFACT_VERSION_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'image/png',
        ContentSizeBytes: 4096,
        Content: 'https://cdn.example.com/artifact-diagram.png',
        FileName: 'artifact-diagram.png',
        VersionNumber: 1,
      },
      {
        ID: VER_BOUND_FILE_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: FILE_ID,
        ContentMode: 'File',
        MimeType: 'image/png',
        ContentSizeBytes: 8192,
        Content: 'https://cdn.example.com/bound.png',
        FileName: 'bound.png',
        VersionNumber: 2,
      },
      {
        ID: VER_NULL_FILE_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'image/png',
        ContentSizeBytes: 8192,
        Content: 'https://cdn.example.com/unbound.png',
        FileName: 'unbound.png',
        VersionNumber: 3,
      },
      {
        ID: VER_BAD_MIME_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'text/html',
        ContentSizeBytes: 512,
        Content: 'https://cdn.example.com/evil.html',
        FileName: 'evil.html',
        VersionNumber: 4,
      },
      {
        ID: VER_MISSING_SIZE_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'image/png',
        ContentSizeBytes: null,
        Content: 'https://cdn.example.com/nosize.png',
        FileName: 'nosize.png',
        VersionNumber: 5,
      },
      {
        ID: VER_BLOB_URL_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'image/png',
        ContentSizeBytes: 2048,
        Content: 'blob:https://community.example.com/1111',
        FileName: 'temp.png',
        VersionNumber: 6,
      },
      {
        ID: VER_9MIB_ID,
        ArtifactID: ARTIFACT_ID,
        FileID: null,
        ContentMode: 'File',
        MimeType: 'application/pdf',
        ContentSizeBytes: 9 * 1024 * 1024,
        Content: 'https://cdn.example.com/large-pack.pdf',
        FileName: 'large-pack.pdf',
        VersionNumber: 7,
      },
    ];
    const mjFiles = [
      {
        ID: FILE_ID,
        Name: 'bound.png',
        ContentType: 'image/png',
        Size: 8192,
        DownloadURL: 'https://cdn.example.com/bound.png',
        Status: 'Uploaded',
      },
      {
        ID: FILE_2_ID,
        Name: 'other.png',
        ContentType: 'image/png',
        Size: 4096,
        DownloadURL: 'https://cdn.example.com/other.png',
        Status: 'Uploaded',
      },
      {
        ID: FILE_MISSING_META_ID,
        Name: 'incomplete.png',
        ContentType: null,
        Size: null,
        DownloadURL: null,
        Status: 'Uploaded',
      },
    ];

    const runViewHandler = async <T>(params: RunViewParams): Promise<RunViewResult<T>> => {
      const filter = params.ExtraFilter ?? '';
      const idEq = extractFilterValue(filter, 'ID');
      const idIn = extractInValues(filter, 'ID');
      const artEq = extractFilterValue(filter, 'ArtifactID');
      const spaceEq = extractFilterValue(filter, 'SpaceID');
      const userEq = extractFilterValue(filter, 'UserID');
      const forumEq = extractFilterValue(filter, 'ForumID');
      const postEq = extractFilterValue(filter, 'PostID');

      const matchId = (rowId: string): boolean => {
        if (idIn) return idIn.some((id) => UUIDsEqual(rowId, id));
        if (idEq) return UUIDsEqual(rowId, idEq);
        return true;
      };

      let rows: object[] = [];
      switch (params.EntityName) {
        case COMMUNITY_ENTITY_NAMES.ForumPosts:
          rows = posts.filter((p) => matchId(p.ID));
          break;
        case COMMUNITY_ENTITY_NAMES.Forums:
          rows = forums.filter((f) => matchId(f.ID));
          break;
        case 'MJ_BizApps_Collaboration: Spaces':
          rows = spaces.filter((s) => matchId(s.ID));
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
          rows = roleTypes.filter((r) => matchId(r.ID));
          break;
        case 'MJ_BizApps_Collaboration: Space Items':
          rows = spaceItems.filter((si) => matchId(si.ID));
          break;
        case 'MJ: Entities':
          rows = entities.filter((e) => matchId(e.ID));
          break;
        case 'MJ: Artifacts':
          rows = mjArtifacts.filter((a) => matchId(a.ID));
          break;
        case 'MJ: Artifact Versions':
          rows = mjArtifactVersions.filter(
            (v) => matchId(v.ID) && (!artEq || UUIDsEqual(v.ArtifactID, artEq)),
          );
          break;
        case 'MJ: Files':
          rows = mjFiles.filter((f) => matchId(f.ID));
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
    };

    provider = new MockAttachmentProvider(existingAttachments, runViewHandler);
    mock.method(RunView.prototype, 'RunView', runViewHandler);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  function createEntity(user: UserInfo, postId: string, spaceItemId: string): ForumPostAttachmentServerEntity {
    const entity = new ForumPostAttachmentServerEntity(entityInfo, provider);
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

  it('allows post author and forum moderator via Save() on valid same-space, matching-band attachments', async () => {
    const authorSaved = await createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID).Save();
    assert.equal(authorSaved, true);

    const modSaved = await createEntity(makeUser(MOD_USER_ID), SHARED_POST_ID, SI_FILE_VALID_BOUND_ID).Save();
    assert.equal(modSaved, true);

    const teamSaved = await createEntity(makeUser(TEAM_USER_ID), TEAM_POST_ID, SI_VALID_TEAM_ART_ID).Save();
    assert.equal(teamSaved, true);
    assert.equal(provider.saveCallCount, 3);
  });

  it('rejects non-author non-moderator, outsider, and locked post writes through Save() with 0 provider writes', async () => {
    const outsiderEntity = createEntity(makeUser(OUTSIDER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID);
    assert.equal(await outsiderEntity.Save(), false);
    assert.match(outsiderEntity.LatestResult?.Message ?? '', /not authorized/i);

    const nonAuthorEntity = createEntity(makeUser(TEAM_USER_ID), SHARED_POST_ID, SI_VALID_SHARED_ART_ID);
    assert.equal(await nonAuthorEntity.Save(), false);
    assert.match(nonAuthorEntity.LatestResult?.Message ?? '', /Only the post author or a forum moderator/i);

    const lockedAuthorEntity = createEntity(makeUser(SHARED_USER_ID), LOCKED_POST_ID, SI_VALID_SHARED_ART_ID);
    assert.equal(await lockedAuthorEntity.Save(), false);
    assert.match(lockedAuthorEntity.LatestResult?.Message ?? '', /locked/i);
    assert.equal(provider.saveCallCount, 0);

    const lockedModSaved = await createEntity(makeUser(MOD_USER_ID), LOCKED_POST_ID, SI_VALID_SHARED_ART_ID).Save();
    assert.equal(lockedModSaved, true);
    assert.equal(provider.saveCallCount, 1);
  });

  it('rejects cross-space SpaceItem, band mismatches, fake ForumPost.ID file RecordID, and missing ArtifactVersionID through Save()', async () => {
    const crossSpace = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_OTHER_SPACE_ID);
    assert.equal(await crossSpace.Save(), false);
    assert.match(crossSpace.LatestResult?.Message ?? '', /different Space/i);

    const teamPostWithSharedSi = createEntity(makeUser(TEAM_USER_ID), TEAM_POST_ID, SI_VALID_SHARED_ART_ID);
    assert.equal(await teamPostWithSharedSi.Save(), false);
    assert.match(teamPostWithSharedSi.LatestResult?.Message ?? '', /Team-band post/i);

    const sharedPostWithTeamSi = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VALID_TEAM_ART_ID);
    assert.equal(await sharedPostWithTeamSi.Save(), false);
    assert.match(sharedPostWithTeamSi.LatestResult?.Message ?? '', /Team-band SpaceItem/i);

    const fakeFileTarget = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_FAKE_POST_FILE_ID);
    assert.equal(await fakeFileTarget.Save(), false);
    assert.match(fakeFileTarget.LatestResult?.Message ?? '', /fake MJ: Files target/i);

    const badVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_MISMATCHED_VER_ID);
    assert.equal(await badVer.Save(), false);
    assert.match(badVer.LatestResult?.Message ?? '', /Artifact Version/i);
    assert.equal(provider.saveCallCount, 0);
  });

  it('CR-4 & CR-6: rejects null/mismatched FileID on MJ: Files, missing/unsafe version metadata, blob: URLs, and aggregate byte-limit violations via Save()', async () => {
    const nullFileIdVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_FILE_NULL_FILEID_VER_ID);
    assert.equal(await nullFileIdVer.Save(), false);
    assert.match(nullFileIdVer.LatestResult?.Message ?? '', /null or invalid FileID/i);

    const mismatchedFileIdVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_FILE_MISMATCHED_FILEID_VER_ID);
    assert.equal(await mismatchedFileIdVer.Save(), false);
    assert.match(mismatchedFileIdVer.LatestResult?.Message ?? '', /belongs to File/i);

    const missingFileMeta = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_FILE_ONLY_MISSING_META_ID);
    assert.equal(await missingFileMeta.Save(), false);
    assert.match(missingFileMeta.LatestResult?.Message ?? '', /not permitted|missing/i);

    const badMimeVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VER_BAD_MIME_ID);
    assert.equal(await badMimeVer.Save(), false);
    assert.match(badMimeVer.LatestResult?.Message ?? '', /not permitted/i);

    const missingSizeVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VER_MISSING_SIZE_ID);
    assert.equal(await missingSizeVer.Save(), false);
    assert.match(missingSizeVer.LatestResult?.Message ?? '', /ContentSizeBytes/i);

    const blobUrlVer = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VER_BLOB_URL_ID);
    assert.equal(await blobUrlVer.Save(), false);
    assert.match(blobUrlVer.LatestResult?.Message ?? '', /blob:/i);

    assert.equal(provider.saveCallCount, 0);

    // Aggregate byte ceiling: 5 x 9 MiB = 45 MiB succeeds, 6th x 9 MiB = 54 MiB (> 50 MiB) fails in Save()
    assert.ok(COMMUNITY_ATTACHMENT_MAX_FILE_BYTES >= 9 * 1024 * 1024);
    for (let i = 0; i < 5; i += 1) {
      const ok9Mib = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VER_9MIB_ID);
      ok9Mib.Sequence = i + 1;
      assert.equal(await ok9Mib.Save(), true);
    }
    assert.equal(provider.saveCallCount, 5);

    const sixth9Mib = createEntity(makeUser(SHARED_USER_ID), SHARED_POST_ID, SI_VER_9MIB_ID);
    sixth9Mib.Sequence = 6;
    assert.equal(await sixth9Mib.Save(), false);
    assert.match(sixth9Mib.LatestResult?.Message ?? '', /aggregate limit/i);
    assert.equal(provider.saveCallCount, 5);
  });
});
