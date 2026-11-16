import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumRoleTypeEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Role Types') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumroletype-form',
    templateUrl: './mjbizappscommunityforumroletype.form.component.html'
})
export class mjBizAppsCommunityForumRoleTypeFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumRoleTypeEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumMembers', sectionName: 'Forum Members', isExpanded: false }
        ]);
    }
}

