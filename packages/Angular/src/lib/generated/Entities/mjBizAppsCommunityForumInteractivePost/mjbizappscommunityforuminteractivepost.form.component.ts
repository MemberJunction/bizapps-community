import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumInteractivePostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Interactive Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforuminteractivepost-form',
    templateUrl: './mjbizappscommunityforuminteractivepost.form.component.html'
})
export class mjBizAppsCommunityForumInteractivePostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumInteractivePostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumInteractiveSessions', sectionName: 'Forum Interactive Sessions', isExpanded: false }
        ]);
    }
}

