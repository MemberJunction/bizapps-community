import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumArtifactPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Artifact Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumartifactpost-form',
    templateUrl: './mjbizappscommunityforumartifactpost.form.component.html'
})
export class mjBizAppsCommunityForumArtifactPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumArtifactPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

