import { ChangeDetectionStrategy, Component } from '@angular/core';
import { mjBizAppsCommunityForumPostEntity } from '@mj-biz-apps/community-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Community: Forum Posts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'gen-mjbizappscommunityforumpost-form',
    templateUrl: './mjbizappscommunityforumpost.form.component.html'
})
export class mjBizAppsCommunityForumPostFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCommunityForumPostEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCommunityForumPostFlags', sectionName: 'Forum Post Flags', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPostTags', sectionName: 'Forum Post Tags', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumArtifactPosts', sectionName: 'Forum Artifact Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumSubscriptions', sectionName: 'Forum Subscriptions', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumAMAPosts', sectionName: 'Forum AMA Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPostAttachments', sectionName: 'Forum Post Attachments', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumIdeaPosts', sectionName: 'Forum Idea Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumQuestionPostsID', sectionName: 'Forum Question Posts (ID)', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumQuestionPostsAcceptedAnswerPostID', sectionName: 'Forum Question Posts (Accepted Answer Post ID)', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumQuestionPostsAICanonAnswerPostID', sectionName: 'Forum Question Posts (AI Canon Answer Post ID)', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPostReactions', sectionName: 'Forum Post Reactions', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumInteractivePosts', sectionName: 'Forum Interactive Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumAnswerPosts', sectionName: 'Forum Answer Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumFormPosts', sectionName: 'Forum Form Posts', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPostsRootPostID', sectionName: 'Forum Posts (Root Post ID)', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumPostsParentPostID', sectionName: 'Forum Posts (Parent Post ID)', isExpanded: false },
            { sectionKey: 'mJBizAppsCommunityForumCasePosts', sectionName: 'Forum Case Posts', isExpanded: false }
        ]);
    }
}

