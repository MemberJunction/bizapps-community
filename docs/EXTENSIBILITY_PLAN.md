# BizApps Community — Extensibility Plan (`ForumType`, `PostType`, `ForumRoleType` & Peer `SpaceType` Interop)

> **Architectural Companion to [`plans/plan.md`](../plans/plan.md)**
> Modeled directly on the proven extensibility architecture of [`bizapps-collaboration`](https://github.com/MemberJunction/bizapps-collaboration) (`SpaceType` & `SpaceRoleType`) and peer Collaboration apps like `bizapps-committees` (`committee` & `committee-term`).

Just as `bizapps-collaboration` makes **Spaces** extensible without schema rewrites via metadata-driven `SpaceType` and `SpaceRoleType` tables paired with `ServerDriverClass`, `UIDriverClass`, `SpaceExtensionEntity` (`IsA`), and a 4-tier JSON `Configuration` cascade, **`bizapps-community` applies the exact same extensibility pattern to Forums and Posts**:

1. **`ForumType`** — defines what kinds of channels exist inside a Community Space (`General Discussion`, `Q&A Knowledge Base`, `Ideation Campaign`, `Playbooks & Collaborative Docs`, `Peer Case Rounds`, `Live Events & AMAs`, or custom customer/vertical forum types).
2. **`PostType`** — defines what kinds of root posts and replies can be authored (`Discussion`, `Reply`, `Comment`, `Question`, `Answer`, `Idea Proposal`, `Poll or Form`, `Collaborative Document`, `Collaborative Spreadsheet`, `Collaborative Presentation`, `Peer Case Review`, `Live AMA`, `Interactive Experience`, or custom vertical post types).
3. **`ForumRoleType`** — defines role capabilities inside a forum (`Forum Admin`, `Moderator`, `Topic Host`, `Expert Reviewer`, `Contributor`, `Observer`, `Muted`) with explicit capability bit flags.
4. **Peer Collaboration `SpaceType` Interoperability** — `CommunitySpace` is one peer `SpaceType` (`code = 'community'`) under `__mj_BizAppsCollaboration.Space` alongside **Committees** (`committee`, `committee-term`), **Working Groups** (`working-group`), **Cohorts** (`cohort`), **Projects** (`project`), and **Events** (`event`). High-momentum threads can graduate into any allowed Collaboration `SpaceType` via `ThreadGraduationService`.

---

## 1. The Three Extensibility Catalog Tables (`__mj_BizAppsCommunity`)

### 1.1 `ForumType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[ForumType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Icon] NVARCHAR(100) NULL,
    [ServerDriverClass] NVARCHAR(200) NULL,
    [UIDriverClass] NVARCHAR(200) NULL,
    [ExtensionEntity] NVARCHAR(255) NULL,
    [Configuration] NVARCHAR(MAX) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_ForumType_IsActive] DEFAULT (1),
    CONSTRAINT [PK_ForumType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_ForumType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO
```

### 1.2 `PostType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[PostType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_PostType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Icon] NVARCHAR(100) NULL,
    [ServerDriverClass] NVARCHAR(200) NULL,
    [UIDriverClass] NVARCHAR(200) NULL,
    [ExtensionEntity] NVARCHAR(255) NULL,
    [PlacementRule] NVARCHAR(20) NOT NULL CONSTRAINT [DF_PostType_PlacementRule] DEFAULT (N'Both'),
    [AllowsNestedReplies] BIT NOT NULL CONSTRAINT [DF_PostType_AllowsNestedReplies] DEFAULT (1),
    [TriggersThreadSynthesis] BIT NOT NULL CONSTRAINT [DF_PostType_TriggersThreadSynthesis] DEFAULT (1),
    [IndexedInCorpus] BIT NOT NULL CONSTRAINT [DF_PostType_IndexedInCorpus] DEFAULT (1),
    [Configuration] NVARCHAR(MAX) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_PostType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_PostType_IsActive] DEFAULT (1),
    CONSTRAINT [PK_PostType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_PostType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_PostType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_PostType_PlacementRule] CHECK ([PlacementRule] IN (N'Root Only', N'Reply Only', N'Both')),
    CONSTRAINT [CK_PostType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO
```

### 1.3 `ForumRoleType` Table

```sql
CREATE TABLE [${flyway:defaultSchema}].[ForumRoleType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumRoleType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
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
    CONSTRAINT [PK_ForumRoleType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumRoleType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumRoleType_Name] UNIQUE ([Name])
);
GO
```

---

## 2. Dynamic `IsA` Subtype Resolution (`EntitySubtypeResolver` + `BaseSingleton` Directory)

Just as `bizapps-collaboration` registers `SpaceSubtypeResolver` for `MJ_BizApps_Collaboration: Spaces` backed by `SpaceSubtypeDirectory` (`BaseSingleton`), `bizapps-community` provides two singleton directories and resolvers in `@mj-biz-apps/community-entities`:

1. **`ForumSubtypeDirectory` & `ForumSubtypeResolver` (`MJ_BizApps_Community: Forums`)**:
   - Inspects `Forum.ForumTypeID`, looks up the cached `ForumType` in `ForumSubtypeDirectory.Instance`, and returns `ForumType.ExtensionEntity` (e.g., `'MJ_BizApps_Community: Forum Idea Campaigns'`).
2. **`PostSubtypeDirectory` & `ForumPostSubtypeResolver` (`MJ_BizApps_Community: Forum Posts`)**:
   - Inspects `ForumPost.PostTypeID`, looks up the cached `PostType` in `PostSubtypeDirectory.Instance`, and returns `PostType.ExtensionEntity` (`'MJ_BizApps_Community: Forum Question Posts'`, `'MJ_BizApps_Community: Forum Answer Posts'`, `'MJ_BizApps_Community: Forum Idea Posts'`, `'MJ_BizApps_Community: Forum Form Posts'`, `'MJ_BizApps_Community: Forum Artifact Posts'`, `'MJ_BizApps_Community: Forum Case Posts'`, `'MJ_BizApps_Community: Forum AMA Posts'`, or `'MJ_BizApps_Community: Forum Interactive Posts'`).

### Built-In `ForumType` Seed Matrix

| `Code` | `Name` | `ExtensionEntity` (`IsA` Child of `Forum`) | Default Allowed `PostType` Codes | Purpose |
|---|---|---|---|---|
| `general-discussion` | `General Discussion` | `NULL` | `["discussion", "reply", "comment", "poll-or-form", "collaborative-doc", "collaborative-sheet", "collaborative-deck", "interactive-experience"]` | Open topical forum with Living Thread Synthesis, inline polls, co-authored docs, and interactive mini-apps. |
| `qa-knowledge-base` | `Q&A Knowledge Base` | `NULL` | `["question", "answer", "comment"]` | Structured Q&A with dual human + AI epistemic answer verification and freshness decay. |
| `ideation-campaign` | `Ideation Campaign` | `MJ_BizApps_Community: Forum Idea Campaigns` | `["idea-proposal", "reply", "poll-or-form"]` | 100-Point Wallet & Quadratic Voting ($\text{Cost} = \text{Votes}^2$) prioritization. |
| `playbooks-and-docs` | `Playbooks & Collaborative Docs` | `NULL` | `["collaborative-doc", "collaborative-sheet", "collaborative-deck", "reply", "comment"]` | Co-authoring channel where root posts are live Yjs MJ Artifacts (`Document`, `Spreadsheet`, `Presentation`). |
| `peer-case-rounds` | `Peer Case Rounds` | `NULL` | `["case-review", "reply", "comment"]` | Structured Situation / Action / Outcome case reviews with optional anonymization. |
| `live-events-and-amas` | `Live Events & AMAs` | `NULL` | `["live-ama", "question", "reply", "poll-or-form", "interactive-experience"]` | Scheduled Ask-Me-Anything sessions, town halls, and live member trivia. |

---

## 3. The 4-Tier Configuration Cascade (`CommunityConfigurationResolver`)

Implemented in `@mj-biz-apps/community-core`, configuration resolves through 4 tiers:

```
DEFAULT_COMMUNITY_CONFIGURATION
  -> Application Settings ("CommunitySettings")
    -> ForumType.Configuration
      -> Forum.Configuration (filtered strictly through ForumType.Configuration.ForumOverridable)
```

If a `Forum` attempts to override a setting path (such as `Posts.AllowedPostTypeCodes` or `Posts.MaxReplyDepth`) that is not listed in its `ForumType.Configuration.ForumOverridable` whitelist, `CommunityConfigurationResolver.Resolve()` ignores the unauthorized override and preserves the `ForumType` rule.

---

## 4. Peer Collaboration `SpaceType` Interoperability (Committees, Working Groups, Secure Messaging)

Because `CommunitySpace` is an `IsA` child of `MJ_BizApps_Collaboration: Spaces`, it sits alongside peer `SpaceType`s in the Collaboration tree:
- **Committees & Terms (`committee`, `committee-term` from `bizapps-committees`)**: Governance committees with formal rosters, `Tasks` meetings, motions, and sealed/open ballots.
- **Working Groups (`working-group`), Projects (`project`), Cohorts (`cohort`), and Events (`event`)**: Core Collaboration space types.
- **Thread Graduation (`ThreadGraduationService`)**: Any root `ForumPost` can graduate into a child Collaboration Space of any `SpaceType` code permitted by `SpaceType.Configuration.Children.AllowedTypeCodes` (e.g., spinning up a `working-group` or referring a policy thread to a `committee`), carrying over participants, a synthesized charter, and an optional initial `Task`.
