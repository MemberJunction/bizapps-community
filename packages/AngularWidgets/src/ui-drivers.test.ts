import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CommunitySpaceUIDriver,
  ForumUIDriverRegistry,
  PostUIDriverRegistry,
  RegisterBuiltInCommunityUIDrivers,
} from './public-api.ts';

describe('@mj-biz-apps/community-ng-widgets UI drivers', () => {
  it('registers and resolves Forum, Post, and CommunitySpace UI drivers', () => {
    RegisterBuiltInCommunityUIDrivers();

    const qaDriver = ForumUIDriverRegistry.Instance.Resolve({
      Code: 'qa-knowledge-base',
      UIDriverClass: 'QAForumUIDriver',
    });
    assert.equal(qaDriver.GetDefaultVocabulary().createActionLabel, 'Ask Question');

    const interactivePostDriver = PostUIDriverRegistry.Instance.Resolve({
      Code: 'interactive-experience',
      UIDriverClass: 'InteractivePostUIDriver',
    });
    assert.equal(interactivePostDriver?.BadgeLabel, 'Interactive Mini-App');

    const spaceDriver = new CommunitySpaceUIDriver();
    const tabs = spaceDriver.GetTabs();
    assert.equal(tabs.length, 3);
    assert.equal(tabs[0].key, 'forums');
  });
});
