import { Component } from '@angular/core';
import { mjBizAppsCommunityForumTypeEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Types') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumtype-form',
    templateUrl: './mjbizappscommunityforumtype.form.component.html'
})
export class mjBizAppsCommunityForumTypeFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumTypeEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForums', sectionName: 'Forums', isExpanded: false }
        ]);
    }
}

