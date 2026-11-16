import { Component } from '@angular/core';
import { mjBizAppsCommunityForumSubscriptionEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Subscriptions') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumsubscription-form',
    templateUrl: './mjbizappscommunityforumsubscription.form.component.html'
})
export class mjBizAppsCommunityForumSubscriptionFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumSubscriptionEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

