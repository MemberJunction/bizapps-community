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
const FILE_ID_5 = 'ffffffff-5555-4555-8555-555555555555';
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

interface StoredMJArtifact {
  ID: string;
  Name: string;
  Description: string | null;
  TypeID: string;
  Type?: string | null;
  UserID?: string;
  Visibility?: 'Always' | 'System Only';
  deleted?: boolean;
}

interface StoredMJArtifactVersion {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  UserID?: string;
  ContentMode: 'File' | 'Text';
  Content: string | null;
  FileID: string | null;
  FileName: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
  deleted?: boolean;
}

function projectRowFields<T extends object>(row: T, fields?: string[]): T {
  if (!fields || fields.length === 0) {
    return { ...row };
  }
  const allowed = new Set(fields);
  const entries = Object.entries(row).filter(([key]) => allowed.has(key));
  return Object.fromEntries(entries) as T;
}

interface MockWorldOptions {
  failSpaceItemSave?: boolean;
  failAttachmentSave?: boolean;
  failAttachmentSaveOnCall?: number;
  failSpaceItemDelete?: boolean;
  failSpaceItemRestoreSave?: boolean;
  failArtifactQuery?: boolean;
  failRunViewForEntity?: string;
}

function buildMockWorld(options: MockWorldOptions = {}) {
  let seqCounter = 10;
  let attachmentSaveAttempts = 0;
  let spaceItemSaveAttempts = 0;
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

  const artifactTypes = [
    { ID: 'type-image', Name: 'Image', ContentType: 'image/*', IsEnabled: true },
    { ID: 'type-audio', Name: 'Audio', ContentType: 'audio/*', IsEnabled: true },
    { ID: 'type-video', Name: 'Video', ContentType: 'video/*', IsEnabled: true },
    { ID: 'type-binary', Name: 'Generic Binary', ContentType: 'application/octet-stream', IsEnabled: true },
  ];
  const artifacts: StoredMJArtifact[] = [
    { ID: ARTIFACT_ID, Name: 'Benchmark Interactive Report', Description: null, TypeID: 'type-html', Type: 'HTML', Visibility: 'Always' },
  ];
  const artifactVersions: StoredMJArtifactVersion[] = [
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
  const files: Array<{
    ID: string;
    Name: string;
    ContentType: string | null;
    Size?: number | null;
    DownloadURL?: string | null;
    ProviderKey?: string | null;
    Status?: string | null;
  }> = [
    {
      ID: FILE_ID_1,
      Name: 'architecture.png',
      ContentType: 'image/png',
      Size: 4096,
      DownloadURL: 'https://cdn.example.com/architecture.png',
      Status: 'Uploaded',
    },
    {
      ID: FILE_ID_2,
      Name: 'walkthrough.mp4',
      ContentType: 'video/mp4',
      Size: 65536,
      DownloadURL: 'https://cdn.example.com/walkthrough.mp4',
      Status: 'Uploaded',
    },
    {
      ID: FILE_ID_3,
      Name: 'podcast-note.mp3',
      ContentType: 'audio/mpeg',
      Size: 32768,
      DownloadURL: 'https://cdn.example.com/podcast-note.mp3',
      Status: 'Uploaded',
    },
    {
      ID: FILE_ID_4,
      Name: 'handbook.pdf',
      ContentType: 'application/pdf',
      Size: 8192,
      DownloadURL: 'https://cdn.example.com/handbook.pdf',
      Status: 'Uploaded',
    },
    {
      ID: FILE_ID_5,
      Name: 'alternate-diagram.png',
      ContentType: 'image/png',
      Size: 2048,
      DownloadURL: 'https://cdn.example.com/alternate-diagram.png',
      Status: 'Uploaded',
    },
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

      if (entityName === 'MJ: Artifacts') {
        const record: StoredMJArtifact = {
          ID: nextUuid('80000001'),
          Name: '',
          Description: null,
          TypeID: '',
          UserID: '',
          Visibility: 'System Only',
          deleted: false,
        };
        return {
          get ID() { return record.ID; },
          set ID(v: string) { record.ID = v; },
          get Name() { return record.Name; },
          set Name(v: string) { record.Name = v; },
          get Description() { return record.Description; },
          set Description(v: string | null) { record.Description = v; },
          get TypeID() { return record.TypeID; },
          set TypeID(v: string) { record.TypeID = v; },
          get UserID() { return record.UserID ?? ''; },
          set UserID(v: string) { record.UserID = v; },
          get Visibility() { return record.Visibility ?? 'System Only'; },
          set Visibility(v: 'Always' | 'System Only') { record.Visibility = v; },
          Save: async () => {
            artifacts.push(record);
            return true;
          },
          Delete: async () => {
            if (options.failSpaceItemDelete) return false;
            record.deleted = true;
            return true;
          },
        };
      }

      if (entityName === 'MJ: Artifact Versions') {
        const record: StoredMJArtifactVersion = {
          ID: nextUuid('80000002'),
          ArtifactID: '',
          VersionNumber: 1,
          Name: null,
          UserID: '',
          ContentMode: 'File',
          Content: null,
          FileID: null,
          FileName: null,
          MimeType: null,
          ContentSizeBytes: null,
          deleted: false,
        };
        return {
          get ID() { return record.ID; },
          set ID(v: string) { record.ID = v; },
          get ArtifactID() { return record.ArtifactID; },
          set ArtifactID(v: string) { record.ArtifactID = v; },
          get VersionNumber() { return record.VersionNumber; },
          set VersionNumber(v: number) { record.VersionNumber = v; },
          get Name() { return record.Name; },
          set Name(v: string | null) { record.Name = v; },
          get UserID() { return record.UserID ?? ''; },
          set UserID(v: string) { record.UserID = v; },
          get ContentMode() { return record.ContentMode; },
          set ContentMode(v: 'File' | 'Text') { record.ContentMode = v; },
          get Content() { return record.Content; },
          set Content(v: string | null) { record.Content = v; },
          get FileID() { return record.FileID; },
          set FileID(v: string | null) { record.FileID = v; },
          get FileName() { return record.FileName; },
          set FileName(v: string | null) { record.FileName = v; },
          get MimeType() { return record.MimeType; },
          set MimeType(v: string | null) { record.MimeType = v; },
          get ContentSizeBytes() { return record.ContentSizeBytes; },
          set ContentSizeBytes(v: number | null) { record.ContentSizeBytes = v; },
          Save: async () => {
            artifactVersions.push(record);
            return true;
          },
          Delete: async () => {
            if (options.failSpaceItemDelete) return false;
            record.deleted = true;
            return true;
          },
        };
      }

      if (entityName === 'MJ_BizApps_Collaboration: Space Items') {
        if (requestedId) {
          const existing = spaceItems.find((si) => !si.deleted && si.ID.toLowerCase() === requestedId.toLowerCase());
          if (!existing) return null;
          let draft = { ...existing };
          return {
            get ID() { return draft.ID; },
            set ID(v: string) { draft.ID = v; },
            get SpaceID() { return draft.SpaceID; },
            set SpaceID(v: string) { draft.SpaceID = v; },
            get EntityID() { return draft.EntityID; },
            set EntityID(v: string) { draft.EntityID = v; },
            get RecordID() { return draft.RecordID; },
            set RecordID(v: string) { draft.RecordID = v; },
            get Band() { return draft.Band; },
            set Band(v: 'Shared' | 'Team') { draft.Band = v; },
            get PromotedAt() { return draft.PromotedAt; },
            set PromotedAt(v: Date | null) { draft.PromotedAt = v; },
            get PromotedByUserID() { return draft.PromotedByUserID; },
            set PromotedByUserID(v: string | null) { draft.PromotedByUserID = v; },
            get Folder() { return draft.Folder; },
            set Folder(v: string | null) { draft.Folder = v; },
            get ArtifactVersionID() { return draft.ArtifactVersionID; },
            set ArtifactVersionID(v: string | null) { draft.ArtifactVersionID = v; },
            get IsSaved() { return existing.IsSaved; },
            Save: async () => {
              spaceItemSaveAttempts += 1;
              if (options.failSpaceItemSave) return false;
              if (options.failSpaceItemRestoreSave && spaceItemSaveAttempts > 1) return false;
              Object.assign(existing, draft);
              return true;
            },
            Delete: async () => {
              if (options.failSpaceItemDelete) return false;
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
            if (options.failSpaceItemDelete) return false;
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
            Save: async () => {
              attachmentSaveAttempts += 1;
              if (options.failAttachmentSave) return false;
              if (options.failAttachmentSaveOnCall && attachmentSaveAttempts === options.failAttachmentSaveOnCall) return false;
              return true;
            },
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
            attachmentSaveAttempts += 1;
            if (options.failAttachmentSave) return false;
            if (options.failAttachmentSaveOnCall && attachmentSaveAttempts === options.failAttachmentSaveOnCall) return false;
            record.IsSaved = true;
            attachments.push(record);
            return true;
          },
          Delete: async () => {
            if (options.failSpaceItemDelete) return false;
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
            if (options.failSpaceItemDelete) return false;
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
    async (
      query: { EntityName: string; ExtraFilter?: string; Fields?: string[]; OrderBy?: string; MaxRows?: number },
      contextUser?: UserInfo,
    ) => {
      const entity = query.EntityName;
      const filter = query.ExtraFilter ?? '';

      if (options.failRunViewForEntity && entity === options.failRunViewForEntity) {
        return { Success: false, ErrorMessage: `Simulated failure for ${entity}`, Results: [] };
      }

      const project = <T extends object>(rows: T[]): T[] => rows.map((r) => projectRowFields(r, query.Fields));

      if (entity === 'MJ: Entities') {
        const allEntities = [
          { ID: ENTITY_ARTIFACTS_ID, Name: 'MJ: Artifacts' },
          { ID: ENTITY_FILES_ID, Name: 'MJ: Files' },
        ];
        const match = allEntities.filter(
          (e) =>
            filter.toLowerCase().includes(e.ID.toLowerCase()) ||
            filter.toLowerCase().includes(e.Name.toLowerCase()),
        );
        return { Success: true, Results: project(match) };
      }

      if (entity === 'MJ_BizApps_Collaboration: Spaces') {
        const match = [
          { ID: SPACE_ID, OwnerID: OWNER_USER_ID, Name: 'Product Community' },
        ].filter((s) => filter.toLowerCase().includes(s.ID.toLowerCase()));
        return { Success: true, Results: project(match) };
      }

      if (entity === 'MJ_BizApps_Collaboration: Space Members') {
        const uid = contextUser?.ID?.toLowerCase() ?? '';
        const match = spaceMembers.filter(
          (m) => filter.toLowerCase().includes(m.SpaceID.toLowerCase()) && m.UserID.toLowerCase() === uid,
        );
        return { Success: true, Results: project(match) };
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
        return { Success: true, Results: project(filtered) };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.Forums) {
        if (filter.trimStart().startsWith('ID =')) {
          return {
            Success: true,
            Results: project(forums.filter((f) => filter.toLowerCase().includes(f.ID.toLowerCase()))),
          };
        }
        return {
          Success: true,
          Results: project(forums.filter((f) => filter.toLowerCase().includes(f.SpaceID.toLowerCase()))),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumMembers) {
        const uid = contextUser?.ID?.toLowerCase() ?? '';
        return {
          Success: true,
          Results: project(
            forumMembers.filter(
              (m) => filter.toLowerCase().includes(m.ForumID.toLowerCase()) && m.UserID.toLowerCase() === uid,
            ),
          ),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumRoleTypes) {
        return {
          Success: true,
          Results: project(roleTypes.filter((r) => filter.toLowerCase().includes(r.ID.toLowerCase()))),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumPosts) {
        return {
          Success: true,
          Results: project(posts.filter((p) => filter.toLowerCase().includes(p.ID.toLowerCase()))),
        };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumPostAttachments) {
        const active = attachments.filter((a) => !a.deleted);
        if (filter.includes('PostID =')) {
          return {
            Success: true,
            Results: project(active.filter((a) => filter.toLowerCase().includes(a.PostID.toLowerCase()))),
          };
        }
        if (filter.includes('SpaceItemID IN')) {
          return {
            Success: true,
            Results: project(active.filter((a) => filter.toLowerCase().includes(a.SpaceItemID.toLowerCase()))),
          };
        }
        return { Success: true, Results: project(active) };
      }

      if (entity === COMMUNITY_ENTITY_NAMES.ForumArtifactPosts) {
        return {
          Success: true,
          Results: project(
            artifactPosts.filter((ap) => !ap.deleted && filter.toLowerCase().includes(ap.ID.toLowerCase())),
          ),
        };
      }

      if (entity === 'MJ: Artifact Types') {
        return {
          Success: true,
          Results: project(artifactTypes),
        };
      }

      if (entity === 'MJ: Artifacts') {
        if (options.failArtifactQuery) {
          return { Success: false, ErrorMessage: 'Access denied to MJ: Artifacts', Results: [] };
        }
        return {
          Success: true,
          Results: project(artifacts.filter((a) => !a.deleted && filter.toLowerCase().includes(a.ID.toLowerCase()))),
        };
      }

      if (entity === 'MJ: Artifact Versions') {
        const matched = artifactVersions.filter(
          (v) =>
            !v.deleted &&
            (filter.toLowerCase().includes(v.ID.toLowerCase()) ||
              filter.toLowerCase().includes(v.ArtifactID.toLowerCase()) ||
              (v.FileID !== null && filter.toLowerCase().includes(v.FileID.toLowerCase()))),
        );
        const ordered =
          typeof query.OrderBy === 'string' && /VersionNumber\s+DESC/i.test(query.OrderBy)
            ? [...matched].sort((a, b) => (b.VersionNumber ?? 0) - (a.VersionNumber ?? 0))
            : matched;
        const limited =
          typeof query.MaxRows === 'number' && query.MaxRows > 0 ? ordered.slice(0, query.MaxRows) : ordered;
        return {
          Success: true,
          Results: project(limited),
        };
      }

      if (entity === 'MJ: Files') {
        return {
          Success: true,
          Results: project(files.filter((f) => filter.toLowerCase().includes(f.ID.toLowerCase()))),
        };
      }

      return { Success: true, Results: [] };
    },
  );

  return { spaceItems, attachments, artifactPosts, artifacts, artifactVersions, files };
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

  it('CR-1: durably persists newly uploaded files into MJ: Artifacts + MJ: Artifact Versions (never ForumPost.ID) and round-trip hydrates', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const persisted = await svc.PersistPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'image',
            fileName: 'uploaded-proof.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            url: dataUrl,
            caption: 'Cold reload proof',
            sequence: 1,
            featureInLibrary: true,
          },
        ],
      });

      assert.equal(persisted.length, 1);
      assert.equal(world.spaceItems.length, 1);
      assert.equal(world.spaceItems[0].EntityID, ENTITY_ARTIFACTS_ID);
      assert.notEqual(world.spaceItems[0].RecordID, `ID|${SHARED_POST_ID}`);
      assert.ok(world.spaceItems[0].ArtifactVersionID);

      // Cold hydration from persisted entities (zero draft state)
      const hydratedPost = await svc.QueryPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
      });
      assert.equal(hydratedPost.length, 1);
      assert.equal(hydratedPost[0].kind, 'image');
      if (hydratedPost[0].kind === 'image') {
        assert.equal(hydratedPost[0].fileName, 'uploaded-proof.png');
        assert.equal(hydratedPost[0].mimeType, 'image/png');
        assert.equal(hydratedPost[0].sizeBytes, 2048);
        assert.equal(hydratedPost[0].url, dataUrl);
        assert.equal(hydratedPost[0].caption, 'Cold reload proof');
        assert.equal(hydratedPost[0].sequence, 1);
        assert.equal(hydratedPost[0].featureInLibrary, true);
      }

      const library = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'Library',
      });
      assert.equal(library.totalCount, 1);
      assert.equal(library.items[0].kind, 'image');
    } finally {
      mock.restoreAll();
    }
  });

  it('CR-3: rejects mismatched existingSpaceItemId targets and unauthorized Team -> Shared promotion', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');
      const teamMember = makeUser(TEAM_USER_ID, 'Team Staff');

      // Seed a Team-band SpaceItem for FILE_ID_1
      const teamSiId = '50000001-0000-4000-8000-000000000701';
      world.spaceItems.push({
        ID: teamSiId,
        SpaceID: SPACE_ID,
        EntityID: ENTITY_FILES_ID,
        RecordID: `ID|${FILE_ID_1}`,
        Band: 'Team',
        PromotedAt: null,
        PromotedByUserID: null,
        Folder: 'Post Media',
        ArtifactVersionID: null,
        IsSaved: true,
        deleted: false,
        __mj_CreatedAt: new Date(),
      });

      // Mismatched RecordID (FILE_ID_2 instead of FILE_ID_1) must be rejected
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: TEAM_POST_ID,
            contextUser: teamMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_5,
                fileName: 'wrong.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                url: 'https://cdn.example.com/alternate-diagram.png',
                existingSpaceItemId: teamSiId,
              },
            ],
          }),
        /does not match target record/,
      );

      // Mismatched ArtifactVersionID must be rejected
      const verFileId = 'ffff1111-0000-4000-8000-000000000901';
      world.artifactVersions.push({
        ID: verFileId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 1,
        Name: 'architecture.png',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/architecture.png',
        FileID: FILE_ID_1,
        FileName: 'architecture.png',
        MimeType: 'image/png',
        ContentSizeBytes: 4096,
      });
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: TEAM_POST_ID,
            contextUser: teamMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                artifactVersionId: verFileId,
                fileName: 'architecture.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/architecture.png',
                existingSpaceItemId: teamSiId,
              },
            ],
          }),
        /ArtifactVersionID.*does not match validated version/,
      );

      // Attaching Team SpaceItem to Shared post without promotion authorization must be rejected
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
                existingSpaceItemId: teamSiId,
              },
            ],
          }),
        /Team band and cannot be attached to a Shared post/,
      );
      assert.equal(world.spaceItems[0].Band, 'Team');
    } finally {
      mock.restoreAll();
    }
  });

  it('CR-4: validates authoritative MJ: Artifact Versions fields (ContentMode, FileID, MimeType, Size, URL) for file attachments', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      // 1. Text-mode version rejected on file attachment
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileName: 'fake.png',
                mimeType: 'image/png',
                sizeBytes: 512,
                artifactVersionId: ARTIFACT_VERSION_ID,
              },
            ],
          }),
        /expected "File"/,
      );

      // 2. Version with unsafe MIME type rejected even when caller sends image/png
      const badMimeVerId = 'ffff1111-0000-4000-8000-000000000902';
      world.artifactVersions.push({
        ID: badMimeVerId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 3,
        Name: 'evil.html',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/evil.html',
        FileID: FILE_ID_1,
        FileName: 'evil.html',
        MimeType: 'text/html',
        ContentSizeBytes: 512,
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
                fileName: 'innocent.png',
                mimeType: 'image/png',
                sizeBytes: 512,
                artifactVersionId: badMimeVerId,
              },
            ],
          }),
        /not permitted/,
      );

      // 3. Version with mismatched FileID rejected
      const mismatchedFileVerId = 'ffff1111-0000-4000-8000-000000000903';
      world.artifactVersions.push({
        ID: mismatchedFileVerId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 4,
        Name: 'other.png',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/other.png',
        FileID: FILE_ID_2,
        FileName: 'other.png',
        MimeType: 'image/png',
        ContentSizeBytes: 512,
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
                fileName: 'other.png',
                mimeType: 'image/png',
                sizeBytes: 512,
                artifactVersionId: mismatchedFileVerId,
              },
            ],
          }),
        /belongs to File/,
      );

      // 4. Version with oversized ContentSizeBytes rejected even when caller sends small sizeBytes
      const oversizedVerId = 'ffff1111-0000-4000-8000-000000000904';
      world.artifactVersions.push({
        ID: oversizedVerId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 5,
        Name: 'giant.png',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/giant.png',
        FileID: FILE_ID_1,
        FileName: 'giant.png',
        MimeType: 'image/png',
        ContentSizeBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES + 100,
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
                fileName: 'giant.png',
                mimeType: 'image/png',
                sizeBytes: 512,
                artifactVersionId: oversizedVerId,
              },
            ],
          }),
        /exceeds the maximum allowed/,
      );
    } finally {
      mock.restoreAll();
    }
  });

  it('CR-5: restores pre-existing SpaceItem snapshot (never deletes it) on mid-batch failure and UpdateAttachmentLibraryState failure', async () => {
    const world = buildMockWorld({ failAttachmentSaveOnCall: 2 });
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      const existingSiId = '50000001-0000-4000-8000-000000000801';
      world.spaceItems.push({
        ID: existingSiId,
        SpaceID: SPACE_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        PromotedAt: new Date('2026-11-01T00:00:00Z'),
        PromotedByUserID: SHARED_USER_ID,
        Folder: 'Post Media',
        ArtifactVersionID: ARTIFACT_VERSION_ID,
        IsSaved: true,
        deleted: false,
        __mj_CreatedAt: new Date('2026-11-01T00:00:00Z'),
      });

      // Item 1 mutates existingSiId (Folder -> Library); Item 2 fails at attachment save #2
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            cleanupSpaceItemOnFailure: true,
            attachments: [
              {
                kind: 'artifact',
                artifactId: ARTIFACT_ID,
                artifactVersionId: ARTIFACT_VERSION_ID,
                existingSpaceItemId: existingSiId,
                featureInLibrary: true,
              },
              {
                kind: 'image',
                fileName: 'second-fails.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                url: 'https://cdn.example.com/second-fails.png',
              },
            ],
          }),
        /Failed to persist ForumPostAttachment/,
      );

      // Pre-existing SpaceItem MUST NOT be deleted and MUST be restored to Folder = 'Post Media'
      assert.equal(world.spaceItems[0].deleted, false);
      assert.equal(world.spaceItems[0].Folder, 'Post Media');
      // Newly created item #2 records MUST be deleted
      assert.equal(world.spaceItems[1].deleted, true);
      assert.equal(world.attachments.filter((a) => !a.deleted).length, 0);
    } finally {
      mock.restoreAll();
    }

    // Also test UpdateAttachmentLibraryState rollback restoration + compensation error surfacing
    const world2 = buildMockWorld({ failAttachmentSave: true, failSpaceItemRestoreSave: true });
    try {
      const svc2 = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');
      const existingSiId = '50000001-0000-4000-8000-000000000802';
      const existingAttId = '60000001-0000-4000-8000-000000000802';
      world2.spaceItems.push({
        ID: existingSiId,
        SpaceID: SPACE_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${ARTIFACT_ID}`,
        Band: 'Shared',
        PromotedAt: new Date(),
        PromotedByUserID: SHARED_USER_ID,
        Folder: 'Post Media',
        ArtifactVersionID: ARTIFACT_VERSION_ID,
        IsSaved: true,
        deleted: false,
        __mj_CreatedAt: new Date(),
      });
      world2.attachments.push({
        ID: existingAttId,
        PostID: SHARED_POST_ID,
        SpaceItemID: existingSiId,
        Caption: 'Original caption',
        Sequence: 1,
        IsSaved: true,
        deleted: false,
        __mj_CreatedAt: new Date(),
      });

      await assert.rejects(
        () =>
          svc2.UpdateAttachmentLibraryState({
            postId: SHARED_POST_ID,
            attachmentId: existingAttId,
            featureInLibrary: true,
            caption: 'Updated caption',
            contextUser: sharedMember,
          }),
        /Rollback compensation failure/,
      );
    } finally {
      mock.restoreAll();
    }
  });

  it('CR-1, CR-4 & CR-6: rejects blob:/attachments.local URLs, validates MJ: Files & ArtifactVersion bindings strictly, and round-trip hydrates > 1.5 MiB data URLs', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      // 1. Rejects blob: and attachments.local URLs at persistence boundary
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileName: 'temp.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                url: 'blob:https://community.example.com/11111111-1111-4111-8111-111111111111',
              },
            ],
          }),
        /Temporary or placeholder URLs/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileName: 'placeholder.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                url: 'https://attachments.local/placeholder.png',
              },
            ],
          }),
        /Temporary or placeholder URLs/,
      );

      // 2. Rejects MJ: Files + artifactVersionId when ArtifactVersion.FileID is null
      const nullFileVerId = 'ffff1111-0000-4000-8000-000000000951';
      world.artifactVersions.push({
        ID: nullFileVerId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 1,
        Name: 'unbound.png',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/unbound.png',
        FileID: null,
        FileName: 'unbound.png',
        MimeType: 'image/png',
        ContentSizeBytes: 2048,
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
                artifactVersionId: nullFileVerId,
                fileName: 'unbound.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
              },
            ],
          }),
        /null or invalid FileID/,
      );

      // 3. Rejects MJ: Files-only target missing authoritative size or URL (never trusts caller size/url)
      const fileNoSizeId = 'ffffffff-6666-4666-8666-666666666666';
      world.files.push({
        ID: fileNoSizeId,
        Name: 'missing-size.png',
        ContentType: 'image/png',
        Size: null,
        DownloadURL: null,
        Status: 'Uploaded',
      });
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: fileNoSizeId,
                fileName: 'spoofed.png',
                mimeType: 'image/png',
                sizeBytes: 1234,
                url: 'https://cdn.example.com/spoofed.png',
              },
            ],
          }),
        /missing a valid positive authoritative byte size/,
      );

      // 4. Rejects ArtifactVersion with ContentSizeBytes: null and non-computable https:// Content
      const noSizeVerId = 'ffff1111-0000-4000-8000-000000000952';
      world.artifactVersions.push({
        ID: noSizeVerId,
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 2,
        Name: 'missing-size-ver.png',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/missing-size-ver.png',
        FileID: null,
        FileName: 'missing-size-ver.png',
        MimeType: 'image/png',
        ContentSizeBytes: null,
      });
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileName: 'missing-size-ver.png',
                mimeType: 'image/png',
                sizeBytes: 1024,
                artifactVersionId: noSizeVerId,
              },
            ],
          }),
        /missing a valid positive authoritative ContentSizeBytes/,
      );

      // 5. Round-trip uploads & cold-hydrates BOTH a small PNG AND a > 1.5 MiB (1.6 MiB) PNG data URL byte-for-byte
      const smallDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const largeBytes = Buffer.alloc(1_600_000);
      for (let i = 0; i < largeBytes.length; i += 1) {
        largeBytes[i] = (i * 17) & 0xff;
      }
      const largeDataUrl = `data:image/png;base64,${largeBytes.toString('base64')}`;

      const persisted = await svc.PersistPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'image',
            fileName: 'small-proof.png',
            mimeType: 'image/png',
            sizeBytes: 68,
            url: smallDataUrl,
            caption: 'Small proof',
            sequence: 1,
          },
          {
            kind: 'image',
            fileName: 'large-blueprint.png',
            mimeType: 'image/png',
            sizeBytes: largeBytes.length,
            url: largeDataUrl,
            caption: 'Large 1.6 MB blueprint',
            sequence: 2,
            featureInLibrary: true,
          },
        ],
      });
      assert.equal(persisted.length, 2);

      const hydrated = await svc.QueryPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
      });
      assert.equal(hydrated.length, 2);
      if (hydrated[0].kind === 'image' && hydrated[1].kind === 'image') {
        assert.equal(hydrated[0].url, smallDataUrl);
        assert.equal(hydrated[0].caption, 'Small proof');
        assert.equal(hydrated[1].url, largeDataUrl);
        assert.equal(hydrated[1].sizeBytes, 1_600_000);
        assert.equal(hydrated[1].caption, 'Large 1.6 MB blueprint');
        assert.equal(hydrated[1].featureInLibrary, true);
      }
    } finally {
      mock.restoreAll();
    }
  });

  it('CR-4, CR-7 & CR-8: validates linked MJ: Files on ArtifactVersions, supports real-schema MJ: Files round-trip under field projection, and enforces unpinned artifact batch limits', async () => {
    const world = buildMockWorld();
    try {
      const svc = new CommunityAttachmentServerService();
      const sharedMember = makeUser(SHARED_USER_ID, 'Shared Member');

      // CR-4: ArtifactVersion bound to Deleted / forbidden-ContentType / oversized / MIME-conflicting MJ: Files must reject
      const deletedFileId = 'ffffffff-7777-4777-8777-000000000001';
      const forbiddenFileId = 'ffffffff-7777-4777-8777-000000000002';
      const oversizedFileId = 'ffffffff-7777-4777-8777-000000000003';
      world.files.push(
        {
          ID: deletedFileId,
          Name: 'deleted.png',
          ContentType: 'image/png',
          Size: 2048,
          DownloadURL: 'https://cdn.example.com/deleted.png',
          Status: 'Deleted',
        },
        {
          ID: forbiddenFileId,
          Name: 'payload.exe',
          ContentType: 'application/x-msdownload',
          Size: 2048,
          DownloadURL: 'https://cdn.example.com/payload.exe',
          Status: 'Uploaded',
        },
        {
          ID: oversizedFileId,
          Name: 'huge.png',
          ContentType: 'image/png',
          Size: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES + 1,
          DownloadURL: 'https://cdn.example.com/huge.png',
          Status: 'Uploaded',
        },
      );

      const verDeleted = 'ffff2222-0000-4000-8000-000000000001';
      const verForbidden = 'ffff2222-0000-4000-8000-000000000002';
      const verOversized = 'ffff2222-0000-4000-8000-000000000003';
      const verConflictMime = 'ffff2222-0000-4000-8000-000000000004';
      const verConflictSize = 'ffff2222-0000-4000-8000-000000000005';
      world.artifactVersions.push(
        {
          ID: verDeleted,
          ArtifactID: ARTIFACT_ID,
          VersionNumber: 10,
          Name: 'deleted.png',
          ContentMode: 'File',
          Content: 'https://cdn.example.com/deleted.png',
          FileID: deletedFileId,
          FileName: 'deleted.png',
          MimeType: 'image/png',
          ContentSizeBytes: 2048,
        },
        {
          ID: verForbidden,
          ArtifactID: ARTIFACT_ID,
          VersionNumber: 11,
          Name: 'innocent.png',
          ContentMode: 'File',
          Content: 'https://cdn.example.com/payload.exe',
          FileID: forbiddenFileId,
          FileName: 'innocent.png',
          MimeType: 'image/png',
          ContentSizeBytes: 2048,
        },
        {
          ID: verOversized,
          ArtifactID: ARTIFACT_ID,
          VersionNumber: 12,
          Name: 'huge.png',
          ContentMode: 'File',
          Content: 'https://cdn.example.com/huge.png',
          FileID: oversizedFileId,
          FileName: 'huge.png',
          MimeType: 'image/png',
          ContentSizeBytes: 2048,
        },
        {
          ID: verConflictMime,
          ArtifactID: ARTIFACT_ID,
          VersionNumber: 13,
          Name: 'mismatch.pdf',
          ContentMode: 'File',
          Content: 'https://cdn.example.com/architecture.png',
          FileID: FILE_ID_1,
          FileName: 'mismatch.pdf',
          MimeType: 'application/pdf',
          ContentSizeBytes: 4096,
        },
        {
          ID: verConflictSize,
          ArtifactID: ARTIFACT_ID,
          VersionNumber: 14,
          Name: 'mismatch-size.png',
          ContentMode: 'File',
          Content: 'https://cdn.example.com/architecture.png',
          FileID: FILE_ID_1,
          FileName: 'mismatch-size.png',
          MimeType: 'image/png',
          ContentSizeBytes: 512,
        },
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: deletedFileId,
                artifactVersionId: verDeleted,
                fileName: 'deleted.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
              },
            ],
          }),
        /Deleted/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: forbiddenFileId,
                artifactVersionId: verForbidden,
                fileName: 'innocent.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
              },
            ],
          }),
        /not permitted/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: oversizedFileId,
                artifactVersionId: verOversized,
                fileName: 'huge.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
              },
            ],
          }),
        /exceeds the maximum allowed/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                artifactVersionId: verConflictMime,
                fileName: 'mismatch.pdf',
                mimeType: 'image/png',
                sizeBytes: 4096,
              },
            ],
          }),
        /conflicts with linked MJ: Files/,
      );

      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'image',
                fileId: FILE_ID_1,
                artifactVersionId: verConflictSize,
                fileName: 'mismatch-size.png',
                mimeType: 'image/png',
                sizeBytes: 4096,
              },
            ],
          }),
        /conflicts with linked MJ: Files/,
      );
      assert.equal(world.spaceItems.length, 0);

      // CR-7: Real-schema MJ: Files row (only ID, Name, ContentType, ProviderKey, Status; no Size/DownloadURL)
      // paired with companion MJ: Artifact Versions row via FileID persists and hydrates cleanly in Library
      const realSchemaFileId = 'ffffffff-8888-4888-8888-000000000001';
      world.files.push({
        ID: realSchemaFileId,
        Name: 'topology-real.png',
        ContentType: 'image/png',
        ProviderKey: 'community/spaces/topology-real.png',
        Status: 'Uploaded',
      });
      world.artifactVersions.push({
        ID: 'ffff3333-0000-4000-8000-000000000001',
        ArtifactID: ARTIFACT_ID,
        VersionNumber: 15,
        Name: 'topology-real.png',
        ContentMode: 'File',
        Content: `/api/files/${realSchemaFileId}`,
        FileID: realSchemaFileId,
        FileName: 'topology-real.png',
        MimeType: 'image/png',
        ContentSizeBytes: 16384,
      });

      const realFilePersisted = await svc.PersistPostAttachments({
        postId: SHARED_POST_ID,
        contextUser: sharedMember,
        attachments: [
          {
            kind: 'image',
            fileId: realSchemaFileId,
            fileName: 'topology-real.png',
            mimeType: 'image/png',
            sizeBytes: 16384,
            featureInLibrary: true,
          },
        ],
      });
      assert.equal(realFilePersisted.length, 1);
      if (realFilePersisted[0].kind === 'image') {
        assert.equal(realFilePersisted[0].sizeBytes, 16384);
        assert.equal(realFilePersisted[0].url, `/api/files/${realSchemaFileId}`);
      }

      const libraryRes = await svc.QuerySpaceMediaLibrary({
        spaceId: SPACE_ID,
        contextUser: sharedMember,
        folder: 'Library',
      });
      assert.equal(libraryRes.totalCount, 1);
      if (libraryRes.items[0].kind === 'image') {
        assert.equal(libraryRes.items[0].sizeBytes, 16384);
        assert.equal(libraryRes.items[0].url, `/api/files/${realSchemaFileId}`);
      }

      // CR-8: 6 sequential unpinned 9 MiB MJ: Artifacts calls (54 MiB > 50 MiB) fail closed on the 6th call
      const largeArtifactId = 'eeeeeeee-9999-4999-8999-000000000001';
      world.artifacts.push({
        ID: largeArtifactId,
        Name: 'Large 9 MiB Pack',
        Description: null,
        TypeID: 'type-binary',
        Type: 'PDF',
        Visibility: 'Always',
      });
      world.artifactVersions.push({
        ID: 'ffff4444-0000-4000-8000-000000000001',
        ArtifactID: largeArtifactId,
        VersionNumber: 1,
        Name: 'Large 9 MiB Pack v1',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/large-9mib.pdf',
        FileID: null,
        FileName: 'large-9mib.pdf',
        MimeType: 'application/pdf',
        ContentSizeBytes: 9 * 1024 * 1024,
      });

      for (let i = 0; i < 5; i += 1) {
        const res = await svc.PersistPostAttachments({
          postId: SHARED_REPLY_ID,
          contextUser: sharedMember,
          attachments: [
            {
              kind: 'artifact',
              artifactId: largeArtifactId,
              artifactName: 'Large 9 MiB Pack',
            },
          ],
        });
        assert.equal(res.length, 1);
      }
      const spaceItemsBefore6th = world.spaceItems.length;
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_REPLY_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'artifact',
                artifactId: largeArtifactId,
                artifactName: 'Large 9 MiB Pack',
              },
            ],
          }),
        /aggregate limit/,
      );
      assert.equal(world.spaceItems.length, spaceItemsBefore6th);

      // CR-8 (>50 historical versions): existing unpinned SpaceItem pointing to an artifact with 65 versions
      // (v1..v64 = 1 KB, v65 = 9 MiB) must resolve v65 via OrderBy: VersionNumber DESC instead of undercounting
      const highChurnArtId = 'eeeeeeee-9999-4999-8999-000000000065';
      const highChurnSiId = 'dddddddd-9999-4999-8999-000000000065';
      world.artifacts.push({
        ID: highChurnArtId,
        Name: 'High-Churn 65-Version Spec',
        Description: null,
        TypeID: 'type-binary',
        Type: 'PDF',
        Visibility: 'Always',
      });
      for (let v = 1; v <= 64; v += 1) {
        world.artifactVersions.push({
          ID: `ffff5555-0000-4000-8000-${String(v).padStart(12, '0')}`,
          ArtifactID: highChurnArtId,
          VersionNumber: v,
          Name: `High-Churn v${v}`,
          ContentMode: 'File',
          Content: `https://cdn.example.com/high-churn-v${v}.pdf`,
          FileID: null,
          FileName: `high-churn-v${v}.pdf`,
          MimeType: 'application/pdf',
          ContentSizeBytes: 1024,
        });
      }
      world.artifactVersions.push({
        ID: 'ffff5555-0000-4000-8000-000000000065',
        ArtifactID: highChurnArtId,
        VersionNumber: 65,
        Name: 'High-Churn v65',
        ContentMode: 'File',
        Content: 'https://cdn.example.com/high-churn-v65.pdf',
        FileID: null,
        FileName: 'high-churn-v65.pdf',
        MimeType: 'application/pdf',
        ContentSizeBytes: 9 * 1024 * 1024,
      });
      world.spaceItems.push({
        ID: highChurnSiId,
        SpaceID: SPACE_ID,
        EntityID: ENTITY_ARTIFACTS_ID,
        RecordID: `ID|${highChurnArtId}`,
        Band: 'Shared',
        PromotedAt: null,
        PromotedByUserID: null,
        Folder: 'Library',
        ArtifactVersionID: null,
      });
      for (let i = 0; i < 5; i += 1) {
        world.attachments.push({
          ID: `aaaa7777-0000-4000-8000-00000000000${i + 1}`,
          PostID: SHARED_POST_ID,
          SpaceItemID: highChurnSiId,
          Caption: `Existing unpinned #${i + 1}`,
          Sequence: i + 1,
        });
      }
      // 5 * 9 MiB = 45 MiB already on SHARED_POST_ID; attaching one more 9 MiB artifact (54 MiB > 50 MiB) must fail closed
      await assert.rejects(
        () =>
          svc.PersistPostAttachments({
            postId: SHARED_POST_ID,
            contextUser: sharedMember,
            attachments: [
              {
                kind: 'artifact',
                artifactId: highChurnArtId,
                artifactName: 'High-Churn 65-Version Spec',
              },
            ],
          }),
        /aggregate limit/,
      );
    } finally {
      mock.restoreAll();
    }
  });
});
