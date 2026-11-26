---
"@mj-biz-apps/community-engine-base": patch
"@mj-biz-apps/community-core-entities-server": patch
"@mj-biz-apps/community-actions": patch
"@mj-biz-apps/community-server": patch
"@mj-biz-apps/community-ng": patch
---

Upgrade `CommunityEngineBase` for multi-provider/impersonation safety, permission-gated metadata loading, RLS-safe `CacheLocal` configuration, and bounded per-space container caching; collapse parallel and sequential `RunView` bursts into single batched `rv.RunViews([...])` calls across Angular, CoreEntitiesServer, Actions, and Server; and document the canonical 5-rule BizApps performance standard in `CLAUDE.md` and `AGENTS.md`.
