import { Component } from '@angular/core';
import { mjBizAppsCommunityForumPostReactionEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Post Reactions') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumpostreaction-form',
    templateUrl: './mjbizappscommunityforumpostreaction.form.component.html'
})
export class mjBizAppsCommunityForumPostReactionFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumPostReactionEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

