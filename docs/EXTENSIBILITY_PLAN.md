# BizApps Community — Extensibility & Plug-In Architecture Specification

> **Architectural Companion to [`plans/plan.md`](../plans/plan.md)**
> Modeled directly on the proven extensibility architecture of [`bizapps-collaboration`](https://github.com/MemberJunction/bizapps-collaboration) (`SpaceType`, `SpaceRoleType`, and `CollaborationEngineBase`).

Just as `bizapps-collaboration` makes **Spaces** extensible without schema rewrites via metadata-driven `SpaceType` and `SpaceRoleType` tables paired with `ServerDriverClass`, `UIDriverClass`, `SpaceExtensionEntity` (`IsA`), and a 4-tier JSON `Configuration` cascade, **`bizapps-community` applies the exact same extensibility pattern to Forums and Posts**:

1. **`ForumType`** — defines what kinds of channels exist inside a Community Space (`General Discussion`, `Q&A Knowledge Base`, `Ideation Campaign`, `Playbooks & Collaborative Docs`, `Peer Case Rounds`, `Live Events & AMAs`, or custom customer/vertical forum types).
2. **`PostType`** — defines what kinds of root posts and replies can be authored (`Discussion`, `Reply`, `Comment`, `Question`, `Answer`, `Idea Proposal`, `Poll or Form`, `Collaborative Document`, `Collaborative Spreadsheet`, `Collaborative Presentation`, `Peer Case Review`, `Live AMA`, `Interactive Experience`, or custom vertical post types).
3. **`ForumRoleType`** — defines role capabilities inside a forum (`Forum Admin`, `Moderator`, `Topic Host`, `Expert Reviewer`, `Contributor`, `Observer`, `Muted`) with explicit capability bit flags and vote weight multipliers.
4. **Browser-Safe Metadata Engine (`CommunityEngineBase`)** — process-wide metadata caching and 4-tier configuration cascade resolution shared across browser and server.
5. **Polymorphic Entity Record Anchoring** — `ForumPost.LinkedEntityID` and `ForumPost.LinkedRecordID` with explicit `EntityField.EntityIDFieldName` metadata decoration.
6. **Peer Collaboration `SpaceType` Interoperability** — `CommunitySpace` is one peer `SpaceType` (`code = 'community'`) under `__mj_BizAppsCollaboration.Space` alongside **Committees** (`committee`, `committee-term`), **Working Groups** (`working-group`), **Cohorts** (`cohort`), **Projects** (`project`), and **Events** (`event`). High-momentum threads graduate into any allowed Collaboration `SpaceType` via `ThreadGraduationService`.

---

## 1. Browser-Safe Metadata Engine (`CommunityEngineBase`)

Located in `@mj-biz-apps/community-engine-base` (`packages/EngineBase`), `CommunityEngineBase` extends `BaseEngine<CommunityEngineBase>` from `@memberjunction/core` — matching `CollaborationEngineBase`, the sibling it is modeled on. `BaseEngine<T>` is itself a `BaseSingleton<T>` subclass, so `CommunityEngineBase.Instance` is still a single instance across all bundler chunks; it additionally gets `Config()`/`Load()`-backed metadata loading (real `RunView` calls against `ForumType`, `PostType`, and `ForumRoleType` when a live `IMetadataProvider` is available) for free.

### Key Responsibilities
- **O(1) Lookups**: In-memory Map indexes by `ID` and `Code` for `ForumType`, `PostType`, and `ForumRoleType`, rebuilt in `AdditionalLoading()` on every load or reload.
- **Subtype Directory Synchronization**: Synchronizes `ForumSubtypeDirectory` and `PostSubtypeDirectory` on every load.
- **4-Tier Configuration Cascade Resolution**: `ResolveConfiguration({ forum, space?, postType? })` implements the full cascade (§4); `ResolveForumConfiguration(forum)` is a 3-tier convenience wrapper for callers without a Space/PostType context yet.
- **Test-Friendly Seeding**: `HydrateMetadata(...)` populates the same fields `Config()`/`Load()` would and rebuilds the caches — the path unit tests use instead of a live, configured `IMetadataProvider`.
- **Zero Server-Only Imports**: Browser-safe so Angular client components and Node servers share the exact same resolution rules.

```typescript
export class CommunityEngineBase extends BaseEngine<CommunityEngineBase> {
  public static get Instance(): CommunityEngineBase {
    return super.getInstance<CommunityEngineBase>();
  }

  public async Config(forceRefresh?: boolean, contextUser?: UserInfo, provider?: IMetadataProvider): Promise<void>;

  public HydrateMetadata(params: {
    forumTypes: ReadonlyArray<IForumTypeDescriptor>;
    postTypes: ReadonlyArray<IPostTypeDescriptor>;
    forumRoleTypes?: ReadonlyArray<IForumRoleTypeDescriptor>;
    appSettings?: Partial<CommunityConfiguration>;
  }): void;

  public GetForumTypeById(id: string): IForumTypeDescriptor | undefined;
  public GetForumTypeByCode(code: string): IForumTypeDescriptor | undefined;
  public GetAllForumTypes(): ReadonlyArray<IForumTypeDescriptor>;

  public GetPostTypeById(id: string): IPostTypeDescriptor | undefined;
  public GetPostTypeByCode(code: string): IPostTypeDescriptor | undefined;
  public GetAllPostTypes(): ReadonlyArray<IPostTypeDescriptor>;

  public GetForumRoleTypeById(id: string): IForumRoleTypeDescriptor | undefined;
  public GetForumRoleTypeByCode(code: string): IForumRoleTypeDescriptor | undefined;
  public GetAllForumRoleTypes(): ReadonlyArray<IForumRoleTypeDescriptor>;

  public ResolveForumConfiguration(forum: Pick<IForumSummary, 'ForumTypeID' | 'Configuration'>): CommunityConfiguration;

  public ResolveConfiguration(context: {
    forum: Pick<IForumSummary, 'ForumTypeID' | 'Configuration'>;
    space?: { Configuration?: string | null } | null;
    postType?: Pick<IPostTypeDescriptor, 'Configuration'> | null;
  }): CommunityConfiguration;
}
```

---

## 2. The Three Extensibility Catalog Tables

### 2.1 `ForumType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[ForumType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Name] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Description] NVARCHAR(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Icon] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [ServerDriverClass] NVARCHAR(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [UIDriverClass] NVARCHAR(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [ExtensionEntity] NVARCHAR(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Configuration] NVARCHAR(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_ForumType_IsActive] DEFAULT (1),
    [__mj_CreatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_ForumType___mj_CreatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_ForumType___mj_UpdatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    CONSTRAINT [PK_ForumType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_ForumType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO
```

### 2.2 `PostType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[PostType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_PostType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Name] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Description] NVARCHAR(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Icon] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [ServerDriverClass] NVARCHAR(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [UIDriverClass] NVARCHAR(200) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [ExtensionEntity] NVARCHAR(255) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [PlacementRule] NVARCHAR(20) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL CONSTRAINT [DF_PostType_PlacementRule] DEFAULT (N'Both'),
    [AllowsNestedReplies] BIT NOT NULL CONSTRAINT [DF_PostType_AllowsNestedReplies] DEFAULT (1),
    [TriggersThreadSynthesis] BIT NOT NULL CONSTRAINT [DF_PostType_TriggersThreadSynthesis] DEFAULT (1),
    [IndexedInCorpus] BIT NOT NULL CONSTRAINT [DF_PostType_IndexedInCorpus] DEFAULT (1),
    [Configuration] NVARCHAR(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_PostType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_PostType_IsActive] DEFAULT (1),
    [__mj_CreatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_PostType___mj_CreatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_PostType___mj_UpdatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    CONSTRAINT [PK_PostType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_PostType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_PostType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_PostType_PlacementRule] CHECK ([PlacementRule] IN (N'Root Only', N'Reply Only', N'Both')),
    CONSTRAINT [CK_PostType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO
```

### 2.3 `ForumRoleType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[ForumRoleType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumRoleType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Name] NVARCHAR(100) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    [Description] NVARCHAR(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
    [Level] INT NOT NULL CONSTRAINT [DF_ForumRoleType_Level] DEFAULT (100),
    [CanConfigureForum] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanConfigureForum] DEFAULT (0),
    [CanModerateQueue] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanModerateQueue] DEFAULT (0),
    [CanPinOrLock] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanPinOrLock] DEFAULT (0),
    [CanAcceptAnswers] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanAcceptAnswers] DEFAULT (0),
    [CanVerifyCanon] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanVerifyCanon] DEFAULT (0),
    [CanPromoteToSpace] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanPromoteToSpace] DEFAULT (0),
    [CanCreateRootPost] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanCreateRootPost] DEFAULT (1),
    [CanReply] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanReply] DEFAULT (1),
    [CanCoEditDocs] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanCoEditDocs] DEFAULT (0),
    [VoteWeightMultiplier] DECIMAL(5,2) NOT NULL CONSTRAINT [DF_ForumRoleType_VoteWeightMultiplier] DEFAULT (1.00),
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumRoleType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_IsActive] DEFAULT (1),
    [__mj_CreatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_ForumRoleType___mj_CreatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_ForumRoleType___mj_UpdatedAt] DEFAULT (SYSDATETIMEOFFSET()),
    CONSTRAINT [PK_ForumRoleType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumRoleType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumRoleType_Name] UNIQUE ([Name])
);
GO
```

---

## 3. Dynamic `IsA` Subtype Resolution

Modeled directly on Collaboration's `SpaceSubtypeDirectory` & `SpaceSubtypeResolver`:

1. **`ForumSubtypeDirectory` & `ForumSubtypeResolver` (`MJ_BizApps_Community: Forums`)**:
   - Inspects `Forum.ForumTypeID`, looks up the cached `ForumType` in `ForumSubtypeDirectory.Instance`, and returns `ForumType.ExtensionEntity` (e.g., `'MJ_BizApps_Community: Forum Idea Campaigns'`).
2. **`PostSubtypeDirectory` & `ForumPostSubtypeResolver` (`MJ_BizApps_Community: Forum Posts`)**:
   - Inspects `ForumPost.PostTypeID`, looks up the cached `PostType` in `PostSubtypeDirectory.Instance`, and returns `PostType.ExtensionEntity` (`'MJ_BizApps_Community: Forum Question Posts'`, `'MJ_BizApps_Community: Forum Answer Posts'`, `'MJ_BizApps_Community: Forum Idea Posts'`, `'MJ_BizApps_Community: Forum Form Posts'`, `'MJ_BizApps_Community: Forum Artifact Posts'`, `'MJ_BizApps_Community: Forum Case Posts'`, `'MJ_BizApps_Community: Forum AMA Posts'`, or `'MJ_BizApps_Community: Forum Interactive Posts'`).

### Built-In `ForumType` Seed Matrix

| `Code` | `Name` | `ExtensionEntity` (`IsA` Child of `Forum`) | Default Allowed `PostType` Codes | Purpose |
|---|---|---|---|---|
| `general-discussion` | `General Discussion` | `NULL` | `["discussion", "reply", "comment", "poll-or-form", "collaborative-doc", "collaborative-sheet", "collaborative-deck", "interactive-experience"]` | Open topical forum with Living Thread Synthesis, inline polls, co-authored docs, and interactive mini-apps. |
| `qa-knowledge-base` | `Q&A Knowledge Base` | `NULL` | `["question", "answer", "comment"]` | Structured Q&A with dual human + AI epistemic answer verification and freshness tracking. |
| `ideation-campaign` | `Ideation Campaign` | `MJ_BizApps_Community: Forum Idea Campaigns` | `["idea-proposal", "reply", "poll-or-form"]` | 100-Point Wallet & Quadratic Voting ($\text{Cost} = \text{Votes}^2$) prioritization. |
| `playbooks-and-docs` | `Playbooks & Collaborative Docs` | `NULL` | `["collaborative-doc", "collaborative-sheet", "collaborative-deck", "reply", "comment"]` | Co-authoring channel where root posts are live Yjs MJ Artifacts (`Document`, `Spreadsheet`, `Presentation`). |
| `peer-case-rounds` | `Peer Case Rounds` | `NULL` | `["case-review", "reply", "comment"]` | Structured Situation / Action / Outcome case reviews with optional anonymization. |
| `live-events-and-amas` | `Live Events & AMAs` | `NULL` | `["live-ama", "question", "reply", "poll-or-form", "interactive-experience"]` | Scheduled Ask-Me-Anything sessions, town halls, and live member trivia. |

---

## 4. The 4-Tier Configuration Cascade

Implemented in `@mj-biz-apps/community-core` (`CommunityConfigurationResolver.Resolve`), lowest to highest precedence:

```
DEFAULT_COMMUNITY_CONFIGURATION (Code defaults) + Application Settings ("CommunitySettings")
  └── ForumType.Configuration                                    (unconditional — a forum's type-level defaults)
        └── CommunitySpace's underlying Space.Configuration      (unconditional — a space's own overrides)
              └── Forum.Configuration                            (whitelist-gated — see below)
                    └── PostType.Configuration                   (whitelist-gated — applied last; wins ties with Forum)
