---
"@mj-biz-apps/community-ng": minor
---

Add `@memberjunction/ng-artifacts` (`^6.3.0-edge.1` peer dependency) and ship the theme-native `CommunityArtifactViewerComponent` (`<mjc-community-artifact-viewer>`) wrapping `<mj-artifact-viewer-panel>` for in-place and slide-over viewing of `ForumArtifactPost` (`ArtifactID` / `PinnedArtifactVersionID`) and `ForumInteractivePost` (`ComponentArtifactID` / `PinnedArtifactVersionID`) with batched `RunView` metadata loading, `Escape`-to-close focus management, `UserInfoEngine.Instance` preference persistence, and graceful missing-artifact fallback; document the `MJ Docs (MJ: Artifacts) vs. MJ: Comments vs. Quick Notes` rubric across `CLAUDE.md`, `AGENTS.md`, package READMEs, and `.mj/specs/ng-artifacts-forum-viewer/spec.md`.
