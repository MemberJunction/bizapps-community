-- =============================================================================
--  BizApps Community — World Data Model Demo Seeds (PostgreSQL)
--  >= 25 realistic records across 3 distinct Collaboration Spaces (Customer
--  Community Portal, Partner & ISV Enablement Network, Internal Engineering
--  Guild), covering every ForumType, every PostType, a verified Q&A canon
--  answer, a Quadratic Ideation Campaign with member allocations, reactions,
--  member reputation profiles, and a moderation report.
--  100% generic MemberJunction domain entities — zero tenant/client branding.
--
--  Post subtypes backed by a cross-app Artifact or BizApps Forms Form
--  (poll-or-form, collaborative-doc/-sheet/-deck, interactive-experience) are
--  seeded as a plain ForumPost of that PostType; their IsA extension row is
--  skipped on a scratch database with no Artifact/Form rows to reference,
--  rather than failing the whole script on an unsatisfiable FK.
-- =============================================================================

SET search_path TO __mj_BizAppsCommunity, public;

DO $$
DECLARE
    v_admin_user_id UUID;
    v_second_user_id UUID;
    v_default_environment_id UUID;
    v_any_artifact_type_id UUID;
    v_trivia_artifact_id UUID := 'C8A18900-4E12-4B8F-9A10-100000000001';
    v_trivia_artifact_version_id UUID := 'C8A18A00-4E12-4B8F-9A10-100000000001';
