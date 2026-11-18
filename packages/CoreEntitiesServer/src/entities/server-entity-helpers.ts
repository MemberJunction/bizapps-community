import {
  BaseEntity,
  BaseEntityResult,
  CompositeKey,
  Metadata,
  RunView,
  ValidationErrorInfo,
  ValidationErrorType,
  type UserInfo,
  type ValidationResult,
} from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  type IForumPostSummary,
  type IForumRoleTypeDescriptor,
  type IForumSummary,
  type IForumTypeDescriptor,
  type IPostTypeDescriptor,
  type mjBizAppsCommunityForumEntity,
  type mjBizAppsCommunityForumMemberEntity,
  type mjBizAppsCommunityForumPostEntity,
} from '@mj-biz-apps/community-entities';
import { CommunityEngine } from '../CommunityEngine.ts';

export type ForumStatusValue = mjBizAppsCommunityForumEntity['Status'];
export type ForumPostingPolicyValue = mjBizAppsCommunityForumEntity['PostingPolicy'];
export type ForumVisibilityBandValue = mjBizAppsCommunityForumEntity['VisibilityBand'];
export type ForumAnonymousReadModeValue = mjBizAppsCommunityForumEntity['AnonymousReadMode'];
export type ForumMemberStatusValue = mjBizAppsCommunityForumMemberEntity['Status'];
export type ForumPostStatusValue = mjBizAppsCommunityForumPostEntity['Status'];
export type ForumPostVisibilityBandValue = mjBizAppsCommunityForumPostEntity['VisibilityBand'];

export interface ForumRow {
  ID: string;
  SpaceID: string;
  ParentForumID: string | null;
  ForumTypeID: string;
  Slug: string;
  Name: string;
  Description: string | null;
  Icon: string | null;
  ColorHex: string | null;
  VisibilityBand: ForumVisibilityBandValue;
  AnonymousReadMode: ForumAnonymousReadModeValue;
  InheritsSpaceMembers: boolean;
  PostingPolicy: ForumPostingPolicyValue;
  InboundEmailAlias: string | null;
  Sequence: number;
  Status: ForumStatusValue;
  Configuration: string | null;
}

export interface ForumMemberRow {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: ForumMemberStatusValue;
}

export interface ResolvedForumMemberRole {
  lookupFailed: boolean;
  member: ForumMemberRow | null;
  roleType: IForumRoleTypeDescriptor | null;
}

export function failValidation(result: ValidationResult, fieldName: string, message: string): ValidationResult {
  result.Success = false;
  result.Errors.push(new ValidationErrorInfo(fieldName, message, null, ValidationErrorType.Failure));
  return result;
}

export function failDelete(entity: BaseEntity, message: string): false {
  const entry = new BaseEntityResult();
  entry.Success = false;
  entry.Type = 'delete';
  entry.Message = message;
  entity.RegisterResultHistoryEntry(entry);
  return false;
}

export function failSave(entity: BaseEntity, message: string): false {
  const entry = new BaseEntityResult();
  entry.Success = false;
  entry.Type = entity.IsSaved ? 'update' : 'create';
  entry.Message = message;
  entity.RegisterResultHistoryEntry(entry);
  return false;
}

export function validUuidOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return IsValidUUID(trimmed) ? trimmed : null;
}

export function isFieldDirty(entity: BaseEntity, fieldName: string): boolean {
  return entity.Fields.some((f) => f.Name === fieldName && f.Dirty);
}

export function getDirtyFieldNames(entity: BaseEntity): string[] {
  return entity.Fields.filter((f) => f.Dirty).map((f) => f.Name);
}

export function getBooleanOldValue(entity: BaseEntity, fieldName: string): boolean | null {
  const field = entity.Fields.find((f) => f.Name === fieldName);
  if (!field) return null;
  return typeof field.OldValue === 'boolean' ? field.OldValue : null;
}

