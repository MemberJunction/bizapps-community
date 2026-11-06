import { LoadBizAppsCommunityEntities } from '@mj-biz-apps/community-entities';
import { RegisterBuiltInCommunityUIDrivers } from '@mj-biz-apps/community-ng-widgets';

export interface CommunityHubNavItem {
  key: string;
  label: string;
  icon: string;
}

export class CommunityHubResourceModel {
  public GetPrimaryViews(): CommunityHubNavItem[] {
    return [
      { key: 'stream', label: 'Knowledge Stream', icon: 'fa-solid fa-stream' },
      { key: 'forums', label: 'Forums & Channels', icon: 'fa-solid fa-comments' },
      { key: 'qa-canon', label: 'Q&A Canon', icon: 'fa-solid fa-check-double' },
      { key: 'ideation', label: 'Ideation Wallets', icon: 'fa-solid fa-lightbulb' },
      { key: 'playbooks', label: 'Collaborative Docs', icon: 'fa-solid fa-file-signature' },
    ];
  }
}

export function LoadBizAppsCommunityClient(): void {
  LoadBizAppsCommunityEntities();
  RegisterBuiltInCommunityUIDrivers();
}
