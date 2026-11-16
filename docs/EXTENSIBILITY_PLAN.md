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

Located in `@mj-biz-apps/community-engine-base` (`packages/EngineBase`), `CommunityEngineBase` extends `BaseSingleton<CommunityEngineBase>` from `@memberjunction/global` to ensure a single instance across all bundler chunks:

### Key Responsibilities
- **O(1) Lookups**: In-memory Map indexes by `ID` and `Code` for `ForumType`, `PostType`, and `ForumRoleType`.
- **Subtype Directory Synchronization**: Synchronizes `ForumSubtypeDirectory` and `PostSubtypeDirectory` on metadata hydration.
- **4-Tier Configuration Cascade Resolution**: Implements `ResolveForumConfiguration(forum)` enforcing the `ForumOverridable` whitelist.
- **Zero Server-Only Imports**: Browser-safe so Angular client components and Node servers share the exact same resolution rules.

```typescript
export class CommunityEngineBase extends BaseSingleton<CommunityEngineBase> {
  public static get Instance(): CommunityEngineBase {
    return super.getInstance<CommunityEngineBase>();
  }

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

Implemented in `@mj-biz-apps/community-core` (`CommunityConfigurationResolver`), configuration resolves through 4 tiers:

```
DEFAULT_COMMUNITY_CONFIGURATION (Code defaults)
  └── Application Settings ("CommunitySettings")
        └── ForumType.Configuration
              └── Forum.Configuration (Filtered strictly through ForumType.Configuration.ForumOverridable)
```

If a `Forum` attempts to override a setting path (such as `Posts.AllowedPostTypeCodes` or `Posts.MaxReplyDepth`) that is not listed in its `ForumType.Configuration.ForumOverridable` whitelist, `CommunityConfigurationResolver.Resolve()` rejects the unauthorized override and preserves the `ForumType` default.

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
High-momentum discussions can graduate from a forum into an active working space:
1. Validates that the requested target `SpaceType` is listed in `SpaceType.Configuration.Children.AllowedTypeCodes`.
2. Creates the child `Space` under the current `CommunitySpace`.
3. Sets `ForumPost.PromotedToSpaceID` pointing to the new Space.
4. Generates a synthesized space charter from the thread's `SummaryMarkdown`.
5. Optionally creates an initial `Task` in `__mj_BizAppsTasks.Task` linked via `ForumPost.LinkedTaskID`.
