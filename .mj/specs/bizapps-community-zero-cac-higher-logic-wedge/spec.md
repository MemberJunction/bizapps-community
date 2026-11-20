# BizApps Community — Zero-CAC Higher Logic Wedge Specification

**Status:** Implemented & Verified  
**Schema:** `__mj_BizAppsCommunity` (no schema changes required for Wedge)  
**Key Packages:** `@mj-biz-apps/community-core`, `@mj-biz-apps/community-actions`, `@mj-biz-apps/community-server`, `@mj-biz-apps/community-ng`

---

## 1. Purpose & Wedge Overview

Traditional association and enterprise community platforms charge steep annual seat/platform fees (CAC) while trapping institutional knowledge outside the core operational database. **BizApps Community** delivers the **Zero-CAC Higher Logic Wedge** directly inside MemberJunction:

1. **Embedding-Personalized Community Digests** (`CommunityEmbeddingPersonalizationService` + `Community.SendPersonalizedDigest`)
2. **Zero-Login Inbound Reply-by-Email** (`Community.ProcessInboundDigestReply` + HMAC-SHA256 `Reply-To` tokens)
3. **Hybrid Semantic + Lexical Ask-First Deflection** (`Community.AskFirstDeflection` + live composer suggestions)
4. **Living Thread Synthesis with Citations** (`Community.LivingThreadSynthesis` + structured takeaways, open questions, and contributor citations)
5. **Idempotent 1-Click Graduation to Working Space** (`ThreadGraduationService.GraduateThreadToSpace` + `GraduateCommunityThread` GraphQL mutation)
6. **Hub Preview, Preferences & OpenApp v3 Compliance** (`CommunityHubResource` + `UserInfoEngine.Instance` + semantic `--mj-*` tokens + Playwright E2E + axe-core WCAG 2.1 AA)

---

## 2. Architecture & Component Contracts

### 2.1 Pluggable Embedding Personalization (`@mj-biz-apps/community-core`)
- **`ICommunityEmbeddingProvider` / `CallbackCommunityEmbeddingProvider`**: Pluggable embedding interface allowing runtime hosts to wire MJ `AIEngine` embedding models while remaining zero-dependency and browser-safe.
- **`DeterministicSemanticEmbeddingProvider`**: 128-dimensional zero-API-key semantic vector provider combining curated domain concept clusters, stemmed token feature hashing, and character trigrams so unit tests, CI, and offline environments exhibit consistent cosine similarity without external API keys.
- **`CommunityEmbeddingPersonalizationService` (`BaseSingleton`)**:
  - Aggregates member interactions (`authored`, `replied`, `followed`, `tagged_interest`, `reacted`) with exponential recency half-life decay into a normalized `MemberInterestProfile`.
  - Scores candidate posts using `semanticSimilarity * recencyDecay * epistemicBoost` with cold-start fallback and greedy diversity-aware re-ranking so no single forum or tag monopolizes the digest.
  - Emits human-readable `"Why this was picked for you"` explanations and matched tag lists.

### 2.2 MJ `CommunicationEngine` Delivery & Reply-by-Email Loop (`@mj-biz-apps/community-actions`)
- **`CommunityTestCommunicationProvider` (`BaseCommunicationProvider`)**: Registered as `'Community Test Email Driver'` via `@RegisterClass(BaseCommunicationProvider, 'Community Test Email Driver')` for deterministic delivery testing and offline/CI rehearsal through MJ `CommunicationEngine` without external SMTP credentials.
- **`SendPersonalizedCommunityDigestAction` (`Community.SendPersonalizedDigest`)**:
  - Loads scoped active forums, bounded candidate posts, member signals (`CommunityMemberProfiles`, authored posts, reactions), and ranks per-member digest items via `CommunityEmbeddingPersonalizationService`.
  - Signs per-thread HMAC-SHA256 `Reply-To` addresses (`reply+<base64url-payload>.<hmac>@<domain>`) binding `memberUserId`, `forumId`, `rootPostId`, `parentPostId`, `recipientEmail`, and expiration TTL.
  - Renders HTML + plaintext digest emails (`RenderPersonalizedDigestEmail`) and dispatches through `CommunicationEngine.Instance.SendSingleMessage(...)`.
- **`ProcessInboundDigestReplyAction` (`Community.ProcessInboundDigestReply`)**:
  - Verifies HMAC-SHA256 signature and expiration (`VerifyDigestReplyToken`), rejecting tampered, expired, or email-mismatched tokens with zero writes.
  - Resolves server-side `MJ: Users` identity, checks `Forum` + `ForumMember` posting permissions (rejecting muted/revoked members), strips quoted email chrome (`StripQuotedEmailReply`), and persists a child `ForumPost` (`PostType = 'reply'`, `ReplyDepth = 1`).

### 2.3 Hybrid Ask-First, Living Synthesis & 1-Click Graduation (`@mj-biz-apps/community-actions`, `@mj-biz-apps/community-server`)
- **`AskFirstDeflectionAction` (`Community.AskFirstDeflection`)**: Fuses semantic embedding cosine similarity (`0.65`) with stemmed lexical/tag overlap (`0.35`) and epistemic canon boosts (`Verified > Accepted > Unverified`).
- **`LivingThreadSynthesisAction` (`Community.LivingThreadSynthesis`)**: Produces structured `AIExecutiveSummary`, `KeyTakeaways`, `OpenQuestions`, and `ContributorCitations` (`[n]` attribution) persisted onto root `ForumPosts`.
- **`ThreadGraduationService.GraduateThreadToSpace`**: Idempotently promotes a thread into a child Collaboration `Space` (`PromotedToSpaceID`), carrying the synthesized `SummaryMarkdown` onto the graduated Space and starter `BizApps Tasks` task (`SeededTaskID`). Concurrent or repeated graduation requests return the existing `PromotedToSpaceID` without duplicating Spaces, seats, or tasks.

### 2.4 `CommunityHubResource` UX & Preferences (`@mj-biz-apps/community-ng`)
- **Personalized Digest Preview Drawer**: Displays embedding-ranked items with match-score chips (`% match`), `"Why this was picked for you"` reasons, HMAC Reply-by-Email status banner, `"Send Test Digest (MJ Comms)"` action trigger, and cadence controls (`Daily` / `Weekly` / `Off`).
- **Preference Persistence**: Digest cadence (`bizapps-community.digestCadence`), active topic filter (`bizapps-community.activeTopicFilter`), active tab, and porch collapse state persist exclusively via `UserInfoEngine.Instance` (`GetSetting` / `SetSetting` / `SetSettingDebounced`), never `localStorage`.
- **Live Ask-First, Synthesis & Graduation**: `+ Ask or Share` modal and `AskFirstDeflectionWidgetComponent` surface live semantic Canon matches while typing; Detail Sheet renders structured `Living Thread Synthesis` takeaways/citations and a `1-Click Graduate to Working Space` button with direct `#mjc-detail-open-graduated-space-link` space navigation.
- **OpenApp v3 & Accessibility**: 100% `--mj-*` CSS design tokens, `ChangeDetectionStrategy.OnPush`, 26 runtime `ClassFactory` registrations, and 0 critical/serious WCAG 2.1 AA violations via `@axe-core/playwright`.
