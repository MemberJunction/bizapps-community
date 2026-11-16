import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumIdeaAllocationEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Idea Allocations') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumideaallocation-form',
    templateUrl: './mjbizappscommunityforumideaallocation.form.component.html'
})
export class mjBizAppsCommunityForumIdeaAllocationFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumIdeaAllocationEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

