import { Component } from '@angular/core';
import { mjBizAppsCommunityForumEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forums') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforum-form',
    templateUrl: './mjbizappscommunityforum.form.component.html'
})
export class mjBizAppsCommunityForumFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumMembers', sectionName: 'Forum Members', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityCommunitySpaces', sectionName: 'Community Spaces', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForums', sectionName: 'Forums', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumSubscriptions', sectionName: 'Forum Subscriptions', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumIdeaCampaigns', sectionName: 'Forum Idea Campaigns', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPosts', sectionName: 'Forum Posts', isExpanded: false }
        ]);
    }
}