export function getStringOldValue(entity: BaseEntity, fieldName: string): string | null {
  const field = entity.Fields.find((f) => f.Name === fieldName);
  if (!field) return null;
  return typeof field.OldValue === 'string' && field.OldValue.trim().length > 0 ? field.OldValue.trim() : null;
}

export async function loadRows<T>(
  entity: BaseEntity,
  entityName: string,
  extraFilter: string,
  fields?: string[],
  maxRows: number = 1000,
): Promise<{ success: boolean; rows: T[]; errorMessage?: string }> {
  const rv = new RunView(entity.RunViewProviderToUse);
  const res = await rv.RunView<T>(
    {
      EntityName: entityName,
      ExtraFilter: extraFilter,
      Fields: fields,
      ResultType: 'simple',
      MaxRows: maxRows,
    },
    entity.ContextCurrentUser,
  );
  if (!res?.Success) {
    return { success: false, rows: [], errorMessage: res?.ErrorMessage };
  }
  return { success: true, rows: res.Results ?? [] };
}

export async function loadSingleRow<T>(
  entity: BaseEntity,
  entityName: string,
  extraFilter: string,
  fields?: string[],
): Promise<{ success: boolean; row: T | null; errorMessage?: string }> {
  const res = await loadRows<T>(entity, entityName, extraFilter, fields, 1);
  if (!res.success) {
    return { success: false, row: null, errorMessage: res.errorMessage };
  }
  return { success: true, row: res.rows[0] ?? null };
}

export async function loadEntityById<T extends BaseEntity>(
  entityName: string,
  id: string,
  contextUser?: UserInfo,
): Promise<T | null> {
  const validId = validUuidOrNull(id);
  if (!validId) return null;
  const loaded = await new Metadata().GetEntityObject<T>(
    entityName,
    CompositeKey.FromID(validId),
    contextUser,
  );
  return loaded ?? null;
}

export async function createNewEntity<T extends BaseEntity>(
  entityName: string,
  contextUser?: UserInfo,
): Promise<T | null> {
  const created = await new Metadata().GetEntityObject<T>(entityName, contextUser);
  return created ?? null;
}

export async function resolveForumRow(entity: BaseEntity, forumId: string): Promise<ForumRow | null> {
  const validForumId = validUuidOrNull(forumId);
  if (!validForumId) return null;
  const res = await loadSingleRow<ForumRow>(
    entity,
    COMMUNITY_ENTITY_NAMES.Forums,
    `ID = '${validForumId}'`,
    [
      'ID',
      'SpaceID',
      'ParentForumID',
      'ForumTypeID',
      'Slug',
      'Name',
      'Description',
      'Icon',
      'ColorHex',
      'VisibilityBand',
      'AnonymousReadMode',
      'InheritsSpaceMembers',
      'PostingPolicy',
      'InboundEmailAlias',
      'Sequence',
      'Status',
      'Configuration',
    ],
  );
  return res.success ? res.row : null;
}

export async function resolveForumTypeDescriptor(
  entity: BaseEntity,
  forumTypeId: string,
): Promise<IForumTypeDescriptor | null> {
  const fromEngine = CommunityEngine.Instance.GetForumTypeById(forumTypeId);
  if (fromEngine) return fromEngine;

  const validId = validUuidOrNull(forumTypeId);
  if (!validId) return null;
  const res = await loadSingleRow<IForumTypeDescriptor>(
    entity,
    COMMUNITY_ENTITY_NAMES.ForumTypes,
    `ID = '${validId}'`,
  );
  return res.success ? res.row : null;
}

export async function resolvePostTypeDescriptor(
  entity: BaseEntity,
  postTypeId: string,
): Promise<IPostTypeDescriptor | null> {
  const fromEngine = CommunityEngine.Instance.GetPostTypeById(postTypeId);
  if (fromEngine) return fromEngine;

  const validId = validUuidOrNull(postTypeId);
  if (!validId) return null;
  const res = await loadSingleRow<IPostTypeDescriptor>(
    entity,
    COMMUNITY_ENTITY_NAMES.PostTypes,
    `ID = '${validId}'`,
  );
  return res.success ? res.row : null;
}

