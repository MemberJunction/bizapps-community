-- =============================================================================
--  BizApps Community — World Data Model Demo Seeds (PostgreSQL)
--  Contains >= 20 realistic multi-space, multi-forum, multi-archetype records.
--  100% generic MemberJunction domain entities — zero tenant/client branding.
-- =============================================================================

SET search_path TO __mj_BizAppsCommunity, public;

-- Ensure parent spaces exist (resolve active MJ User dynamically for FK-safe OwnerID)
DO $$
DECLARE
    v_admin_user_id UUID;
BEGIN
    SELECT "ID" INTO v_admin_user_id FROM __mj."User" ORDER BY "__mj_CreatedAt" ASC LIMIT 1;
    IF v_admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Cannot seed BizApps Community world data: no User rows exist in __mj."User".';
    END IF;

    INSERT INTO __mj_BizAppsCollaboration."Space" (
        "ID", "SpaceTypeID", "Name", "Description", "OwnerID", "InheritsMembership", "AgentRetrieval", "StartedAt", "AllowParentAssignees"
    ) VALUES
    (
        'C8A18000-4E12-4B8F-9A10-100000000001', '2B2C14A8-CCD6-4835-A1BD-969C54236D57', 'Enterprise Architecture CoP',
        'Community of practice for distributed systems architects and platform engineers.',
        v_admin_user_id, FALSE, 'Included', CURRENT_TIMESTAMP, TRUE
    ),
    (
        'C8A18000-4E12-4B8F-9A10-100000000002', '2B2C14A8-CCD6-4835-A1BD-969C54236D57', 'Product Design Guild',
        'Open collaboration hub for UX researchers, interaction designers, and design system leads.',
        v_admin_user_id, FALSE, 'Included', CURRENT_TIMESTAMP, TRUE
    )
    ON CONFLICT ("ID") DO NOTHING;
END $$;

-- Community Spaces
INSERT INTO __mj_BizAppsCommunity."CommunitySpace" (
    "ID", "Slug", "CommunityKind", "AnonymousReadMode", "AskFirstEnabled", "DefaultDigestCadence"
) VALUES
(
    'C8A18000-4E12-4B8F-9A10-100000000001', 'enterprise-architecture', 'Special Interest Group', 'Teaser Only', TRUE, 'Daily Digest'
),
(
    'C8A18000-4E12-4B8F-9A10-100000000002', 'product-design', 'Association Wide', 'Full Read', TRUE, 'Weekly Digest'
)
ON CONFLICT ("ID") DO NOTHING;

-- Forums
INSERT INTO __mj_BizAppsCommunity."Forum" (
    "ID", "SpaceID", "ForumTypeID", "Slug", "Name", "Description", "VisibilityBand", "PostingPolicy", "Sequence", "Status"
) VALUES
(
    'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A18000-4E12-4B8F-9A10-100000000001', 'C8A17100-4E12-4B8F-9A10-100000000001',
    'architecture-watercooler', 'Architecture Watercooler', 'Open discussions on cloud topologies, zero-trust patterns, and tech radar items.',
    'Shared', 'Open', 10, 'Active'
),
(
    'C8A18100-4E12-4B8F-9A10-100000000002', 'C8A18000-4E12-4B8F-9A10-100000000001', 'C8A17100-4E12-4B8F-9A10-100000000002',
    'patterns-qa', 'Design Patterns & Troubleshooting Q&A', 'Ask questions on state synchronization, caching, and resiliency.',
    'Shared', 'Open', 20, 'Active'
),
(
    'C8A18100-4E12-4B8F-9A10-100000000003', 'C8A18000-4E12-4B8F-9A10-100000000002', 'C8A17100-4E12-4B8F-9A10-100000000003',
    'design-system-ideas', '2027 Design System Roadmap Proposals', 'Submit and vote on design token evolutions and component additions.',
    'Shared', 'Open', 10, 'Active'
),
(
    'C8A18100-4E12-4B8F-9A10-100000000004', 'C8A18000-4E12-4B8F-9A10-100000000001', 'C8A17100-4E12-4B8F-9A10-100000000004',
    'living-standards', 'Living Architecture Standards', 'Collaborative documents and playbooks governed by community consensus.',
    'Shared', 'Open', 30, 'Active'
)
ON CONFLICT ("ID") DO NOTHING;

-- Ideation Campaign
INSERT INTO __mj_BizAppsCommunity."ForumIdeaCampaign" (
    "ID", "DefaultBudgetPoints", "AllocationMode", "MaxPointsPerIdea"
) VALUES
(
    'C8A18100-4E12-4B8F-9A10-100000000003', 100, 'Quadratic', 30
)
ON CONFLICT ("ID") DO NOTHING;

-- Posts
INSERT INTO __mj_BizAppsCommunity."ForumPost" (
    "ID", "ForumID", "PostTypeID", "Title", "Slug", "BodyMarkdown", "VisibilityBand", "Status", "ReplyCount", "ParticipantCount"
) VALUES
(
    'C8A18300-4E12-4B8F-9A10-100000000001', 'C8A18100-4E12-4B8F-9A10-100000000001', 'C8A17200-4E12-4B8F-9A10-100000000001',
    'Decoupled Event Sourcing with Resilient Outbox Patterns', 'decoupled-event-sourcing-with-resilient-outbox-patterns',
    'How are teams handling event order guarantees under dual-region active-active deployments?',
    'Shared', 'Published', 2, 2
),
(
    'C8A18300-4E12-4B8F-9A10-100000000004', 'C8A18100-4E12-4B8F-9A10-100000000002', 'C8A17200-4E12-4B8F-9A10-100000000004',
    'When should read models bypass GraphQL caching in high-concurrency turns?', 'when-should-read-models-bypass-graphql-caching',
    'Under what threshold does client-side memoization cause stale authorization state in fast-turn environments?',
    'Shared', 'Answered', 1, 2
),
(
    'C8A18300-4E12-4B8F-9A10-100000000006', 'C8A18100-4E12-4B8F-9A10-100000000003', 'C8A17200-4E12-4B8F-9A10-100000000006',
    'Semantic Container Queries in Adaptive Grid Cards', 'semantic-container-queries-in-adaptive-grid-cards',
    'Propose adopting CSS container queries across all entity cards so cards respond to container bounds rather than viewport width.',
    'Shared', 'Published', 0, 1
)
ON CONFLICT ("ID") DO NOTHING;
