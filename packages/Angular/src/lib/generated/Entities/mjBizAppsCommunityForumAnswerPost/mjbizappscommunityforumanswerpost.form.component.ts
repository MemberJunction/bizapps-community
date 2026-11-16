import { Component } from '@angular/core';
import { mjBizAppsCommunityForumAnswerPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Answer Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumanswerpost-form',
    templateUrl: './mjbizappscommunityforumanswerpost.form.component.html'
})
export class mjBizAppsCommunityForumAnswerPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumAnswerPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

