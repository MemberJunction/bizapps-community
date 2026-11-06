import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLowSignalReply,
  shouldSynthesizeThread,
  computeDigestRelevanceScore,
} from './rules.ts';

describe('BizApps Community core rules', () => {
  it('collapses short acknowledgment replies without attachments as low-signal noise', () => {
    assert.equal(isLowSignalReply({ plainText: '+1', attachmentCount: 0 }), true);
    assert.equal(isLowSignalReply({ plainText: 'Following!', attachmentCount: 0 }), true);
    assert.equal(isLowSignalReply({ plainText: 'Thanks!', attachmentCount: 0 }), true);
    assert.equal(isLowSignalReply({ plainText: 'Thanks!', attachmentCount: 1 }), false);
    assert.equal(
      isLowSignalReply({
        plainText: 'We use a 2-stage intake SOP before opening the 60-day docket.',
        attachmentCount: 0,
      }),
      false,
    );
  });

  it('triggers living thread synthesis on accepted answer or high-signal reply threshold', () => {
    assert.equal(
      shouldSynthesizeThread({
        highSignalReplyCount: 3,
        autoCollapseThreshold: 5,
        hasAcceptedAnswer: false,
      }),
      false,
    );
    assert.equal(
      shouldSynthesizeThread({
        highSignalReplyCount: 5,
        autoCollapseThreshold: 5,
        hasAcceptedAnswer: false,
      }),
      true,
    );
    assert.equal(
      shouldSynthesizeThread({
        highSignalReplyCount: 1,
        autoCollapseThreshold: 5,
        hasAcceptedAnswer: true,
      }),
      true,
    );
  });

  it('computes bounded per-member personalized digest relevance scores', () => {
    const score = computeDigestRelevanceScore({
      tagSimilarity: 0.9,
      peerAffinity: 0.8,
      velocity: 0.7,
      unansweredExpertiseMatch: 1.0,
    });
    assert.equal(score, 0.85);
  });
});
