import { Component } from '@angular/core';
import { mjBizAppsCommunityCommunitySpaceEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Community Spaces') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunitycommunityspace-form',
    templateUrl: './mjbizappscommunitycommunityspace.form.component.html'
})
export class mjBizAppsCommunityCommunitySpaceFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityCommunitySpaceEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForums', sectionName: 'Forums', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityCommunityMemberProfiles', sectionName: 'Community Member Profiles', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumTopicTags', sectionName: 'Forum Topic Tags', isExpanded: false }
        ]);
    }
}

