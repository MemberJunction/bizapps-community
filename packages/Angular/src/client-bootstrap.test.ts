import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CommunityHubResourceModel, LoadBizAppsCommunityClient } from './public-api.ts';

describe('@mj-biz-apps/community-ng client bootstrap', () => {
  it('bootstraps client entities and UI drivers and exposes primary hub views', () => {
    LoadBizAppsCommunityClient();
    const model = new CommunityHubResourceModel();
    const views = model.GetPrimaryViews();
    assert.equal(views.length, 5);
    assert.equal(views[0].key, 'stream');
  });
});
