import { Component } from '@angular/core';
import { mjBizAppsCommunityForumIdeaCampaignEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Idea Campaigns') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscommunityforumideacampaign-form',
    templateUrl: './mjbizappscommunityforumideacampaign.form.component.html'
})
export class mjBizAppsCommunityForumIdeaCampaignFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumIdeaCampaignEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

