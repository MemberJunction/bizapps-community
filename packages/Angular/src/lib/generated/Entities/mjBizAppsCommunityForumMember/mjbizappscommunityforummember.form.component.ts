import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumMemberEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Members') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforummember-form',
    templateUrl: './mjbizappscommunityforummember.form.component.html'
})
export class mjBizAppsCommunityForumMemberFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumMemberEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

