import { Component } from '@angular/core';
import { mjBizAppsCommunityForumPostTagEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Post Tags') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumposttag-form',
    templateUrl: './mjbizappscommunityforumposttag.form.component.html'
})
export class mjBizAppsCommunityForumPostTagFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumPostTagEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

