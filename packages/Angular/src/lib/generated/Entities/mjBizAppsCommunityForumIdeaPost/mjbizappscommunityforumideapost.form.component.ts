import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumIdeaPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Idea Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumideapost-form',
    templateUrl: './mjbizappscommunityforumideapost.form.component.html'
})
export class mjBizAppsCommunityForumIdeaPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumIdeaPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumIdeaAllocations', sectionName: 'Forum Idea Allocations', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumIdeaPosts', sectionName: 'Forum Idea Posts', isExpanded: false }
        ]);
    }
}

