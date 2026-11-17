import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumCasePostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Case Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumcasepost-form',
    templateUrl: './mjbizappscommunityforumcasepost.form.component.html'
})
export class mjBizAppsCommunityForumCasePostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumCasePostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

