import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { type CompositeKey, Metadata, RunView, UserInfo } from '@memberjunction/core';
import { COMMUNITY_ENTITY_NAMES } from '@mj-biz-apps/community-entities';
import {
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
} from '@mj-biz-apps/community-core';

const prevDbDatabase = process.env.DB_DATABASE;
const prevDbUsername = process.env.DB_USERNAME;
const prevDbPassword = process.env.DB_PASSWORD;
if (!process.env.DB_DATABASE) process.env.DB_DATABASE = 'mj_ci_unit_test';
if (!process.env.DB_USERNAME) process.env.DB_USERNAME = 'mj_ci_unit_test';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'mj_ci_unit_test_placeholder';

const { CommunityAttachmentServerService } = await (async () => {
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

const SPACE_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_SPACE_ID = '11111111-1111-4111-8111-999999999999';
const OWNER_USER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const SHARED_USER_ID = 'aaaaaaaa-0000-4000-8000-000000000002';
const TEAM_USER_ID = 'aaaaaaaa-0000-4000-8000-000000000003';
const OUTSIDER_USER_ID = 'aaaaaaaa-0000-4000-8000-000000000004';
const SHARED_FORUM_ID = 'bbbbbbbb-1111-4111-8111-111111111111';
const TEAM_FORUM_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const PRIVATE_FORUM_ID = 'bbbbbbbb-3333-4333-8333-333333333333';
const MEMBER_ROLE_ID = 'cccccccc-1111-4111-8111-111111111111';
const MOD_ROLE_ID = 'cccccccc-2222-4222-8222-222222222222';

const SHARED_POST_ID = 'dddddddd-1111-4111-8111-111111111111';
const SHARED_REPLY_ID = 'dddddddd-2222-4222-8222-222222222222';
const TEAM_POST_ID = 'dddddddd-3333-4333-8333-333333333333';
const PRIVATE_POST_ID = 'dddddddd-4444-4444-8444-444444444444';
const DRAFT_POST_ID = 'dddddddd-5555-4555-8555-555555555555';
const LOCKED_POST_ID = 'dddddddd-6666-4666-8666-666666666666';

const ARTIFACT_ID = 'eeeeeeee-1111-4111-8111-111111111111';
const ARTIFACT_VERSION_ID = 'eeeeeeee-2222-4222-8222-222222222222';
const PRIVATE_ARTIFACT_ID = 'eeeeeeee-3333-4333-8333-333333333333';
const FILE_ID_1 = 'ffffffff-1111-4111-8111-111111111111';
const FILE_ID_2 = 'ffffffff-2222-4222-8222-222222222222';
const FILE_ID_3 = 'ffffffff-3333-4333-8333-333333333333';
const FILE_ID_4 = 'ffffffff-4444-4444-8444-444444444444';
const ENTITY_ARTIFACTS_ID = '99999999-1111-4111-8111-111111111111';
const ENTITY_FILES_ID = '99999999-2222-4222-8222-222222222222';

function makeUser(id: string, name: string): UserInfo {
  const user = new UserInfo();
  user.ID = id;
  user.Name = name;
  user.Email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
  return user;
}

interface StoredSpaceItem {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  PromotedAt: Date | null;
  PromotedByUserID: string | null;
  Folder: string | null;
  ArtifactVersionID: string | null;
  IsSaved: boolean;
  deleted: boolean;
  __mj_CreatedAt: Date;
}

interface StoredAttachment {
  ID: string;
  PostID: string;
  SpaceItemID: string;
  Caption: string | null;
  Sequence: number;
  IsSaved: boolean;
  deleted: boolean;
  __mj_CreatedAt: Date;
}

interface StoredArtifactPost {
  ID: string;
  ArtifactID: string;
  PinnedArtifactVersionID: string | null;
  SpaceItemID: string;
  ArtifactModality: 'Document' | 'Presentation' | 'Spreadsheet';
  CollaborationMode: 'Comment Only' | 'Edit' | 'Suggest';
  ShowInlinePreview: boolean;
  IsSaved: boolean;
  deleted: boolean;
}

interface MockWorldOptions {
  failSpaceItemSave?: boolean;
  failAttachmentSave?: boolean;
  failArtifactQuery?: boolean;
  failRunViewForEntity?: string;
}

function buildMockWorld(options: MockWorldOptions = {}) {
  let seqCounter = 10;
  const nextUuid = (prefix: string): string => {
    seqCounter += 1;
    const suffix = String(seqCounter).padStart(12, '0');
    return `${prefix}-0000-4000-8000-${suffix}`;
  };

  const spaceItems: StoredSpaceItem[] = [];
  const attachments: StoredAttachment[] = [];
  const artifactPosts: StoredArtifactPost[] = [];

  const posts = [
    {
      ID: SHARED_POST_ID,
      ForumID: SHARED_FORUM_ID,
      ParentPostID: null as string | null,
      AuthorUserID: SHARED_USER_ID,
      AuthorUser: 'Shared Member',
      Title: 'Q4 Member Playbook & Benchmarks',
      VisibilityBand: 'Shared' as const,
      Status: 'Published' as const,
      IsLocked: false,
      __mj_CreatedAt: new Date('2026-11-20T10:00:00Z'),
    },
    {
      ID: SHARED_REPLY_ID,
      ForumID: SHARED_FORUM_ID,
      ParentPostID: SHARED_POST_ID,
      AuthorUserID: SHARED_USER_ID,
      AuthorUser: 'Shared Member',
      Title: null,
      VisibilityBand: 'Shared' as const,
      Status: 'Published' as const,
      IsLocked: false,
      __mj_CreatedAt: new Date('2026-11-20T11:00:00Z'),
    },
    {
      ID: TEAM_POST_ID,
      ForumID: TEAM_FORUM_ID,
      ParentPostID: null as string | null,
      AuthorUserID: TEAM_USER_ID,
      AuthorUser: 'Team Staff',
      Title: 'Internal Roadmap Deck',
      VisibilityBand: 'Team' as const,
      Status: 'Published' as const,
      IsLocked: false,
      __mj_CreatedAt: new Date('2026-11-20T12:00:00Z'),
    },
    {
      ID: PRIVATE_POST_ID,
      ForumID: PRIVATE_FORUM_ID,
      ParentPostID: null as string | null,
      AuthorUserID: TEAM_USER_ID,
      AuthorUser: 'Team Staff',
      Title: 'Board Private Packet',
      VisibilityBand: 'Shared' as const,
      Status: 'Published' as const,
      IsLocked: false,
      __mj_CreatedAt: new Date('2026-11-20T13:00:00Z'),
    },
    {
      ID: DRAFT_POST_ID,
      ForumID: SHARED_FORUM_ID,
      ParentPostID: null as string | null,
      AuthorUserID: SHARED_USER_ID,
      AuthorUser: 'Shared Member',
      Title: 'Unpublished Draft Thread',
      VisibilityBand: 'Shared' as const,
      Status: 'Draft' as const,
      IsLocked: false,
      __mj_CreatedAt: new Date('2026-11-20T14:00:00Z'),
    },
    {
      ID: LOCKED_POST_ID,
      ForumID: SHARED_FORUM_ID,
      ParentPostID: null as string | null,
      AuthorUserID: SHARED_USER_ID,
      AuthorUser: 'Shared Member',
      Title: 'Locked Announcement',
      VisibilityBand: 'Shared' as const,
      Status: 'Published' as const,
      IsLocked: true,
      __mj_CreatedAt: new Date('2026-11-20T15:00:00Z'),
    },
  ];

  const forums = [
    {
      ID: SHARED_FORUM_ID,
      SpaceID: SPACE_ID,
      Name: 'General Community',
      VisibilityBand: 'Shared' as const,
      InheritsSpaceMembers: true,
      PostingPolicy: 'Open' as const,
      Status: 'Active' as const,
    },
    {
      ID: TEAM_FORUM_ID,
      SpaceID: SPACE_ID,
      Name: 'Internal Staff',
      VisibilityBand: 'Team' as const,
      InheritsSpaceMembers: true,
      PostingPolicy: 'Open' as const,
      Status: 'Active' as const,
    },
    {
      ID: PRIVATE_FORUM_ID,
      SpaceID: SPACE_ID,
      Name: 'Executive Private Forum',
      VisibilityBand: 'PrivateForum' as const,
      InheritsSpaceMembers: false,
      PostingPolicy: 'Open' as const,
      Status: 'Active' as const,
    },
  ];

  const spaceMembers = [
    { ID: '10000000-0000-4000-8000-000000000001', SpaceID: SPACE_ID, UserID: SHARED_USER_ID, Band: 'Shared' as const, Status: 'Active' as const },
    { ID: '10000000-0000-4000-8000-000000000002', SpaceID: SPACE_ID, UserID: TEAM_USER_ID, Band: 'Team' as const, Status: 'Active' as const },
  ];

  const forumMembers = [
    { ID: '20000000-0000-4000-8000-000000000001', ForumID: SHARED_FORUM_ID, UserID: SHARED_USER_ID, ForumRoleTypeID: MEMBER_ROLE_ID, Status: 'Active' as const },
    { ID: '20000000-0000-4000-8000-000000000002', ForumID: PRIVATE_FORUM_ID, UserID: TEAM_USER_ID, ForumRoleTypeID: MOD_ROLE_ID, Status: 'Active' as const },
  ];

  const roleTypes = [
    { ID: MEMBER_ROLE_ID, CanConfigureForum: false, CanModerateQueue: false, CanCreateRootPost: true, CanReply: true },
    { ID: MOD_ROLE_ID, CanConfigureForum: true, CanModerateQueue: true, CanCreateRootPost: true, CanReply: true },
  ];

  const artifacts = [
    { ID: ARTIFACT_ID, Name: 'Benchmark Interactive Report', TypeID: 'type-html', Type: 'HTML' },
  ];
  const artifactVersions = [
    {
      ID: ARTIFACT_VERSION_ID,
      ArtifactID: ARTIFACT_ID,
      VersionNumber: 2,
      Name: 'Benchmark Interactive Report v2',
      ContentMode: 'Text',
      Content: '<html><body><h1>Benchmark</h1></body></html>',
      FileID: null,
      FileName: null,
      MimeType: 'text/html',
      ContentSizeBytes: 120,
    },
  ];
  const files = [
    { ID: FILE_ID_1, Name: 'architecture.png', ContentType: 'image/png' },
    { ID: FILE_ID_2, Name: 'walkthrough.mp4', ContentType: 'video/mp4' },
    { ID: FILE_ID_3, Name: 'podcast-note.mp3', ContentType: 'audio/mpeg' },
    { ID: FILE_ID_4, Name: 'handbook.pdf', ContentType: 'application/pdf' },
  ];

  mock.method(Metadata.prototype, 'EntityByName', (name: string) => {
    if (name === 'MJ: Artifacts') return { ID: ENTITY_ARTIFACTS_ID, Name: 'MJ: Artifacts' };
    if (name === 'MJ: Files') return { ID: ENTITY_FILES_ID, Name: 'MJ: Files' };
    return undefined;
  });

  mock.method(
    Metadata.prototype,
    'GetEntityObject',
    async (entityName: string, keyOrUser?: CompositeKey | UserInfo) => {
      const requestedId =
        keyOrUser && 'KeyValuePairs' in keyOrUser
          ? String(keyOrUser.KeyValuePairs[0]?.Value ?? '')
          : '';

      if (entityName === 'MJ_BizApps_Collaboration: Space Items') {
        if (requestedId) {
          const existing = spaceItems.find((si) => !si.deleted && si.ID.toLowerCase() === requestedId.toLowerCase());
          if (!existing) return null;
          return {
            get ID() { return existing.ID; },
            set ID(v: string) { existing.ID = v; },
            get SpaceID() { return existing.SpaceID; },
            set SpaceID(v: string) { existing.SpaceID = v; },
            get EntityID() { return existing.EntityID; },
            set EntityID(v: string) { existing.EntityID = v; },
            get RecordID() { return existing.RecordID; },
            set RecordID(v: string) { existing.RecordID = v; },
            get Band() { return existing.Band; },
            set Band(v: 'Shared' | 'Team') { existing.Band = v; },
            get PromotedAt() { return existing.PromotedAt; },
            set PromotedAt(v: Date | null) { existing.PromotedAt = v; },
            get PromotedByUserID() { return existing.PromotedByUserID; },
            set PromotedByUserID(v: string | null) { existing.PromotedByUserID = v; },
            get Folder() { return existing.Folder; },
            set Folder(v: string | null) { existing.Folder = v; },
            get ArtifactVersionID() { return existing.ArtifactVersionID; },
            set ArtifactVersionID(v: string | null) { existing.ArtifactVersionID = v; },
            get IsSaved() { return existing.IsSaved; },
            Save: async () => !options.failSpaceItemSave,
            Delete: async () => {
              existing.deleted = true;
              return true;
            },
          };
        }
        const record: StoredSpaceItem = {
          ID: nextUuid('50000001'),
          SpaceID: '',
          EntityID: '',
          RecordID: '',
          Band: 'Shared',
          PromotedAt: null,
          PromotedByUserID: null,
          Folder: null,
          ArtifactVersionID: null,
          IsSaved: false,
          deleted: false,
          __mj_CreatedAt: new Date(),
        };
        return {
          get ID() { return record.ID; },
          set ID(v: string) { record.ID = v; },
          get SpaceID() { return record.SpaceID; },
          set SpaceID(v: string) { record.SpaceID = v; },
          get EntityID() { return record.EntityID; },
          set EntityID(v: string) { record.EntityID = v; },
          get RecordID() { return record.RecordID; },
          set RecordID(v: string) { record.RecordID = v; },
          get Band() { return record.Band; },
          set Band(v: 'Shared' | 'Team') { record.Band = v; },
          get PromotedAt() { return record.PromotedAt; },
          set PromotedAt(v: Date | null) { record.PromotedAt = v; },
          get PromotedByUserID() { return record.PromotedByUserID; },
          set PromotedByUserID(v: string | null) { record.PromotedByUserID = v; },
          get Folder() { return record.Folder; },
          set Folder(v: string | null) { record.Folder = v; },
          get ArtifactVersionID() { return record.ArtifactVersionID; },
          set ArtifactVersionID(v: string | null) { record.ArtifactVersionID = v; },
          get IsSaved() { return record.IsSaved; },
          Save: async () => {
            if (options.failSpaceItemSave) return false;
            record.IsSaved = true;
            spaceItems.push(record);
            return true;
          },
          Delete: async () => {
            record.deleted = true;
            return true;
          },
        };
      }

      if (entityName === COMMUNITY_ENTITY_NAMES.ForumPostAttachments) {
        if (requestedId) {
          const existing = attachments.find((a) => !a.deleted && a.ID.toLowerCase() === requestedId.toLowerCase());
          if (!existing) return null;
          return {
            get ID() { return existing.ID; },
            set ID(v: string) { existing.ID = v; },
            get PostID() { return existing.PostID; },
            set PostID(v: string) { existing.PostID = v; },
            get SpaceItemID() { return existing.SpaceItemID; },
            set SpaceItemID(v: string) { existing.SpaceItemID = v; },
            get Caption() { return existing.Caption; },
            set Caption(v: string | null) { existing.Caption = v; },
            get Sequence() { return existing.Sequence; },
            set Sequence(v: number) { existing.Sequence = v; },
            get IsSaved() { return existing.IsSaved; },
            Save: async () => !options.failAttachmentSave,
            Delete: async () => {
              existing.deleted = true;
              return true;
            },
          };
        }
        const record: StoredAttachment = {
          ID: nextUuid('60000001'),
          PostID: '',
          SpaceItemID: '',
          Caption: null,
          Sequence: 0,
          IsSaved: false,
          deleted: false,
          __mj_CreatedAt: new Date(),
        };
        return {
          get ID() { return record.ID; },
          set ID(v: string) { record.ID = v; },
          get PostID() { return record.PostID; },
          set PostID(v: string) { record.PostID = v; },
          get SpaceItemID() { return record.SpaceItemID; },
          set SpaceItemID(v: string) { record.SpaceItemID = v; },
          get Caption() { return record.Caption; },
          set Caption(v: string | null) { record.Caption = v; },
          get Sequence() { return record.Sequence; },
          set Sequence(v: number) { record.Sequence = v; },
          get IsSaved() { return record.IsSaved; },
          Save: async () => {
            if (options.failAttachmentSave) return false;
            record.IsSaved = true;
            attachments.push(record);
            return true;
          },
          Delete: async () => {
            record.deleted = true;
            return true;
          },
        };
      }

      if (entityName === COMMUNITY_ENTITY_NAMES.ForumArtifactPosts) {
        const existing = requestedId
          ? artifactPosts.find((ap) => !ap.deleted && ap.ID.toLowerCase() === requestedId.toLowerCase())
          : null;
        if (requestedId && !existing) return null;
        const record: StoredArtifactPost = existing ?? {
          ID: '',
          ArtifactID: '',
          PinnedArtifactVersionID: null,
          SpaceItemID: '',
          ArtifactModality: 'Document',
          CollaborationMode: 'Suggest',
          ShowInlinePreview: true,
          IsSaved: false,
          deleted: false,
        };
        return {
          get ID() { return record.ID; },
          set ID(v: string) { record.ID = v; },
          get ArtifactID() { return record.ArtifactID; },
          set ArtifactID(v: string) { record.ArtifactID = v; },
          get PinnedArtifactVersionID() { return record.PinnedArtifactVersionID; },
          set PinnedArtifactVersionID(v: string | null) { record.PinnedArtifactVersionID = v; },
          get SpaceItemID() { return record.SpaceItemID; },
          set SpaceItemID(v: string) { record.SpaceItemID = v; },
          get ArtifactModality() { return record.ArtifactModality; },
          set ArtifactModality(v: 'Document' | 'Presentation' | 'Spreadsheet') { record.ArtifactModality = v; },
          get CollaborationMode() { return record.CollaborationMode; },
          set CollaborationMode(v: 'Comment Only' | 'Edit' | 'Suggest') { record.CollaborationMode = v; },
          get ShowInlinePreview() { return record.ShowInlinePreview; },
          set ShowInlinePreview(v: boolean) { record.ShowInlinePreview = v; },
          get IsSaved() { return record.IsSaved; },
          Save: async () => {
            record.IsSaved = true;
            if (!existing) artifactPosts.push(record);
            return true;
          },
          Delete: async () => {
            record.deleted = true;
            return true;
          },
        };
      }

      return null;
    },
  );

  mock.method(
    RunView.prototype,
    'RunView',
    async (query: { EntityName: string; ExtraFilter?: string }, contextUser?: UserInfo) => {
      const entity = query.EntityName;
      const filter = query.ExtraFilter ?? '';

      if (options.failRunViewForEntity && entity === options.failRunViewForEntity) {
        return { Success: false, ErrorMessage: `Simulated failure for ${entity}`, Results: [] };
      }

      if (entity === 'MJ_BizApps_Collaboration: Spaces') {
        const match = [
          { ID: SPACE_ID, OwnerID: OWNER_USER_ID, Name: 'Product Community' },
        ].filter((s) => filter.toLowerCase().includes(s.ID.toLowerCase()));
        return { Success: true, Results: match };
      }

      if (entity === 'MJ_BizApps_Collaboration: Space Members') {
        const uid = contextUser?.ID?.toLowerCase() ?? '';
        const match = spaceMembers.filter(
          (m) => filter.toLowerCase().includes(m.SpaceID.toLowerCase()) && m.UserID.toLowerCase() === uid,
        );
        return { Success: true, Results: match };
      }

      if (entity === 'MJ_BizApps_Collaboration: Space Items') {
        const active = spaceItems.filter((si) => !si.deleted);
        const filtered = active.filter((si) => {
          if (filter.includes("Folder = 'Library'") && si.Folder !== 'Library') return false;
          if (filter.includes("Folder = 'Post Media'") && si.Folder !== 'Post Media') return false;
          if (filter.includes("Band = 'Shared'") && si.Band !== 'Shared') return false;
          if (filter.includes('ID IN (')) {
            return filter.toLowerCase().includes(si.ID.toLowerCase());
          }
          return filter.toLowerCase().includes(si.SpaceID.toLowerCase());
        });
        return { Success: true, Results: filtered };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.Forums) {
        if (filter.trimStart().startsWith('ID =')) {
          return {
            Success: true,
            Results: forums.filter((f) => filter.toLowerCase().includes(f.ID.toLowerCase())),
          };
        }
        return {
          Success: true,
          Results: forums.filter((f) => filter.toLowerCase().includes(f.SpaceID.toLowerCase())),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumMembers) {
        const uid = contextUser?.ID?.toLowerCase() ?? '';
        return {
          Success: true,
          Results: forumMembers.filter(
            (m) => filter.toLowerCase().includes(m.ForumID.toLowerCase()) && m.UserID.toLowerCase() === uid,
          ),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumRoleTypes) {
        return {
          Success: true,
          Results: roleTypes.filter((r) => filter.toLowerCase().includes(r.ID.toLowerCase())),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumPosts) {
        return {
          Success: true,
          Results: posts.filter((p) => filter.toLowerCase().includes(p.ID.toLowerCase())),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumPostAttachments) {
        const active = attachments.filter((a) => !a.deleted);
        if (filter.includes('PostID =')) {
          return {
            Success: true,
            Results: active.filter((a) => filter.toLowerCase().includes(a.PostID.toLowerCase())),
          };
        }
        if (filter.includes('SpaceItemID IN')) {
          return {
            Success: true,
            Results: active.filter((a) => filter.toLowerCase().includes(a.SpaceItemID.toLowerCase())),
          };
        }
        return { Success: true, Results: active };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumArtifactPosts) {
        return {
          Success: true,
          Results: artifactPosts.filter((ap) => !ap.deleted && filter.toLowerCase().includes(ap.ID.toLowerCase())),
        };
      }

      if (entity === 'MJ: Artifacts') {
        if (options.failArtifactQuery) {
          return { Success: false, ErrorMessage: 'Access denied to MJ: Artifacts', Results: [] };
        }
        return {
          Success: true,
          Results: artifacts.filter((a) => filter.toLowerCase().includes(a.ID.toLowerCase())),
        };
      }

      if (entity === 'MJ: Artifact Versions') {
        return {
          Success: true,
          Results: artifactVersions.filter(
            (v) =>
              filter.toLowerCase().includes(v.ID.toLowerCase()) ||
              filter.toLowerCase().includes(v.ArtifactID.toLowerCase()),
          ),
        };
      }

      if (entity === 'MJ: Files') {
        return {
          Success: true,
          Results: files.filter((f) => filter.toLowerCase().includes(f.ID.toLowerCase())),
        };
      }

      return { Success: true, Results: [] };
    },
  );

  return { spaceItems, attachments, artifactPosts };
}

describe('@mj-biz-apps/community-server media/artifact attachments & SpaceItem library indexing', () => {
  it('persists embedded MJ Artifacts into Library folder and links ForumArtifactPost', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const user = makeUser(SHARED_USER_ID, 'Shared Member');
      const result = await svc.PersistPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: user,
        attachments: [
          {
            kind: 'artifact',
            artifactId: ARTIFACT_ID,
            artifactVersionId: ARTIFACT_VERSION_ID,
            caption: 'Interactive benchmark deck',
            linkAsForumArtifactPost: true,
            modality: 'Presentation',
            collaborationMode: 'Suggest',
          },
        ],
      });

      assert.equal(result.length, 1);
      const item = result[0];
      assert.equal(item.kind, 'artifact');
      assert.equal(item.featureInLibrary, true);
      assert.equal(item.folder, 'Library');
      if (item.kind === 'artifact') {
        assert.equal(item.artifactId, ARTIFACT_ID);
        assert.equal(item.artifactVersionId, ARTIFACT_VERSION_ID);
        assert.equal(item.artifactTypeName, 'HTML');
        assert.equal(item.versionNumber, 2);
      }

      assert.equal(world.spaceItems.length, 1);
      assert.equal(world.spaceItems[0].Folder, 'Library');
      assert.equal(world.spaceItems[0].RecordID, `ID|${ARTIFACT_ID}`);
      assert.equal(world.attachments.length, 1);
      assert.equal(world.artifactPosts.length, 1);
      assert.equal(world.artifactPosts[0].ArtifactModality, 'Presentation');
    } finally {
      mock.restoreAll();
    }
  });

  it('routes casual reply media to Post Media and supports user toggling Feature in Space Library', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const user = makeUser(SHARED_USER_ID, 'Shared Member');

      const persisted = await svc.PersistPostAttachments({
        postId: SHARED_REPLY_ID,
        entryType: 'reply',
        contextUser: user,
        attachments: [
          {
            kind: 'image',
            fileId: FILE_ID_1,
            fileName: 'architecture.png',
            mimeType: 'image/png',
            sizeBytes: 4096,
            url: 'https://cdn.example.com/architecture.png',
            caption: 'Whiteboard diagram',
          },
        ],
      });

      assert.equal(persisted.length, 1);
      assert.equal(persisted[0].featureInLibrary, false);
      assert.equal(persisted[0].folder, 'Post Media');
      assert.equal(world.spaceItems[0].Folder, 'Post Media');

      const updated = await svc.UpdateAttachmentLibraryState({
        postId: SHARED_REPLY_ID,
        attachmentId: persisted[0].forumPostAttachmentId ?? persisted[0].id,
        featureInLibrary: true,
        caption: 'Curated architecture diagram',
        contextUser: user,
      });

      assert.equal(updated.featureInLibrary, true);
      assert.equal(updated.folder, 'Library');
      assert.equal(updated.caption, 'Curated architecture diagram');
      assert.equal(world.spaceItems[0].Folder, 'Library');
    } finally {
      mock.restoreAll();
    }
  });

  it('fails closed on unauthorized users, outsiders, private artifacts, cross-space items, and locked posts', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const outsider = makeUser(OUTSIDER_USER_ID, 'Outsider');
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');
      const teamMember = makeUser(TEAM_USER_ID, 'Team Staff');

      // 1. Unauthenticated / missing user ID fails closed
      await assert.rejects(
        () =>
          svc.QuerySpaceMediaLibrary({
            spaceId: SPACE_ID,
            contextUser: new UserInfo(),
          }),
        /authenticated contextUser/,
      );

      // 2. Non-member of Space cannot query library or persist attachments
      await assert.rejects(
        () =>
          svc.QuerySpaceMediaLibrary({
            spaceId: SPACE_ID,
            contextUser: outsider,
          }),
        /not authorized/,
      );
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: outsider,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
              },
            ],
          }),
        /not authorized/,
      );

      // 3. Shared-band member cannot write to Team-band post or another author's post
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: TEAM_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
              },
            ],
          }),
        /not authorized/,
      );

      // 4. Another Space member who is neither author nor forum moderator cannot modify SHARED_POST_ID
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: teamMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
              },
            ],
          }),
        /Only the post author or a forum moderator/,
      );

      // 5. Locked post rejects non-moderator attachment writes
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: LOCKED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
              },
            ],
          }),
        /locked/,
      );

      // 6. Cross-space SpaceItem cannot be attached to a post in SPACE_ID
      world.spaceItems.push({
        ID: '50000001-0000-4000-8000-000000000999',
        SpaceID: OTHER_SPACE_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_ID_1}`,
        Band: 'Shared',
        PromotedAt: new Date(),
        PromotedByUserID: SHARED_USER_ID,
        Folder: 'Post Media',
        ArtifactVersionID: null,
        IsSaved: true,
        deleted: false,
        __mj_CreatedAt: new Date(),
      });
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
                existingSpaceItemId: '50000001-0000-4000-8000-000000000999',
              },
            ],
          }),
        /belongs to a different Space/,
      );

      // 7. Missing/unauthorized MJ Artifact fails closed before creating any SpaceItem
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'artifact',
                artifactId: PRIVATE_ARTIFACT_ID,
              },
            ],
          }),
        /was not found or caller lacks read access/,
      );
    } finally {
      mock.restoreAll();
    }
  });

  it('rolls back newly created SpaceItems when ForumPostAttachment persistence fails', async () => {
    const world = buildMockWorld({ failAttachmentSave: true });
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                url: 'https://cdn.example.com/architecture.png',
              },
            ],
          }),
        /Failed to persist ForumPostAttachment/,
      );

      assert.equal(world.spaceItems.length, 1);
      assert.equal(world.spaceItems[0].deleted, true);
      assert.equal(world.attachments.length, 0);
    } finally {
      mock.restoreAll();
    }
  });

  it('enforces MIME allowlist, unsafe URL rejection, per-file size, count, and aggregate byte limits on server', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'file',
                fileName: 'evil.html',
                mimeType: 'text/html',
                sizeBytes: 512,
                url: 'https://cdn.example.com/evil.html',
              },
            ],
          }),
        /not permitted by the Community attachment allowlist/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileName: 'xss.png',
                mimeType: 'image/png',
                sizeBytes: 512,
                url: 'javascript:alert(1)',
              },
            ],
          }),
        /unsafe or unsupported scheme/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'file',
                fileName: 'huge.pdf',
                mimeType: 'application/pdf',
                sizeBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES + 1,
                url: 'https://cdn.example.com/huge.pdf',
              },
            ],
          }),
        /exceeds the maximum allowed/,
      );

      const thirteenItems = Array.from({ length: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 1 }, (_, i) => ({
        kind: 'image' as const,
        fileName: `img-${i}.png`,
        mimeType: 'image/png',
        sizeBytes: 1024,
        url: `https://cdn.example.com/img-${i}.png`,
      }));
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: thirteenItems,
          }),
        /exceeds the maximum of 12 attachments/,
      );

      // 6 * 9 MiB = 54 MiB > 50 MiB aggregate limit
      const overAggregate = Array.from({ length: 6 }, (_, i) => ({
        kind: 'file' as const,
        fileName: `doc-${i}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 9 * 1024 * 1024,
        url: `https://cdn.example.com/doc-${i}.pdf`,
      }));
      assert.equal(COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST, 50 * 1024 * 1024);
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: overAggregate,
          }),
        /aggregate limit/,
      );

      assert.equal(world.spaceItems.length, 0);
    } finally {
      mock.restoreAll();
    }
  });

  it('scopes Space Media & Artifacts Library strictly to authorized forums/bands with bounded pagination', async () => {
    buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');
      const teamMember = makeUser(TEAM_USER_ID, 'Team Staff');

      // Seed attachments across Shared post, Shared reply, Draft post, Team post, and PrivateForum post
      await svc.PersistPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'artifact',
            artifactId: ARTIFACT_ID,
            artifactVersionId: ARTIFACT_VERSION_ID,
            caption: 'Shared Benchmark Artifact',
          },
          {
            kind: 'file',
            fileId: FILE_ID_4,
            fileName: 'handbook.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 8192,
            url: 'https://cdn.example.com/handbook.pdf',
            caption: 'Member Handbook',
            featureInLibrary: true,
          },
        ],
      });

      await svc.PersistPostAttachments({
        postId: SHARED_REPLY_ID,
        entryType: 'reply',
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'video',
            fileId: FILE_ID_2,
            fileName: 'walkthrough.mp4',
            mimeType: 'video/mp4',
            sizeBytes: 65536,
            url: 'https://cdn.example.com/walkthrough.mp4',
            caption: 'Walkthrough Clip',
          },
          {
            kind: 'audio',
            fileId: FILE_ID_3,
            fileName: 'podcast-note.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: 32768,
            url: 'https://cdn.example.com/podcast-note.mp3',
            caption: 'Voice Recap',
          },
        ],
      });

      // Draft post attachment (must NOT appear in Space Media Library)
      await svc.PersistPostAttachments({
        postId: DRAFT_POST_ID,
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'image',
            fileId: FILE_ID_1,
            fileName: 'draft-secret.png',
            mimeType: 'image/png',
            sizeBytes: 1024,
            url: 'https://cdn.example.com/draft-secret.png',
            caption: 'Unpublished Draft Image',
          },
        ],
      });

      // Team forum attachment & PrivateForum attachment (must NOT leak to sharedMember)
      await svc.PersistPostAttachments({
        postId: TEAM_POST_ID,
        contextUser: teamMember,
        attachments: [
          {
            kind: 'image',
            fileId: FILE_ID_1,
            fileName: 'internal-roadmap.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            url: 'https://cdn.example.com/internal-roadmap.png',
            caption: 'Internal Only Chart',
          },
        ],
      });

      await svc.PersistPostAttachments({
        postId: PRIVATE_POST_ID,
        contextUser: teamMember,
        attachments: [
          {
            kind: 'file',
            fileId: FILE_ID_4,
            fileName: 'board-packet.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 4096,
            url: 'https://cdn.example.com/board-packet.pdf',
            caption: 'Private Board Packet',
            featureInLibrary: true,
          },
        ],
      });

      // Shared member sees ONLY the 4 published Shared-forum items (never Draft, Team, or PrivateForum)
      const sharedViewAll = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'All',
      });
      assert.equal(sharedViewAll.totalCount, 4);
      assert.ok(sharedViewAll.items.every((i) => i.forumId === SHARED_FORUM_ID));
      assert.ok(!sharedViewAll.items.some((i) => i.caption?.includes('Draft')));
      assert.ok(!sharedViewAll.items.some((i) => i.caption?.includes('Internal Only')));
      assert.ok(!sharedViewAll.items.some((i) => i.caption?.includes('Private Board')));

      // Folder filter: Library only returns the 2 featured items
      const sharedLibraryOnly = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'Library',
      });
      assert.equal(sharedLibraryOnly.totalCount, 2);
      assert.ok(sharedLibraryOnly.items.every((i) => i.featureInLibrary === true));

      // Bounded pagination: page 1 of 2
      const page1 = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'All',
        maxRows: 2,
        startRow: 0,
      });
      assert.equal(page1.items.length, 2);
      assert.equal(page1.totalCount, 4);
      assert.equal(page1.hasMore, true);

      const page2 = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'All',
        maxRows: 2,
        startRow: 2,
      });
      assert.equal(page2.items.length, 2);
      assert.equal(page2.hasMore, false);

      // Shared member attempting to filter directly by PrivateForum or Team forum fails closed
      await assert.rejects(
        () =>
          svc.QuerySpaceMediaLibrary({
            spaceId: SPACE_ID,
            forumId: PRIVATE_FORUM_ID,
            contextUser: sharedMember,
          }),
        /not authorized/,
      );

      // Team member who holds active PrivateForum seat sees all 6 published items across Shared, Team, and PrivateForum
      const teamViewAll = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: teamMember,
        folder: 'All',
      });
      assert.equal(teamViewAll.totalCount, 6);
    } finally {
      mock.restoreAll();
    }
  });
});
