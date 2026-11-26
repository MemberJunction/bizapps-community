# AGENTS.md — BizApps Community (`MemberJunction/bizapps-community`)

This file mirrors and links the critical development rules and performance standard in [CLAUDE.md](CLAUDE.md) for all coding agents working in `bizapps-community`.

## Critical Rules (CI-Enforced — Violations Fail the Build)

1. **Zero `any` and Zero `unknown`**: Never use `any` or `unknown` in TypeScript type position across `packages/**/*.ts` (checked by `node scripts/check-type-safety.mjs` and `.github/workflows/ci.yml`).
2. **Zero `BaseEntity.Get()` / `.Set()`**: Always use generated strongly-typed entity properties from `@mj-biz-apps/community-entities` or `@memberjunction/core-entities` (checked by `node scripts/check-type-safety.mjs`).
3. **`BaseSingleton<T>` for Singletons**: Never write manual `static _instance` singletons; extend `BaseSingleton<T>` or `BaseEngine<T>`.
4. **Modern Angular Syntax**: Use `@if` / `@for` / `@switch` control flow blocks and `inject()` DI.
5. **Zero Cross-Package Re-Exports**: Never re-export types/classes from other packages; import directly from the defining package.
6. **Zero `localStorage` / `sessionStorage`**: Persist user preferences via `UserInfoEngine.Instance` (`MJ: User Settings`), never browser storage.
7. **Downstream Isolation Boundary**: Zero downstream app names (`accounting`, `committees`, `contracts`, `credentialing`, `issues`, `orders`, `sales`, `secure-messaging`, `sonar`, `voting`) inside `packages/`, `metadata/`, or `migrations/` (checked by `node scripts/check-downstream-names.mjs`).
8. **Git & Workspace Safety**:
   - Never commit or push directly to `next` or `main`.
   - Never squash-merge PRs (`gh pr merge --merge` only).
   - Never run `pnpm install` inside `bizapps-community/` when inside the M5 mega-workspace, and never commit local host artifacts (`mj.config.*`).
   - Do not modify `ci/` protected files (`ci/protect.mjs`) or write `*__Metadata_Sync.sql` in feature PRs.

## Canonical 5-Rule Performance Standard

1. **`BaseEngine` (`BaseSingleton`) for Bounded Reference / Taxonomy Metadata**:
   - Load bounded taxonomy tables (`MJ_BizApps_Community: Forum Types`, `MJ_BizApps_Community: Post Types`, `MJ_BizApps_Community: Forum Role Types`, and optional `MJ: Application Settings`) in `CommunityEngineBase` (`packages/EngineBase`) using `BaseEnginePropertyConfig` with `AutoRefresh: true`.
   - Maintain O(1) lookup `Map`s invalidated in `AdditionalLoading()`.
   - Read cached taxonomies from `CommunityEngineBase.Instance` instead of issuing repeated `RunView` calls.
2. **Multi-Provider & Impersonation Safety**:
   - `ProviderToUse` must follow the active provider passed to `Config()` or `Metadata.Provider` (never remain pinned to an earlier provider after impersonation/persona switches).
   - Auto-evict user-scoped caches on `userId` change (`EnsureUserCacheContext` / `ClearUserCaches`).
   - Always set `CacheLocal: false` on any RLS-filtered or untrusted-cache entity (`TrustServerCacheCompletely === false` or any `EntityPermission.ReadRLSFilterID` set).
   - Gate optional metadata queries on `EntityInfo.GetUserPermisions(user)?.CanRead`.
3. **Mandatory `rv.RunViews([...])` Single-Request Batching**:
   - Instantiate client `RunView` via `RunView.FromMetadataProvider(provider)`.
   - Always use `ResultType: 'simple'` with narrow `Fields` arrays when entity mutation is not required.
   - Collapse independent `RunView` calls into a single `rv.RunViews([...])` batch (`LoadAllPaginatedBatches` in Angular, `loadBatchRows` in `CoreEntitiesServer`, `rv.RunViews([...])` in `Server` and `Actions`).
   - Never issue `Promise.all([new RunView().RunView(...), ...])` bursts or multi-hop `ParentID` loops when `RootPostID` or single-batch loading exists.
4. **`ConversationEngine`-Style Bounded Container Caching**:
   - Only cache bounded per-container windows/subtrees (e.g., per-Space forum summaries bounded to a fixed container cap) with automatic `BaseEntity` event invalidation (`HandleIndividualBaseEntityEvent`), explicit `Invalidate*()` helpers, and persona-switch eviction.
   - Never cache global unbounded transactional tables or arbitrary `ExtraFilter` list results.
5. **RLS-Safe Two-Step Entity Reads**:
   - Never embed raw SQL subqueries against RLS-filtered `vw*` views inside `ExtraFilter`.
   - Query the RLS-protected entity first via `RunView` / `RunViews`, validate UUIDs (`AssertValidUUID`), and pass `ID IN (...)` to the dependent query.

## References

- Full repository rules, dual-dialect migrations, Collaboration relationship, and release lines: [CLAUDE.md](CLAUDE.md)
- Release lines process: [guides/RELEASE_LINES.md](guides/RELEASE_LINES.md)
