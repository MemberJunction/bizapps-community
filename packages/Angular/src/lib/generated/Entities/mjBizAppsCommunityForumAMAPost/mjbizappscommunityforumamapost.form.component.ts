import { Component } from '@angular/core';
import { mjBizAppsCommunityForumAMAPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum AMA Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumamapost-form',
    templateUrl: './mjbizappscommunityforumamapost.form.component.html'
})
export class mjBizAppsCommunityForumAMAPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumAMAPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

