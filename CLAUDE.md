# BizApps Community (`mj-bizapps-community`)

## Metadata

A migration carries physical DDL: tables, columns, views, functions, constraints, and extended properties, plus the CodeGen output appended under its banner. Metadata rows are JSON under `metadata/`. Push them with `mj sync push` while developing. The build engineer generates the release `*__Metadata_Sync.sql` from a clean database. A feature pull request never writes that file. The model, and the Open App steps that differ from core (`--schema`, the `${mjSchema}` substitution): [Release Metadata Migrations Guide](https://github.com/MemberJunction/MJ/blob/next/guides/RELEASE_METADATA_MIGRATIONS_GUIDE.md).

Every metadata record has a `primaryKey`, nested `relatedEntities` children included. Author `JSONType` fields (such as `Configuration` and `DefaultNavItems`) as native JSON objects or arrays—never escaped strings. When an entity has a polymorphic foreign-key pair (`LinkedEntityID` + `LinkedRecordID`), decorate it in `metadata/entities/.polymorphic-fk-entity-fields.json` using `EntityField.EntityIDFieldName`. That rule and the others MJ and every BizApps repo share, such as plain migration DDL and CHECK values written for people, are in MJ's [Schema and Code Authoring Guide](https://github.com/MemberJunction/MJ/blob/next/guides/SCHEMA_AND_CODE_AUTHORING_GUIDE.md), each with its reason.

## Database Migrations & Dual-Dialect Parity

1. **Physical DDL**: Author plain DDL in `migrations/*.sql` and PostgreSQL counterparts in `migrations-pg/*.pg.sql`.
2. **Collation & System Columns**: Every character column must specify `COLLATE SQL_Latin1_General_CP1_CI_AS`. Every physical table must define `[__mj_CreatedAt]` and `[__mj_UpdatedAt]` with `SYSDATETIMEOFFSET()` defaults.
3. **50 Blank Lines Separator**: When appending CodeGen output, separate hand-written DDL from generated plumbing with at least 50 blank lines of whitespace and the standard CodeGen comment block.
4. **Teardown Parity**: Provide matching teardown scripts in `teardown/V1__Remove_Community_Schema.sql` and `teardown-pg/V1__Remove_Community_Schema.pg.sql`.

## Relationship to BizApps Collaboration

`BizApps Community` (`__mj_BizAppsCommunity`) extends [`BizApps Collaboration`](https://github.com/MemberJunction/bizapps-collaboration) (`__mj_BizAppsCollaboration`). Every community is a `Space`, every roster seat is a `SpaceMember`, every shared attachment is a `SpaceItem`, and read/write reach for threads and posts is evaluated through `__mj_BizAppsCollaboration.fnCollaborationAccess(@UserID)` and `__mj_BizAppsCollaboration.fnCollaborationSpaceStatuses()`. Never duplicate Space membership or file storage tables in `__mj_BizAppsCommunity`.

## Browser-Safe Metadata Engine (`@mj-biz-apps/community-engine-base`)

`CommunityEngineBase` lives in `packages/EngineBase`. It extends `BaseEngine<CommunityEngineBase>` (`BaseSingleton`) to cache bounded reference/taxonomy metadata (`ForumType`, `PostType`, `ForumRoleType`, and permission-gated `MJ: Application Settings`), providing O(1) in-memory lookups invalidated in `AdditionalLoading()` and resolving the 4-tier configuration cascade without any Node or server-only dependencies. Client Angular widgets, Explorer resources, Actions, and backend servers consume this package as a shared library.

## Canonical 5-Rule Performance Standard

Every engine, Angular component, Action, server entity, and GraphQL resolver in this repo **MUST** follow these 5 rules:

1. **`BaseEngine` (`BaseSingleton`) for Bounded Reference / Taxonomy Metadata**: Cache bounded reference/taxonomy tables (`Forum Types`, `Post Types`, `Forum Role Types`, and optional `MJ: Application Settings`) via `BaseEnginePropertyConfig` with `AutoRefresh: true` and O(1) lookup `Map`s reset in `AdditionalLoading()`. Never re-query cached taxonomy tables via ad-hoc `RunView` calls in components, resolvers, or actions.
2. **Multi-Provider & Impersonation Safety**:
   - `ProviderToUse` must follow the active provider passed to `Config()` or `Metadata.Provider` (never stay pinned to a stale first-wins provider across persona/impersonation switches).
   - Auto-evict user-scoped caches whenever the active `userId` changes (`EnsureUserCacheContext` / `ClearUserCaches`).
   - Always set `CacheLocal: false` on any RLS-filtered or untrusted-cache entity.
   - Gate optional metadata queries (such as `MJ: Application Settings`) on `EntityInfo.GetUserPermisions(user)?.CanRead`.
3. **Mandatory `rv.RunViews([...])` Single-Request Batching**:
   - Collapse independent `RunView` queries into a single `rv.RunViews([...])` batch call (`RunView.FromMetadataProvider(provider)` on the client; `LoadAllPaginatedBatches` for multi-page reads; `loadBatchRows` in `CoreEntitiesServer`).
   - Always use `ResultType: 'simple'` with narrow `Fields` projections whenever entity mutation is not needed.
   - Never issue `Promise.all([new RunView().RunView(...), ...])` bursts or multi-hop `ParentID` loops when a root pointer (`RootPostID`) or single batch suffices.
4. **`ConversationEngine`-Style Bounded Container Caching**:
   - Cache only bounded per-container windows/subtrees (e.g., per-space forum directories capped at a fixed container count) with automatic `BaseEntity` event invalidation (`HandleIndividualBaseEntityEvent`), explicit `Invalidate*()` methods, and automatic persona-switch eviction.
   - **NEVER** cache global unbounded transactional tables (`ForumPosts`, `ForumPostReactions`, `ForumIdeaAllocations`, etc.) or arbitrary `ExtraFilter` list caches.
5. **RLS-Safe Two-Step Entity Reads**:
   - **NEVER** embed raw SQL subqueries against RLS-filtered `vw*` views inside `ExtraFilter`.
   - Always query the RLS-protected entity first via `RunView` / `RunViews`, validate UUIDs via `AssertValidUUID`, and pass `ID IN (...)` to the follow-up entity query.

## Type Safety & Code Quality Rules (CI-Enforced)

- **ZERO `any` and ZERO `unknown`** in type position (enforced via `node scripts/check-type-safety.mjs`).
- **ZERO `BaseEntity.Get()` / `.Set()`** dynamic field access (use generated strongly-typed entity properties).
- **Use `BaseSingleton<T>`** for all singletons (never manual `static _instance`).
- **Modern Angular syntax**: use `@if` / `@for` / `@switch` and `inject()`.
- **ZERO cross-package re-exports**: consumers import types from their defining source package.
- **ZERO `localStorage` / `sessionStorage`**: persist user preferences via `UserInfoEngine.Instance`.
- See also [AGENTS.md](AGENTS.md) for the complete agent operating checklist.

## Downstream Isolation Boundary

To preserve 100% generic purity, zero downstream app names (`voting`, `issues`, `credentialing`, `sonar`, `accounting`) are permitted inside `packages/`, `metadata/`, or `migrations/`. Verified in CI via `node scripts/check-downstream-names.mjs`.

## MemberJunction Version & Mega-Workspace Rules

Work runs on MemberJunction's `next` (`6.3+`), in a workspace made by `mj dev workspace` beside MemberJunction, BizApps Common, BizApps Tasks, and BizApps Collaboration. This clone sits inside the `M5` joined pnpm mega-workspace:
- **NEVER run `pnpm install` inside `bizapps-community/`**.
- **NEVER create per-package `node_modules` symlinks or run `pnpm link`**.

## Release lines

`next` is built on MJ Edge and never publishes. Production releases come from release lines (`lts/<MJ major.minor>`), listed in `release-lines.json`. Land every change on `next` first, then add a `backport lts/X.Y` label; a PR that adds a migration needs a label for every open line, or its files listed as edge-only in `release-lines.json`. Never open a PR straight into a line or into `main`. Full rules, publishing and the line cut: [guides/RELEASE_LINES.md](guides/RELEASE_LINES.md).