export async function resolveForumRoleTypeDescriptor(
  entity: BaseEntity,
  forumRoleTypeId: string,
): Promise<IForumRoleTypeDescriptor | null> {
  const fromEngine = CommunityEngine.Instance.GetForumRoleTypeById(forumRoleTypeId);
  if (fromEngine) return fromEngine;

  const validId = validUuidOrNull(forumRoleTypeId);
  if (!validId) return null;
  const res = await loadSingleRow<IForumRoleTypeDescriptor>(
    entity,
    COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
    `ID = '${validId}'`,
  );
  return res.success ? res.row : null;
}

export async function resolveForumMemberAndRole(
  entity: BaseEntity,
  forumId: string,
  userId: string | null | undefined,
): Promise<ResolvedForumMemberRole> {
  const validForumId = validUuidOrNull(forumId);
  const validUserId = validUuidOrNull(userId);
  if (!validForumId || !validUserId) {
    return { lookupFailed: false, member: null, roleType: null };
  }

  const memberRes = await loadSingleRow<ForumMemberRow>(
    entity,
    COMMUNITY_ENTITY_NAMES.ForumMembers,
    `ForumID = '${validForumId}' AND UserID = '${validUserId}'`,
    ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
  );
  if (!memberRes.success) {
    return { lookupFailed: true, member: null, roleType: null };
  }
  if (!memberRes.row) {
    return { lookupFailed: false, member: null, roleType: null };
  }

  const roleType = await resolveForumRoleTypeDescriptor(entity, memberRes.row.ForumRoleTypeID);
  return { lookupFailed: false, member: memberRes.row, roleType };
}

export function toForumSummary(row: ForumRow): IForumSummary {
  return {
    ID: row.ID,
    SpaceID: row.SpaceID,
    ParentForumID: row.ParentForumID,
    ForumTypeID: row.ForumTypeID,
    Slug: row.Slug,
    Name: row.Name,
    Description: row.Description,
    Icon: row.Icon,
    ColorHex: row.ColorHex,
    VisibilityBand: row.VisibilityBand,
    AnonymousReadMode: row.AnonymousReadMode,
    InheritsSpaceMembers: Boolean(row.InheritsSpaceMembers),
    PostingPolicy: row.PostingPolicy,
    InboundEmailAlias: row.InboundEmailAlias,
    Sequence: row.Sequence,
    Status: row.Status,
    Configuration: row.Configuration,
  };
}

export function toPostSummary(post: mjBizAppsCommunityForumPostEntity): IForumPostSummary {
  return {
    ID: post.ID,
    ForumID: post.ForumID,
    PostTypeID: post.PostTypeID,
    RootPostID: post.RootPostID,
    ParentPostID: post.ParentPostID,
    ReplyDepth: post.ReplyDepth,
    AuthorUserID: post.AuthorUserID,
    AuthorPersonID: post.AuthorPersonID,
    AuthorAgentID: post.AuthorAgentID,
    Title: post.Title,
    Slug: post.Slug,
    BodyMarkdown: post.BodyMarkdown,
    SummaryMarkdown: post.SummaryMarkdown,
    SummaryGeneratedAt: post.SummaryGeneratedAt,
    SummaryReplyWatermark: post.SummaryReplyWatermark,
    VisibilityBand: post.VisibilityBand,
    Status: post.Status,
    IsPinned: Boolean(post.IsPinned),
    IsLocked: Boolean(post.IsLocked),
    IsFeatured: Boolean(post.IsFeatured),
    ReplyCount: post.ReplyCount,
    ParticipantCount: post.ParticipantCount,
    ReactionScore: post.ReactionScore,
    ViewCount: post.ViewCount,
    LastActivityAt: post.LastActivityAt,
    PromotedToSpaceID: post.PromotedToSpaceID,
    LinkedTaskID: post.LinkedTaskID,
  };
}
