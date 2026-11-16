import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumPostAttachmentEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Post Attachments') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumpostattachment-form',
    templateUrl: './mjbizappscommunityforumpostattachment.form.component.html'
})
export class mjBizAppsCommunityForumPostAttachmentFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumPostAttachmentEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

