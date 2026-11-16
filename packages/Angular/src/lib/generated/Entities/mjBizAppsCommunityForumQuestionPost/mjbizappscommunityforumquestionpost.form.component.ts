import { Component } from '@angular/core';
import { mjBizAppsCommunityForumQuestionPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Question Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumquestionpost-form',
    templateUrl: './mjbizappscommunityforumquestionpost.form.component.html'
})
export class mjBizAppsCommunityForumQuestionPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumQuestionPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumAnswerPosts', sectionName: 'Forum Answer Posts', isExpanded: false }
        ]);
    }
}

