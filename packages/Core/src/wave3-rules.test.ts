import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateIdeaAllocationChange,
  validateAcceptedAnswerChange,
  validatePollResponse,
  validateInteractiveAttempt,
  resolveBestInteractiveSession,
} from './index.ts';

describe('@mj-biz-apps/community-core Wave 3 domain rules', () => {
  describe('ValidateIdeaAllocationChange (quadratic voting refund-on-revote)', () => {
    it('computes EffectiveVotes = sqrt(PointsAllocated) so PointsSpent = EffectiveVotes^2', () => {
      const result = validateIdeaAllocationChange({
        mode: 'Quadratic',
        budgetPoints: 100,
        existingAllocations: [],
        changedIdeaPostId: 'idea-1',
        newPointsAllocated: 36,
      });
      assert.equal(result.valid, true);
      assert.equal(result.effectiveVotesByIdea['idea-1'], 6);
      assert.equal(Math.pow(result.effectiveVotesByIdea['idea-1'], 2), 36);
    });

    it('refunds the prior spend on the SAME idea before re-checking the budget (revise, not add)', () => {
      // Member already spent 64 points on idea-1 (8 votes); revising to 25 points (5 votes) must not
      // be rejected as 64 + 25 = 89 > budget — the old 64 is refunded first.
      const result = validateIdeaAllocationChange({
        mode: 'Quadratic',
        budgetPoints: 100,
        existingAllocations: [{ ideaPostId: 'idea-1', pointsAllocated: 64 }],
        changedIdeaPostId: 'idea-1',
        newPointsAllocated: 25,
      });
      assert.equal(result.valid, true);
      assert.equal(result.totalPointsUsed, 25);
      assert.equal(result.effectiveVotesByIdea['idea-1'], 5);
    });

    it('still enforces the 100-Point Wallet across OTHER ideas when revising one allocation', () => {
      const result = validateIdeaAllocationChange({
        mode: 'Point Allocation',
        budgetPoints: 100,
        existingAllocations: [{ ideaPostId: 'idea-2', pointsAllocated: 80 }],
        changedIdeaPostId: 'idea-1',
        newPointsAllocated: 30,
      });
      assert.equal(result.valid, false);
      assert.match(result.errorMessage ?? '', /exceed campaign wallet budget/);
    });

    it('treats newPointsAllocated = 0 as a full refund (removes the allocation)', () => {
      const result = validateIdeaAllocationChange({
        mode: 'Quadratic',
        budgetPoints: 100,
        existingAllocations: [{ ideaPostId: 'idea-1', pointsAllocated: 81 }],
        changedIdeaPostId: 'idea-1',
        newPointsAllocated: 0,
      });
      assert.equal(result.valid, true);
      assert.equal(result.totalPointsUsed, 0);
      assert.equal(result.remainingBudgetPoints, 100);
      assert.equal('idea-1' in result.effectiveVotesByIdea, false);
    });

    it('rejects a negative or non-integer newPointsAllocated', () => {
      assert.equal(
        validateIdeaAllocationChange({
          mode: 'Quadratic',
          budgetPoints: 100,
          existingAllocations: [],
          changedIdeaPostId: 'idea-1',
          newPointsAllocated: -5,
        }).valid,
        false,
      );
      assert.equal(
        validateIdeaAllocationChange({
          mode: 'Quadratic',
          budgetPoints: 100,
          existingAllocations: [],
          changedIdeaPostId: 'idea-1',
          newPointsAllocated: 4.5,
        }).valid,
        false,
      );
    });
  });

  describe('ValidateAcceptedAnswerChange (Q&A single accepted-answer invariant)', () => {
    it('allows the question author to accept an answer when none is currently accepted', () => {
      const decision = validateAcceptedAnswerChange({
        answerPostId: 'answer-1',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: null,
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, true);
    });

    it('rejects accepting a different answer while one is already accepted', () => {
      const decision = validateAcceptedAnswerChange({
        answerPostId: 'answer-2',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: 'answer-1',
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, false);
      assert.match(decision.reason ?? '', /already accepted/);
    });

    it('allows re-accepting the SAME answer that is already accepted (idempotent)', () => {
      const decision = validateAcceptedAnswerChange({
        answerPostId: 'answer-1',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: 'answer-1',
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, true);
    });

    it('rejects a non-author attempting to accept or unaccept an answer', () => {
      assert.equal(
        validateAcceptedAnswerChange({
          answerPostId: 'answer-1',
          settingAccepted: true,
          currentlyAcceptedAnswerPostId: null,
          isQuestionAuthor: false,
        }).allowed,
        false,
      );
    });

    it('rejects unaccepting an answer that is not the currently accepted one', () => {
      const decision = validateAcceptedAnswerChange({
        answerPostId: 'answer-2',
        settingAccepted: false,
        currentlyAcceptedAnswerPostId: 'answer-1',
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, false);
    });
  });

  describe('ValidatePollResponse (single/multi-choice enforcement)', () => {
    it('allows a single selection on a single-choice poll', () => {
      const decision = validatePollResponse({
        allowMultipleSelections: false,
        availableOptionIds: ['a', 'b', 'c'],
        selectedOptionIds: ['b'],
      });
      assert.equal(decision.allowed, true);
    });

    it('rejects multiple selections on a single-choice poll', () => {
      const decision = validatePollResponse({
        allowMultipleSelections: false,
        availableOptionIds: ['a', 'b', 'c'],
        selectedOptionIds: ['a', 'b'],
      });
      assert.equal(decision.allowed, false);
      assert.match(decision.reason ?? '', /single selection/);
    });

    it('allows multiple selections on a multi-choice poll', () => {
      const decision = validatePollResponse({
        allowMultipleSelections: true,
        availableOptionIds: ['a', 'b', 'c'],
        selectedOptionIds: ['a', 'c'],
      });
      assert.equal(decision.allowed, true);
    });

    it('rejects an empty selection', () => {
      assert.equal(
        validatePollResponse({ allowMultipleSelections: true, availableOptionIds: ['a'], selectedOptionIds: [] })
          .allowed,
        false,
      );
    });

    it('rejects duplicate selections and options outside the poll', () => {
      assert.equal(
        validatePollResponse({
          allowMultipleSelections: true,
          availableOptionIds: ['a', 'b'],
          selectedOptionIds: ['a', 'a'],
        }).allowed,
        false,
      );
      assert.equal(
        validatePollResponse({
          allowMultipleSelections: true,
          availableOptionIds: ['a', 'b'],
          selectedOptionIds: ['z'],
        }).allowed,
        false,
      );
    });
  });

  describe('ValidateInteractiveAttempt + ResolveBestInteractiveSession (session scoring)', () => {
    it('allows attempts under MaxAttemptsPerMember and rejects at the ceiling', () => {
      const underLimit = validateInteractiveAttempt({
        maxAttemptsPerMember: 3,
        existingSessions: [{ attemptNumber: 1 }, { attemptNumber: 2 }],
      });
      assert.equal(underLimit.allowed, true);
      assert.equal(underLimit.nextAttemptNumber, 3);

      const atLimit = validateInteractiveAttempt({
        maxAttemptsPerMember: 3,
        existingSessions: [{ attemptNumber: 1 }, { attemptNumber: 2 }, { attemptNumber: 3 }],
      });
      assert.equal(atLimit.allowed, false);
    });

    it('allows unlimited attempts when MaxAttemptsPerMember is null', () => {
      const decision = validateInteractiveAttempt({
        maxAttemptsPerMember: null,
        existingSessions: [{ attemptNumber: 1 }, { attemptNumber: 2 }, { attemptNumber: 3 }, { attemptNumber: 4 }],
      });
      assert.equal(decision.allowed, true);
      assert.equal(decision.nextAttemptNumber, 5);
    });

    it('resolves Best Score as the highest Score across attempts', () => {
      const best = resolveBestInteractiveSession({
        scoringMode: 'Best Score',
        sessions: [
          { attemptNumber: 1, score: 40, durationSeconds: 90, completed: true },
          { attemptNumber: 2, score: 85, durationSeconds: 60, completed: true },
          { attemptNumber: 3, score: 70, durationSeconds: 50, completed: true },
        ],
      });
      assert.equal(best?.attemptNumber, 2);
    });

    it('resolves Fastest Time as the quickest COMPLETED attempt, ignoring incomplete ones', () => {
      const best = resolveBestInteractiveSession({
        scoringMode: 'Fastest Time',
        sessions: [
          { attemptNumber: 1, score: null, durationSeconds: 20, completed: false },
          { attemptNumber: 2, score: null, durationSeconds: 55, completed: true },
          { attemptNumber: 3, score: null, durationSeconds: 40, completed: true },
        ],
      });
      assert.equal(best?.attemptNumber, 3);
    });

    it('resolves Streak as the attempt ending the longest unbroken completed run from attempt 1', () => {
      const best = resolveBestInteractiveSession({
        scoringMode: 'Streak',
        sessions: [
          { attemptNumber: 1, score: null, durationSeconds: null, completed: true },
          { attemptNumber: 2, score: null, durationSeconds: null, completed: true },
          { attemptNumber: 3, score: null, durationSeconds: null, completed: false },
          { attemptNumber: 4, score: null, durationSeconds: null, completed: true },
        ],
      });
      // attempt 3 breaks the streak, so attempt 4 (isolated) never extends it
      assert.equal(best?.attemptNumber, 2);
    });

    it('resolves Completion as the first completed attempt', () => {
      const best = resolveBestInteractiveSession({
        scoringMode: 'Completion',
        sessions: [
          { attemptNumber: 1, score: null, durationSeconds: null, completed: false },
          { attemptNumber: 2, score: null, durationSeconds: null, completed: true },
          { attemptNumber: 3, score: null, durationSeconds: null, completed: true },
        ],
      });
      assert.equal(best?.attemptNumber, 2);
    });

    it('resolves None as the most recent attempt by attempt number', () => {
      const best = resolveBestInteractiveSession({
        scoringMode: 'None',
        sessions: [
          { attemptNumber: 1, score: null, durationSeconds: null, completed: true },
          { attemptNumber: 2, score: null, durationSeconds: null, completed: false },
        ],
      });
      assert.equal(best?.attemptNumber, 2);
    });

    it('returns null for an empty session list', () => {
      assert.equal(
        resolveBestInteractiveSession({ scoringMode: 'Best Score', sessions: [] }),
        null,
      );
    });
  });
});
