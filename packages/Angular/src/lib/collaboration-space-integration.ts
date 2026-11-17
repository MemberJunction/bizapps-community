import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Directive,
  Input,
  OnChanges,
  OnInit,
  type SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { RegisterClass, RegisterClassEx } from '@memberjunction/global';
import {
  BaseSpaceOverviewCard,
  BaseSpaceTab,
  BaseSpaceTypeUIDriver,
  overlayDescriptors,
  type SpaceHeaderChipDescriptor,
  type SpaceOverviewCardDescriptor,
  type SpaceTabDescriptor,
  type SpaceUIContext,
} from '@mj-biz-apps/collaboration-ng-widgets';
import { AssertValidUUID } from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumAnswerPostEntity,
} from '@mj-biz-apps/community-entities';
import { CommunityHubResource } from './community-hub-resource.component.ts';
import type { CommunityHubTabKey } from './community-hub-preferences.ts';

@Directive()
abstract class BaseCommunityHubSpaceTab extends BaseSpaceTab {
  public abstract readonly TargetTabKey: CommunityHubTabKey;
}

/**
 * Contributed `Forums & Stream` tab mounted inside Collaboration when viewing a `community` Space.
 * Scopes `CommunityHubResource` directly to Collaboration's active `SpaceId`.
 */
