import { Component } from '@angular/core';
import { mjBizAppsCommunityForumPostFlagEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Post Flags') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumpostflag-form',
    templateUrl: './mjbizappscommunityforumpostflag.form.component.html'
})
export class mjBizAppsCommunityForumPostFlagFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumPostFlagEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

