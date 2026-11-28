# BizApps Community Skill

**BizApps Community** (`mj-bizapps-community`) is installed in this MemberJunction workspace. Use this skill whenever the user asks about community spaces, member discussions, Q&A threads, accepted or canon-verified answers, moderation queues, flagged posts, member subscriptions, or community digests.

## 1. Core Data Access & RLS Rules

- **Always read through `RunView` or the bound typed Community actions under the caller's `ContextUser` — NEVER execute raw SQL.**
- Row-Level Security (`Community: Visible Forums`, `Community: Visible Forum Posts`, and `Community: Visible Forum Post Children`) automatically enforces `fnCommunityForumAccess('{{UserID}}')` on every `RunView` call:
  - Users only see forums they have access to via their Collaboration Space membership or explicit `Forum Members` role.
  - `VisibilityBand = 'Team'` posts and child rows are visible **only** when the caller has `CanSeeTeam = 1` in that forum; regular members see only `VisibilityBand = 'Shared'`.
  - `Status IN ('Draft', 'PendingModeration')` posts are visible **only** to their `AuthorUserID` or forum moderators (`CanModerate = 1`).
- **Always resolve `AllowedForumIDs` from `RunView` on `MJ_BizApps_Community: Forums` for the current user** before passing `AllowedForumIDs` to `Ask-First Deflection` or `Export Community Digest PDF`. Never guess forum IDs or carry them over from another user's context.

## 2. Core Entities & Key Fields

| Entity Name | Purpose & Key Fields |
| --- | --- |
| `MJ_BizApps_Community: Community Spaces` | Top-level communities extending Collaboration Spaces: `Slug`, `CommunityKind` (`Association Wide`, `Product Community`, `Special Interest Group`, `Working Group`, `Other`), `AnonymousReadMode`, `AskFirstEnabled`, `DefaultDigestCadence`, `DefaultForumID`. |
| `MJ_BizApps_Community: Forums` | Discussion channels inside a space: `SpaceID`, `ParentForumID`, `ForumTypeID`, `Slug`, `Name`, `VisibilityBand` (`Shared`, `Team`, `PrivateForum`), `PostingPolicy` (`Open`, `Moderated`, `ReadOnly`), `Status` (`Active`, `Archived`, `Locked`), `InheritsSpaceMembers`. |
| `MJ_BizApps_Community: Forum Posts` | Root threads and nested replies: `ForumID`, `PostTypeID`, `RootPostID`, `ParentPostID`, `ReplyDepth`, `AuthorUserID`, `AuthorPersonID`, `Title`, `BodyMarkdown`, `SummaryMarkdown`, `VisibilityBand` (`Shared`, `Team`), `Status` (`Draft`, `PendingModeration`, `Published`, `Answered`, `Resolved`, `Archived`, `Redacted`), `IsPinned`, `IsLocked`, `IsFeatured`, `ReplyCount`, `ReactionScore`, `LastActivityAt`, `LinkedTaskID`, `PromotedToSpaceID`. |
| `MJ_BizApps_Community: Forum Question Posts` | Q&A extension for root question posts: `AcceptedAnswerPostID`, `AICanonAnswerPostID`, `BountyPoints`, `ResolvedAt`, `DeflectionCount`. |
| `MJ_BizApps_Community: Forum Answer Posts` | Answer extension for reply posts: `QuestionPostID`, `IsAcceptedByAuthor`, `IsVerifiedByModerator`, `AIEpistemicStatus` (`Canon Verified`, `Novel Insight`, `Partially Outdated`, `Conflicts With Canon`), `AIConfidenceScore`, `AIRationaleMarkdown`. |
| `MJ_BizApps_Community: Forum Members` | Explicit forum memberships and roles: `ForumID`, `UserID`, `ForumRoleTypeID`, `Status` (`Active`, `Invited`, `Muted`, `Removed`). |
| `MJ_BizApps_Community: Forum Post Flags` | Moderation flags: `PostID`, `ReasonCategory` (`Spam`, `Harassment`, `Off Topic`, `Outdated Advice`, `Needs Redaction`, `Other`), `Status` (`Open`, `ActionTaken`, `Dismissed`), `ResolutionOutcome`. |
| `MJ_BizApps_Community: Forum Subscriptions` | Per-user delivery preferences: `UserID`, `ForumID`, `RootPostID`, `TopicTagID`, `DeliveryLevel` (`Every Post`, `First Post Only`, `Digest Only`, `Muted`). |
| `MJ_BizApps_Community: Community Member Profiles` | Per-space member stats & expertise: `SpaceID`, `UserID`, `PersonID`, `ReputationScore`, `HelpfulAnswerCount`, `AcceptedAnswerCount`, `DigestCadence`, `OpenToPeerMentoring`. |
| `MJ_BizApps_Community: Forum Topic Tags` & `MJ_BizApps_Community: Forum Post Tags` | Hierarchical taxonomy tags (`SpaceID`, `Slug`, `Name`, `IsOfficial`, `PostCount`) and post-to-tag links (`AssignedByAI`). |

## 3. Bound Typed Actions Playbook

1. **Answer a member question before creating a duplicate thread (`Ask-First Deflection`):**
   - Query `MJ_BizApps_Community: Forums` via `RunView` for the current user to collect their visible `AllowedForumIDs`.
   - Call `Ask-First Deflection` with `QueryText` and comma-separated `AllowedForumIDs` (optional `MinConfidence`, `MaxCitations`).
   - Present `SynthesizedAnswerMarkdown` and `Citations` when `Deflected = true`; prefer `Canon Verified` and moderator-verified answers.
2. **Summarize a long discussion (`Living Thread Synthesis`):**
   - Call `Living Thread Synthesis` with `RootPostID` (optional `AcceptedAnswerPostID`, `ForceRegenerate`).
   - Surface `AIExecutiveSummary`, `KeyTakeaways`, `OpenQuestions`, and `ContributorCitations`.
3. **Evaluate an answer against existing knowledge (`Epistemic Answer Grading`):**
   - Call `Epistemic Answer Grading` with `AnswerPostID` (or explicit question/answer markdown) to inspect `EpistemicStatus`, `ConfidenceScore`, and `RationaleMarkdown`.
4. **Export a digest (`Export Community Digest PDF`):**
   - Resolve the user's visible `AllowedForumIDs` via `RunView` first, then call `Export Community Digest PDF` with `SpaceName` and `AllowedForumIDs`.

## 4. Common Chief of Staff Workflows

- **Morning community briefing:** Query `MJ_BizApps_Community: Forum Posts` ordered by `LastActivityAt DESC` where `RootPostID IS NULL` and `Status IN ('Published', 'Answered')` to highlight active discussions, unanswered questions (`Status = 'Published'` with `ReplyCount = 0`), and recent `SummaryMarkdown` updates.
- **Moderation & health check (for moderators only):** Query `MJ_BizApps_Community: Forum Post Flags` where `Status = 'Open'` and `MJ_BizApps_Community: Forum Posts` where `Status = 'PendingModeration'`. If RLS returns zero rows, report only what is visible to the caller without assuming hidden moderation items exist.
- **Action follow-up:** Check `LinkedTaskID` or `PromotedToSpaceID` on high-signal threads to connect community discussions with active tasks and collaboration spaces.