@RegisterClassEx(BaseSpaceTab, {
  key: 'community:forums',
  metadata: {
    spaceTypes: ['community'],
    slot: 'tab',
    sortKey: 15,
    contributionKey: 'forums',
    label: 'Forums & Stream',
    icon: 'fa-solid fa-comments',
  },
})
@Component({
  standalone: true,
  selector: 'mjc-community-forums-space-tab',
  imports: [CommunityHubResource],
  template: `<mjc-community-hub-resource
    [ScopeSpaceId]="SpaceId"
    [InitialTabKey]="TargetTabKey"
    [EmbeddedMode]="true"
    [ShowTabBar]="false"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityForumsSpaceTabComponent extends BaseCommunityHubSpaceTab {
  public readonly TargetTabKey: CommunityHubTabKey = 'knowledge-stream';
}

/**
 * Contributed `Q&A Canon` tab mounted inside Collaboration when viewing a `community` Space.
 */
@RegisterClassEx(BaseSpaceTab, {
  key: 'community:qa-canon',
  metadata: {
    spaceTypes: ['community'],
    slot: 'tab',
    sortKey: 16,
    contributionKey: 'qa-canon',
    label: 'Q&A Canon',
    icon: 'fa-solid fa-check-double',
  },
})
@Component({
  standalone: true,
  selector: 'mjc-community-qa-canon-space-tab',
  imports: [CommunityHubResource],
  template: `<mjc-community-hub-resource
    [ScopeSpaceId]="SpaceId"
    [InitialTabKey]="TargetTabKey"
    [EmbeddedMode]="true"
    [ShowTabBar]="false"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityQaCanonSpaceTabComponent extends BaseCommunityHubSpaceTab {
  public readonly TargetTabKey: CommunityHubTabKey = 'qa-canon-workbench';
}

/**
 * Contributed `Ideation & Wallets` tab mounted inside Collaboration when viewing a `community` Space.
 */
@RegisterClassEx(BaseSpaceTab, {
  key: 'community:ideation',
  metadata: {
    spaceTypes: ['community'],
    slot: 'tab',
    sortKey: 17,
    contributionKey: 'ideation',
    label: 'Ideation & Wallets',
    icon: 'fa-solid fa-lightbulb',
  },
})
@Component({
  standalone: true,
  selector: 'mjc-community-ideation-space-tab',
  imports: [CommunityHubResource],
  template: `<mjc-community-hub-resource
    [ScopeSpaceId]="SpaceId"
    [InitialTabKey]="TargetTabKey"
    [EmbeddedMode]="true"
    [ShowTabBar]="false"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityIdeationSpaceTabComponent extends BaseCommunityHubSpaceTab {
  public readonly TargetTabKey: CommunityHubTabKey = 'quadratic-ideation-wallet';
}

/**
 * Contributed `Playbooks & Mini-Apps` tab mounted inside Collaboration when viewing a `community` Space.
 */
@RegisterClassEx(BaseSpaceTab, {
  key: 'community:playbooks',
  metadata: {
    spaceTypes: ['community'],
    slot: 'tab',
    sortKey: 18,
    contributionKey: 'playbooks',
    label: 'Playbooks & Mini-Apps',
    icon: 'fa-solid fa-file-signature',
  },
})
@Component({
  standalone: true,
  selector: 'mjc-community-playbooks-space-tab',
  imports: [CommunityHubResource],
  template: `<mjc-community-hub-resource
    [ScopeSpaceId]="SpaceId"
    [InitialTabKey]="TargetTabKey"
    [EmbeddedMode]="true"
    [ShowTabBar]="false"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityPlaybooksSpaceTabComponent extends BaseCommunityHubSpaceTab {
  public readonly TargetTabKey: CommunityHubTabKey = 'living-co-authoring';
}

/**
 * Overview card contributed to Collaboration's `Overview` tab (`side: 'Shared'`) when viewing a
 * `community`-typed Space, surfacing live Forum, Canon Verified Q&A, and Proposal metrics.
 */
@RegisterClassEx(BaseSpaceOverviewCard, {
  key: 'community:highlights',
  metadata: {
    spaceTypes: ['community'],
    slot: 'card',
    side: 'Shared',
    sortKey: 15,
    contributionKey: 'community-highlights',
    title: 'Community Activity & Canon',
  },
})
@Component({
  standalone: true,
  selector: 'mjc-community-overview-highlights-card',
  imports: [CommonModule],
  template: `
    <section class="mjc-collab-overview-card" aria-label="Community Activity and Canon">
      <div class="mjc-collab-overview-card__head">
        <div>
          <span class="mjc-collab-overview-card__eyebrow">Community Commons</span>
          <h3 class="mjc-collab-overview-card__title">Forums, Canon &amp; Ideation</h3>
        </div>
        <span class="mjc-collab-overview-card__badge">Shared Community</span>
      </div>
      <div class="mjc-collab-overview-card__metrics">
        <div class="mjc-collab-metric">
          <span class="mjc-collab-metric__value">{{ forumCount }}</span>
          <span class="mjc-collab-metric__label">Active Forums</span>
        </div>
        <div class="mjc-collab-metric">
          <span class="mjc-collab-metric__value">{{ postCount }}</span>
          <span class="mjc-collab-metric__label">Threads</span>
        </div>
        <div class="mjc-collab-metric">
          <span class="mjc-collab-metric__value">{{ canonVerifiedCount }}</span>
          <span class="mjc-collab-metric__label">Canon Verified</span>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .mjc-collab-overview-card {
        border: 1px solid var(--mj-border-default);
        border-radius: var(--mj-radius-md);
        background: var(--mj-bg-surface-card);
        padding: var(--mj-space-4);
        display: flex;
        flex-direction: column;
        gap: var(--mj-space-3);
      }
      .mjc-collab-overview-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--mj-space-2);
      }
      .mjc-collab-overview-card__eyebrow {
        font-size: var(--mj-text-xs);
        font-weight: var(--mj-font-semibold);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--mj-text-muted);
      }
      .mjc-collab-overview-card__title {
        margin: 2px 0 0 0;
        font-size: var(--mj-text-base);
        color: var(--mj-text-primary);
      }
      .mjc-collab-overview-card__badge {
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--mj-badge-info-bg);
        color: var(--mj-badge-info-text);
        font-size: var(--mj-text-xs);
        font-weight: var(--mj-font-semibold);
      }
      .mjc-collab-overview-card__metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--mj-space-2);
      }
      .mjc-collab-metric {
        padding: var(--mj-space-2) var(--mj-space-3);
        border-radius: var(--mj-radius-sm);
        background: var(--mj-bg-surface-sunken);
        display: flex;
        flex-direction: column;
      }
      .mjc-collab-metric__value {
        font-size: var(--mj-text-base);
        font-weight: var(--mj-font-semibold);
        color: var(--mj-text-primary);
      }
      .mjc-collab-metric__label {
        font-size: var(--mj-text-xs);
        color: var(--mj-text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityOverviewHighlightsCardComponent extends BaseSpaceOverviewCard implements OnInit, OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);

  public forumCount = 0;
  public postCount = 0;
  public canonVerifiedCount = 0;

  public ngOnInit(): void {
    void this.loadMetrics();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['SpaceId']) {
      void this.loadMetrics();
    }
  }

  private async loadMetrics(): Promise<void> {
    const rawSpaceId = this.SpaceId?.trim();
    const provider = Metadata.Provider;
    const user: UserInfo | undefined = provider?.CurrentUser;
    if (!rawSpaceId || !provider || !user) {
      return;
    }

    try {
      const safeSpaceId = AssertValidUUID(rawSpaceId, 'SpaceId');
      const rv = new RunView();
      const forumsRes = await rv.RunView<{ ID: string }>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.Forums,
          ExtraFilter: `SpaceID = '${safeSpaceId}'`,
          Fields: ['ID'],
          ResultType: 'simple',
          MaxRows: 100,
        },
        user,
      );
      const forumRows = forumsRes?.Success ? forumsRes.Results ?? [] : [];
      this.forumCount = forumRows.length;

      if (forumRows.length === 0) {
        this.postCount = 0;
        this.canonVerifiedCount = 0;
        this.cdr.markForCheck();
        return;
      }

      const forumInList = forumRows.map((f) => `'${AssertValidUUID(f.ID, 'forumId')}'`).join(',');
      const postsRes = await rv.RunView<{ ID: string }>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
          ExtraFilter: `ForumID IN (${forumInList}) AND Status = 'Published'`,
          Fields: ['ID'],
          ResultType: 'simple',
          MaxRows: 200,
        },
        user,
      );
      const postRows = postsRes?.Success ? postsRes.Results ?? [] : [];
      this.postCount = postRows.length;

      if (postRows.length > 0) {
        const postInList = postRows.map((p) => `'${AssertValidUUID(p.ID, 'postId')}'`).join(',');
        const answersRes = await rv.RunView<{
          ID: string;
          AIEpistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
          IsAcceptedByAuthor: boolean;
        }>(
          {
            EntityName: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            ExtraFilter: `ID IN (${postInList})`,
            Fields: ['ID', 'AIEpistemicStatus', 'IsAcceptedByAuthor'],
            ResultType: 'simple',
            MaxRows: 200,
          },
          user,
        );
        const answers = answersRes?.Success ? answersRes.Results ?? [] : [];
        this.canonVerifiedCount = answers.filter(
          (a) => a.IsAcceptedByAuthor || a.AIEpistemicStatus === 'Canon Verified',
        ).length;
      } else {
        this.canonVerifiedCount = 0;
      }
    } catch {
      // Leave zeros rather than breaking Collaboration Overview on telemetry failure.
    } finally {
      this.cdr.markForCheck();
    }
  }
}

interface CommunityExtensionRulesView {
  AskFirstEnabled?: boolean;
  DefaultDigestCadence?: string;
}

function readCommunityRulesExtension(ctx: SpaceUIContext): CommunityExtensionRulesView {
  const extensions = ctx.rules?.Extensions;
  if (!extensions || typeof extensions !== 'object') {
    return {};
  }
  const entry = extensions['community'];
  if (!entry || typeof entry !== 'object') {
    return {};
  }
  const typed = entry as { AskFirstEnabled?: boolean; DefaultDigestCadence?: string };
  return typed;
}

/**
 * Full Collaboration `SpaceType` UI driver registered under `'CommunitySpaceUIDriver'`
 * (matching `SpaceType.UIDriverClass` in `metadata/space-types/.space-types.json`).
 * Preserves Collaboration's native workspace tabs (`Overview`, `Documents`, `Work`, `Notes`, `Chat`,
 * `People`, `Settings`) while overlaying Community's structured `Forums & Stream`, `Q&A Canon`,
 * `Ideation & Wallets`, and `Playbooks & Mini-Apps` tabs plus the Overview card and header chips.
 */
@RegisterClass(BaseSpaceTypeUIDriver, 'CommunitySpaceUIDriver')
export class CommunityCollaborationSpaceUIDriver extends BaseSpaceTypeUIDriver {
  public override GetTabs(_ctx: SpaceUIContext, defaultTabs: SpaceTabDescriptor[]): SpaceTabDescriptor[] {
    const communityTabs: SpaceTabDescriptor[] = [
      {
        key: 'forums',
        label: 'Forums & Stream',
        icon: 'fa-solid fa-comments',
        sortKey: 15,
        component: CommunityForumsSpaceTabComponent,
      },
      {
        key: 'qa-canon',
        label: 'Q&A Canon',
        icon: 'fa-solid fa-check-double',
        sortKey: 16,
        component: CommunityQaCanonSpaceTabComponent,
      },
      {
        key: 'ideation',
        label: 'Ideation & Wallets',
        icon: 'fa-solid fa-lightbulb',
        sortKey: 17,
        component: CommunityIdeationSpaceTabComponent,
      },
      {
        key: 'playbooks',
        label: 'Playbooks & Mini-Apps',
        icon: 'fa-solid fa-file-signature',
        sortKey: 18,
        component: CommunityPlaybooksSpaceTabComponent,
      },
    ];
    return overlayDescriptors(defaultTabs, communityTabs);
  }

  public override GetOverviewCards(
    _ctx: SpaceUIContext,
    defaultCards: SpaceOverviewCardDescriptor[],
  ): SpaceOverviewCardDescriptor[] {
    return overlayDescriptors(defaultCards, [
      {
        key: 'community-highlights',
        title: 'Community Activity & Canon',
        sortKey: 15,
        side: 'Shared',
        component: CommunityOverviewHighlightsCardComponent,
      },
    ]);
  }

  public override GetHeaderChips(
    ctx: SpaceUIContext,
    defaultChips: SpaceHeaderChipDescriptor[],
  ): SpaceHeaderChipDescriptor[] {
    const communityRules = readCommunityRulesExtension(ctx);
    const chips: SpaceHeaderChipDescriptor[] = [
      ...defaultChips,
      {
        key: 'community-commons',
        label: 'Community Commons',
        icon: 'fa-solid fa-people-roof',
        variant: 'info',
        sortKey: 15,
      },
    ];
    if (communityRules.AskFirstEnabled !== false) {
      chips.push({
        key: 'community-ask-first',
        label: 'Ask-First AI Active',
        icon: 'fa-solid fa-wand-magic-sparkles',
        variant: 'ok',
        sortKey: 16,
      });
    }
    if (communityRules.DefaultDigestCadence) {
      chips.push({
        key: 'community-digest',
        label: communityRules.DefaultDigestCadence,
        icon: 'fa-solid fa-envelope-open-text',
        variant: 'plain',
        sortKey: 17,
      });
    }
    return chips;
  }
}
