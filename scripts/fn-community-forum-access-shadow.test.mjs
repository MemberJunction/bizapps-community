import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EvaluateCommunityForumCanPost } from './fn-community-forum-access-shadow.mjs';

const BASE = {
  forumStatus: 'Active',
  spaceReadOnly: false,
  canContribute: true,
  forumMemberStatus: 'Active',
  canCreateRootPost: true,
  canReply: true,
  postingPolicy: 'Open',
  canConfigureForum: false,
};

describe('fnCommunityForumAccess.CanPost shadow logic', () => {
  it('allows an active member with contribute rights on an open forum', () => {
    assert.equal(EvaluateCommunityForumCanPost(BASE), true);
  });

  it('denies a non-member / non-contributor (CanContribute = 0 from fnCollaborationAccess)', () => {
    assert.equal(EvaluateCommunityForumCanPost({ ...BASE, canContribute: false }), false);
  });

  it('denies posting on a Locked forum regardless of membership', () => {
    assert.equal(EvaluateCommunityForumCanPost({ ...BASE, forumStatus: 'Locked' }), false);
  });

  it('denies posting when the parent Collaboration Space is read-only', () => {
    assert.equal(EvaluateCommunityForumCanPost({ ...BASE, spaceReadOnly: true }), false);
  });

  it('denies a Muted forum member', () => {
    assert.equal(EvaluateCommunityForumCanPost({ ...BASE, forumMemberStatus: 'Muted' }), false);
  });

  it('denies a member whose ForumRoleType grants neither CanCreateRootPost nor CanReply', () => {
    assert.equal(
      EvaluateCommunityForumCanPost({ ...BASE, canCreateRootPost: false, canReply: false }),
      false,
    );
  });

  it('denies posting on a ReadOnly-policy forum unless the member can configure the forum', () => {
    assert.equal(EvaluateCommunityForumCanPost({ ...BASE, postingPolicy: 'ReadOnly' }), false);
    assert.equal(
      EvaluateCommunityForumCanPost({ ...BASE, postingPolicy: 'ReadOnly', canConfigureForum: true }),
      true,
    );
  });
});
