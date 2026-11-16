import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumFormPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Form Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumformpost-form',
    templateUrl: './mjbizappscommunityforumformpost.form.component.html'
})
export class mjBizAppsCommunityForumFormPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumFormPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