BEGIN
    SELECT "ID" INTO v_admin_user_id FROM __mj."User" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;
    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Cannot seed BizApps Community world data: no User rows exist in __mj."User".';
    END IF;

    -- A second distinct User, when one exists, backs the Quadratic Ideation campaign's second
    -- backer (ForumIdeaAllocation forbids two allocation rows from the same User on one idea).
    SELECT "ID" INTO v_second_user_id FROM __mj."User" WHERE "ID" <> v_admin_user_id ORDER BY "__mj_CreatedAt" ASC LIMIT 1;

    -- 1. Spaces (Collaboration parent rows)
    INSERT INTO __mj_BizAppsCollaboration."Space" (
        "ID", "SpaceTypeID", "Name", "Description", "OwnerID", "InheritsMembership", "AgentRetrieval", "StartedAt", "AllowParentAssignees"
    ) VALUES
    (
        'C8A18000-4E12-4B8F-9A10-100000000001', '2B2C14A8-CCD6-4835-A1BD-969C54236D57', 'Customer Community Portal',
        'Public-facing hub for product customers to ask questions, share feedback, and learn from each other.',
        v_admin_user_id, FALSE, 'Included', CURRENT_TIMESTAMP, TRUE
    ),
    (
        'C8A18000-4E12-4B8F-9A10-100000000002', '2B2C14A8-CCD6-4835-A1BD-969C54236D57', 'Partner & ISV Enablement Network',
        'Collaboration space for partners and independent software vendors co-building on the platform.',
        v_admin_user_id, FALSE, 'Included', CURRENT_TIMESTAMP, TRUE
    ),
    (
        'C8A18000-4E12-4B8F-9A10-100000000003', '2B2C14A8-CCD6-4835-A1BD-969C54236D57', 'Internal Engineering Guild',
        'Internal community of practice for engineers to run case rounds, AMAs, and knowledge-base Q&A.',
        v_admin_user_id, FALSE, 'Included', CURRENT_TIMESTAMP, TRUE
    )
    ON CONFLICT ("ID") DO NOTHING;

    -- 2. CommunitySpace subtypes
    INSERT INTO "CommunitySpace" (
        "ID", "Slug", "CommunityKind", "AnonymousReadMode", "AskFirstEnabled", "DefaultDigestCadence"
    ) VALUES
    ('C8A18000-4E12-4B8F-9A10-100000000001', 'customer-community-portal', 'Association Wide', 'Full Read', TRUE, 'Daily Digest'),
    ('C8A18000-4E12-4B8F-9A10-100000000002', 'partner-isv-enablement-network', 'Special Interest Group', 'Teaser Only', TRUE, 'Weekly Digest'),
    ('C8A18000-4E12-4B8F-9A10-100000000003', 'internal-engineering-guild', 'Working Group', 'None', TRUE, 'Highlights Only')
    ON CONFLICT ("ID") DO NOTHING;

    -- 3. Forums (one per ForumType, spread across the 3 Spaces)
    INSERT INTO "Forum" (
        "ID", "SpaceID", "ForumTypeID", "Slug", "Name", "Description", "VisibilityBand", "PostingPolicy", "Sequence", "Status"
    ) VALUES
    ('C8A18100-4E12-4B8F-9A10-100000000001', 'C8A18000-4E12-4B8F-9A10-100000000001', 'C8A17100-4E12-4B8F-9A10-100000000001', 'welcome-and-general-discussion', 'Welcome & General Discussion', 'Introduce yourself and chat with other customers.', 'Shared', 'Open', 10, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000002', 'C8A18000-4E12-4B8F-9A10-100000000001', 'C8A17100-4E12-4B8F-9A10-100000000002', 'product-qa', 'Product Q&A', 'Ask product questions and get verified answers.', 'Shared', 'Open', 20, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000003', 'C8A18000-4E12-4B8F-9A10-100000000002', 'C8A17100-4E12-4B8F-9A10-100000000003', 'partner-feature-requests', 'Partner Feature Requests', 'Propose and quadratic-vote on platform features partners need.', 'Shared', 'Open', 10, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000004', 'C8A18000-4E12-4B8F-9A10-100000000002', 'C8A17100-4E12-4B8F-9A10-100000000004', 'partner-integration-playbooks', 'Partner Integration Playbooks', 'Co-authored onboarding and integration playbooks.', 'Shared', 'Open', 20, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000005', 'C8A18000-4E12-4B8F-9A10-100000000003', 'C8A17100-4E12-4B8F-9A10-100000000005', 'incident-case-rounds', 'Incident Case Rounds', 'Structured Situation/Action/Outcome reviews of production incidents.', 'Team', 'Moderated', 10, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000006', 'C8A18000-4E12-4B8F-9A10-100000000003', 'C8A17100-4E12-4B8F-9A10-100000000006', 'engineering-amas', 'Engineering AMAs & Town Halls', 'Scheduled Ask-Me-Anything sessions with engineering leadership.', 'Shared', 'Open', 20, 'Active'),
    ('C8A18100-4E12-4B8F-9A10-100000000007', 'C8A18000-4E12-4B8F-9A10-100000000003', 'C8A17100-4E12-4B8F-9A10-100000000002', 'internal-engineering-qa', 'Internal Engineering Q&A', 'Internal-only knowledge base for engineering questions.', 'Team', 'Open', 30, 'Active')
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumIdeaCampaign" ("ID", "DefaultBudgetPoints", "AllocationMode", "MaxPointsPerIdea")
    VALUES ('C8A18100-4E12-4B8F-9A10-100000000003', 100, 'Quadratic', 40)
    ON CONFLICT ("ID") DO NOTHING;

    -- 4. Topic Tags (one per Space)
    INSERT INTO "ForumTopicTag" ("ID", "SpaceID", "Slug", "Name", "IsOfficial", "PostCount")
    VALUES
    ('C8A18200-4E12-4B8F-9A10-100000000001', 'C8A18000-4E12-4B8F-9A10-100000000001', 'getting-started', 'Getting Started', TRUE, 3),
    ('C8A18200-4E12-4B8F-9A10-100000000002', 'C8A18000-4E12-4B8F-9A10-100000000002', 'integration-api', 'Integration API', TRUE, 5),
    ('C8A18200-4E12-4B8F-9A10-100000000003', 'C8A18000-4E12-4B8F-9A10-100000000003', 'incident-response', 'Incident Response', TRUE, 4)
    ON CONFLICT ("ID") DO NOTHING;

    -- 5. Discussion root + reply + comment
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status", "ReplyCount", "ParticipantCount")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000001', 'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A17200-4E12-4B8F-9A10-100000000001', 'Welcome to the Customer Community Portal!', 'welcome-to-the-customer-community-portal', 'Introduce yourself and let us know what brings you to the community.', 'Shared', 'Published', 2, 3)
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "RootPostID", "ParentPostID", "ReplyDepth", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES
    ('C8A18300-4E12-4B8F-9A10-100000000002', 'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A17200-4E12-4B8F-9A10-100000000002', 'C8A18300-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000001', 1, 'Excited to be here — looking forward to learning from the community!', 'Shared', 'Published'),
    ('C8A18300-4E12-4B8F-9A10-100000000003', 'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A17200-4E12-4B8F-9A10-100000000003', 'C8A18300-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000001', 1, 'Welcome aboard!', 'Shared', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    -- 6. Question + verified canon Answer
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status", "ReplyCount")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000004', 'C8A18100-4E12-4B8F-9A10-100000000002', 'C8A17200-4E12-4B8F-9A10-100000000004', 'How do I rotate my API key without downtime?', 'how-do-i-rotate-my-api-key-without-downtime', 'We need to rotate a production API key but cannot afford a service interruption.', 'Shared', 'Answered', 1)
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumQuestionPost" ("ID", "AcceptedAnswerPostID", "AICanonAnswerPostID", "BountyPoints")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000004', NULL, NULL, 0)
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "RootPostID", "ParentPostID", "ReplyDepth", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000005', 'C8A18100-4E12-4B8F-9A10-100000000002', 'C8A17200-4E12-4B8F-9A10-100000000005', 'C8A18300-4E12-4B8F-9A10-100000000004', 'C8A18300-4E12-4B8F-9A10-100000000004', 1, 'Issue a second key, deploy it alongside the first, cut traffic over, then revoke the old key after the grace period.', 'Shared', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumAnswerPost" ("ID", "QuestionPostID", "IsAcceptedByAuthor", "IsVerifiedByModerator", "AIEpistemicStatus", "AIConfidenceScore")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000005', 'C8A18300-4E12-4B8F-9A10-100000000004', TRUE, TRUE, 'Canon Verified', 0.950)
    ON CONFLICT ("ID") DO NOTHING;

    UPDATE "ForumQuestionPost"
    SET "AcceptedAnswerPostID" = 'C8A18300-4E12-4B8F-9A10-100000000005',
        "AICanonAnswerPostID" = 'C8A18300-4E12-4B8F-9A10-100000000005',
        "ResolvedAt" = CURRENT_TIMESTAMP
    WHERE "ID" = 'C8A18300-4E12-4B8F-9A10-100000000004';

    -- 7. Quadratic Ideation post + member allocation
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000006', 'C8A18100-4E12-4B8F-9A10-100000000003', 'C8A17200-4E12-4B8F-9A10-100000000006', 'Add webhook signing secrets rotation API', 'add-webhook-signing-secrets-rotation-api', 'Partners need a self-service API to rotate webhook signing secrets without opening a support ticket.', 'Shared', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    -- Placeholder aggregates; recomputed below from the ForumIdeaAllocation rows actually
    -- inserted, so this row is always internally consistent rather than a static value that could
    -- drift from how many distinct Users this database actually has.
    INSERT INTO "ForumIdeaPost" ("ID", "IdeaStatus", "TotalPointsAllocated", "EffectiveQuadraticVotes", "UniqueBackerCount")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000006', 'Under Consideration', 0, 0.0, 0)
    ON CONFLICT ("ID") DO NOTHING;

    -- First backer: 36 points -> 6.0 effective quadratic votes (sqrt(36) = 6).
    INSERT INTO "ForumIdeaAllocation" ("ID", "IdeaPostID", "UserID", "PointsAllocated", "QuadraticVotes")
    VALUES ('C8A18400-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000006', v_admin_user_id, 36, 6.0)
    ON CONFLICT ("ID") DO NOTHING;

    -- Second backer: 25 points -> 5.0 effective quadratic votes (sqrt(25) = 5). Requires a second
    -- distinct User; skipped gracefully on a single-user database.
    IF v_second_user_id IS NOT NULL THEN
        INSERT INTO "ForumIdeaAllocation" ("ID", "IdeaPostID", "UserID", "PointsAllocated", "QuadraticVotes")
        VALUES ('C8A18400-4E12-4B8F-9A10-100000000002', 'C8A18300-4E12-4B8F-9A10-100000000006', v_second_user_id, 25, 5.0)
        ON CONFLICT ("ID") DO NOTHING;
    END IF;

    UPDATE "ForumIdeaPost" AS idea_post
    SET "TotalPointsAllocated" = totals.total_points,
        "EffectiveQuadraticVotes" = totals.total_votes,
        "UniqueBackerCount" = totals.backer_count
    FROM (
        SELECT COALESCE(SUM("PointsAllocated"), 0) AS total_points,
               COALESCE(SUM("QuadraticVotes"), 0.0) AS total_votes,
               COUNT(*) AS backer_count
        FROM "ForumIdeaAllocation"
        WHERE "IdeaPostID" = 'C8A18300-4E12-4B8F-9A10-100000000006'
    ) AS totals
    WHERE idea_post."ID" = 'C8A18300-4E12-4B8F-9A10-100000000006';

    -- 8. poll-or-form / collaborative-doc / -sheet / -deck: base ForumPost only — their IsA
    --    extension row needs a cross-app Form/Artifact row this scratch database does not seed.
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES
    ('C8A18300-4E12-4B8F-9A10-100000000007', 'C8A18100-4E12-4B8F-9A10-100000000003', 'C8A17200-4E12-4B8F-9A10-100000000007', 'Which SDK should we prioritize next?', 'which-sdk-should-we-prioritize-next', 'Vote for the SDK you most want to see next.', 'Shared', 'Published'),
    ('C8A18300-4E12-4B8F-9A10-100000000008', 'C8A18100-4E12-4B8F-9A10-100000000004', 'C8A17200-4E12-4B8F-9A10-100000000008', 'OAuth2 Partner Onboarding Playbook', 'oauth2-partner-onboarding-playbook', 'Living playbook for partner OAuth2 onboarding.', 'Shared', 'Published'),
    ('C8A18300-4E12-4B8F-9A10-100000000009', 'C8A18100-4E12-4B8F-9A10-100000000004', 'C8A17200-4E12-4B8F-9A10-100000000009', 'Partner Tier Pricing Matrix', 'partner-tier-pricing-matrix', 'Shared pricing matrix by partner tier.', 'Shared', 'Published'),
    ('C8A18300-4E12-4B8F-9A10-100000000010', 'C8A18100-4E12-4B8F-9A10-100000000004', 'C8A17200-4E12-4B8F-9A10-100000000010', 'ISV Co-Sell Enablement Deck', 'isv-co-sell-enablement-deck', 'Co-sell enablement slides for ISV partners.', 'Shared', 'Published'),
    ('C8A18300-4E12-4B8F-9A10-100000000013', 'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A17200-4E12-4B8F-9A10-100000000013', 'Platform Trivia: Test Your Onboarding Knowledge', 'platform-trivia-onboarding-knowledge', 'Quick trivia mini-game for new customers.', 'Shared', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    -- 8b. ForumInteractivePost IsA row + 2 ForumInteractiveSession attempts. Needs a real Artifact +
    --     ArtifactVersion, which a default Environment and any existing ArtifactType (both part of
    --     MJ's own core baseline) make possible without fabricating IDs; skipped gracefully if a
    --     minimal database has neither, same as the other cross-app subtypes above.
    SELECT "ID" INTO v_default_environment_id FROM __mj."Environment" WHERE "IsDefault" = TRUE LIMIT 1;
    IF v_default_environment_id IS NULL THEN
        SELECT "ID" INTO v_default_environment_id FROM __mj."Environment" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;
    END IF;
    SELECT "ID" INTO v_any_artifact_type_id FROM __mj."ArtifactType" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;

    IF v_default_environment_id IS NOT NULL AND v_any_artifact_type_id IS NOT NULL THEN
        INSERT INTO __mj."Artifact" ("ID", "EnvironmentID", "Name", "Description", "TypeID", "UserID", "Visibility")
        VALUES (v_trivia_artifact_id, v_default_environment_id, 'Platform Trivia Mini-App', 'Interactive onboarding trivia mini-app component.', v_any_artifact_type_id, v_admin_user_id, 'Always')
        ON CONFLICT ("ID") DO NOTHING;

        INSERT INTO __mj."ArtifactVersion" ("ID", "ArtifactID", "VersionNumber", "UserID", "ContentMode", "ForceToolsOnly")
        VALUES (v_trivia_artifact_version_id, v_trivia_artifact_id, 1, v_admin_user_id, 'Text', FALSE)
        ON CONFLICT ("ID") DO NOTHING;

        INSERT INTO "ForumInteractivePost" ("ID", "ComponentArtifactID", "PinnedArtifactVersionID", "ExperienceKind", "ScoringMode", "ShowLeaderboard")
        VALUES ('C8A18300-4E12-4B8F-9A10-100000000013', v_trivia_artifact_id, v_trivia_artifact_version_id, 'Quiz', 'Best Score', TRUE)
        ON CONFLICT ("ID") DO NOTHING;

        -- Attempt 1: 70/100 in 95s. Attempt 2 (same member, retrying): 92/100 in 61s — the better score.
        INSERT INTO "ForumInteractiveSession" ("ID", "InteractivePostID", "ArtifactVersionID", "UserID", "AttemptNumber", "Score", "DurationSeconds", "Completed")
        VALUES
        ('C8A18500-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000013', v_trivia_artifact_version_id, v_admin_user_id, 1, 70, 95, TRUE),
        ('C8A18500-4E12-4B8F-9A10-100000000002', 'C8A18300-4E12-4B8F-9A10-100000000013', v_trivia_artifact_version_id, v_admin_user_id, 2, 92, 61, TRUE)
        ON CONFLICT ("ID") DO NOTHING;
    END IF;

    -- 9. Peer Case Review + Live AMA (full IsA subtype rows; no cross-app FKs)
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000011', 'C8A18100-4E12-4B8F-9A10-100000000005', 'C8A17200-4E12-4B8F-9A10-100000000011', 'Case Review: Regional Failover Delay During Peak Load', 'case-review-regional-failover-delay', 'Structured review of a regional failover delay incident.', 'Team', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumCasePost" ("ID", "SituationMarkdown", "ActionTakenMarkdown", "OutcomeMarkdown", "IsAnonymized")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000011', 'Regional failover took 8 minutes longer than the SLA during a peak-traffic incident.', 'Added pre-warmed standby capacity and tightened health-check intervals.', 'Subsequent failovers completed within SLA.', FALSE)
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000012', 'C8A18100-4E12-4B8F-9A10-100000000006', 'C8A17200-4E12-4B8F-9A10-100000000012', 'Town Hall: Q1 Platform Reliability Roadmap', 'town-hall-q1-platform-reliability-roadmap', 'Live Q&A on the Q1 platform reliability roadmap.', 'Shared', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumAMAPost" ("ID", "HostUserID", "ScheduledStartAt", "ScheduledEndAt", "QuestionsOpenAt", "IsLiveNow")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000012', v_admin_user_id, CURRENT_TIMESTAMP + INTERVAL '7 days', CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '1 hour', CURRENT_TIMESTAMP, FALSE)
    ON CONFLICT ("ID") DO NOTHING;

    -- 10. Internal Engineering Guild Question
    INSERT INTO "ForumPost" ("ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000014', 'C8A18100-4E12-4B8F-9A10-100000000007', 'C8A17200-4E12-4B8F-9A10-100000000004', 'What is our deterministic recovery pattern for multi-agent loops?', 'deterministic-recovery-pattern-multi-agent-loops', 'Looking for the canonical recovery gate pattern used internally.', 'Team', 'Published')
    ON CONFLICT ("ID") DO NOTHING;

    INSERT INTO "ForumQuestionPost" ("ID", "AcceptedAnswerPostID", "AICanonAnswerPostID", "BountyPoints")
    VALUES ('C8A18300-4E12-4B8F-9A10-100000000014', NULL, NULL, 0)
    ON CONFLICT ("ID") DO NOTHING;

    -- 11. Reactions
    INSERT INTO "ForumPostReaction" ("ID", "PostID", "UserID", "ReactionKind")
    VALUES
    ('C8A18600-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000001', v_admin_user_id, 'Upvote'),
    ('C8A18600-4E12-4B8F-9A10-100000000002', 'C8A18300-4E12-4B8F-9A10-100000000005', v_admin_user_id, 'Helpful')
    ON CONFLICT ("ID") DO NOTHING;

    -- 12. Member Reputation Profiles (one per Space)
    INSERT INTO "CommunityMemberProfile" ("ID", "SpaceID", "UserID", "HelpfulAnswerCount", "AcceptedAnswerCount", "ReputationScore")
    VALUES
    ('C8A18700-4E12-4B8F-9A10-100000000001', 'C8A18000-4E12-4B8F-9A10-100000000001', v_admin_user_id, 4, 1, 120),
    ('C8A18700-4E12-4B8F-9A10-100000000002', 'C8A18000-4E12-4B8F-9A10-100000000002', v_admin_user_id, 1, 0, 30),
    ('C8A18700-4E12-4B8F-9A10-100000000003', 'C8A18000-4E12-4B8F-9A10-100000000003', v_admin_user_id, 7, 3, 310)
    ON CONFLICT ("ID") DO NOTHING;

    -- 13. Moderation Report
    INSERT INTO "ForumPostFlag" ("ID", "PostID", "ReportedByUserID", "ReasonCategory", "Status")
    VALUES ('C8A18800-4E12-4B8F-9A10-100000000001', 'C8A18300-4E12-4B8F-9A10-100000000003', v_admin_user_id, 'Off Topic', 'Open')
    ON CONFLICT ("ID") DO NOTHING;
END $$;
