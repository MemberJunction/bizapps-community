import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumTopicTagEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Topic Tags') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumtopictag-form',
    templateUrl: './mjbizappscommunityforumtopictag.form.component.html'
})
export class mjBizAppsCommunityForumTopicTagFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumTopicTagEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumPostTags', sectionName: 'Forum Post Tags', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumSubscriptions', sectionName: 'Forum Subscriptions', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumTopicTags', sectionName: 'Forum Topic Tags', isExpanded: false }
        ]);
    }
}

