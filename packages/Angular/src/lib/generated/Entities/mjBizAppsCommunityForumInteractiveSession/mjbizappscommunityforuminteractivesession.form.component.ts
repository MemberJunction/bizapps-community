import { Component } from '@angular/core';
import { mjBizAppsCommunityForumInteractiveSessionEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Interactive Sessions') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforuminteractivesession-form',
    templateUrl: './mjbizappscommunityforuminteractivesession.form.component.html'
})
export class mjBizAppsCommunityForumInteractiveSessionFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumInteractiveSessionEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