```

The two most specific tiers — `Forum.Configuration` and `PostType.Configuration` — are filtered strictly through the running `ForumOverridable` whitelist (owned by `ForumType.Configuration.ForumOverridable`): a nested `Posts.*`/`Synthesis.*`/`Extensions.*` path not listed there is rejected and the broader tier's value is preserved. Top-level scalar fields (`AskFirstEnabled`, `DefaultAnonymousReadMode`, `DefaultDigestCadence`, `EnableInteractiveArtifacts`) apply unconditionally at every tier, PostType winning last.

`CommunityEngineBase.ResolveConfiguration({ forum, space?, postType? })` is the entry point a caller with a Space/PostType context should use; `ResolveForumConfiguration(forum)` (the 3 broadest tiers only) remains for callers — like `CommunitySpaceServerDriver`'s post-placement check — that do not yet have one.

---

## 5. Polymorphic Foreign Keys (`EntityField.EntityIDFieldName`)

`ForumPost` supports anchoring discussions to any MemberJunction entity record:
- Column `LinkedEntityID UNIQUEIDENTIFIER NULL` references `__mj.Entity(ID)`
- Column `LinkedRecordID NVARCHAR(450) COLLATE SQL_Latin1_General_CP1_CI_AS NULL` stores the primary key value.

In `metadata/entities/.polymorphic-fk-entity-fields.json`:
```json
[
  {
    "fields": {
      "Name": "MJ_BizApps_Community: Forum Posts"
    },
    "relatedEntities": {
      "MJ: Entity Fields": [
        {
          "fields": {
            "EntityIDFieldName": "LinkedEntityID"
          },
          "primaryKey": {
            "ID": "@lookup:MJ: Entity Fields.EntityID=@lookup:MJ: Entities.Name=MJ_BizApps_Community: Forum Posts&Name=LinkedRecordID"
          }
        }
      ]
    },
    "primaryKey": {
      "ID": "@lookup:MJ: Entities.Name=MJ_BizApps_Community: Forum Posts"
    }
  }
]
```
This hard metadata decoration instructs MemberJunction forms, grids, and record detail panels to resolve the target record's display name, icon, and clickable record link without heuristics.

---

## 6. Peer Collaboration `SpaceType` Interoperability & Thread Graduation

Because `CommunitySpace` is an `IsA` child of `MJ_BizApps_Collaboration: Spaces`, it sits alongside peer `SpaceType`s in the Collaboration hierarchy:
- **Committees & Terms (`committee`, `committee-term`)**: Governance committees with formal rosters, `Tasks` meetings, and motions.
- **Working Groups (`working-group`), Projects (`project`), Cohorts (`cohort`), and Events (`event`)**: Collaboration space types.

### Thread Graduation (`ThreadGraduationService`)
`packages/Server` (`@mj-biz-apps/community-server`) exposes two idempotent, access-checked graduation operations:

**`ValidateAndBuildGraduationPlan`** — high-momentum discussions graduate from a forum into an active working space:
1. Requires `userCanPromoteToSpace` (the forum role's `CanPromoteToSpace` capability).
2. Validates that the requested target `SpaceType` is listed in the caller's `allowedChildSpaceTypeCodes`.
3. **Idempotent**: if `currentPromotedToSpaceId` (the thread's existing `ForumPost.PromotedToSpaceID`) is already set, returns that EXISTING space — it does not create a duplicate `Space`, re-seed a `Task`, or re-invite participants on a repeated call.
4. Otherwise plans a new child `Space` under the current `CommunitySpace`, an optional initial `Task` (`ForumPost.LinkedTaskID`), and the deduplicated participant invite list.

**`ValidateAndBuildCanonPromotion`** — promotes a Q&A answer into the forum's Knowledge Canon:
1. Requires `isQuestionAuthorOrModerator` — only the question's author or a forum moderator may promote.
2. **Idempotent**: if `currentAICanonAnswerPostId` already equals the requested `canonAnswerPostId` (`ForumQuestionPost.AICanonAnswerPostID`), `alreadyPromoted` is `true` and no further write is implied.
