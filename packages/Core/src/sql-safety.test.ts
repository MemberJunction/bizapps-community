import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssertValidUUID, AssertValidUUIDList, EscapeSqlLiteral } from './sql-safety.ts';
import { validateAcceptedAnswerChange, validateIdeaAllocationChange } from './index.ts';

describe('@mj-biz-apps/community-core SQL/UUID safety', () => {
  describe('AssertValidUUID', () => {
    it('returns the trimmed value for a well-formed UUID', () => {
      assert.equal(
        AssertValidUUID('  a1b2c3d4-e5f6-7890-abcd-ef1234567890  ', 'ForumID'),
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      );
    });

    it('throws on a malformed UUID', () => {
      assert.throws(() => AssertValidUUID('not-a-uuid', 'ForumID'), /ForumID is not a valid UUID/);
    });

    it('throws on a SQL quote-injection string instead of silently truncating it', () => {
      assert.throws(
        () => AssertValidUUID("x' OR '1'='1", 'ForumID'),
        /ForumID is not a valid UUID/,
      );
    });

    it('throws on an empty string', () => {
      assert.throws(() => AssertValidUUID('', 'ForumID'), /ForumID is not a valid UUID/);
    });
  });

  describe('AssertValidUUIDList', () => {
    it('validates and trims every entry in a comma-separated list', () => {
      const result = AssertValidUUIDList(
        ' a1b2c3d4-e5f6-7890-abcd-ef1234567890 , b1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'AllowedForumIDs',
      );
      assert.deepEqual(result, [
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
      ]);
    });

    it('drops empty segments from stray commas', () => {
      const result = AssertValidUUIDList('a1b2c3d4-e5f6-7890-abcd-ef1234567890,,', 'AllowedForumIDs');
      assert.equal(result.length, 1);
    });

    it('rejects the whole list if any entry is malformed (SQL injection shaped)', () => {
      assert.throws(
        () => AssertValidUUIDList("a1b2c3d4-e5f6-7890-abcd-ef1234567890,') OR 1=1 --", 'AllowedForumIDs'),
        /AllowedForumIDs\[1\] is not a valid UUID/,
      );
    });
  });

  describe('EscapeSqlLiteral', () => {
    it('doubles embedded single quotes', () => {
      assert.equal(EscapeSqlLiteral("O'Brien"), "O''Brien");
    });

    it('leaves a string with no quotes unchanged', () => {
      assert.equal(EscapeSqlLiteral('plain text'), 'plain text');
    });
  });

  describe('Mixed-case UUID comparisons (CommunityRules uses UUIDsEqual, not ===)', () => {
    it('ValidateAcceptedAnswerChange treats differently-cased UUIDs for the same answer as equal', () => {
      const decision = validateAcceptedAnswerChange({
        answerPostId: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, true);
    });

    it('ValidateIdeaAllocationChange refunds the prior spend even when the idea ID casing differs (SQL Server vs PostgreSQL)', () => {
      const result = validateIdeaAllocationChange({
        mode: 'Quadratic',
        budgetPoints: 100,
        existingAllocations: [{ ideaPostId: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', pointsAllocated: 81 }],
        changedIdeaPostId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        newPointsAllocated: 16,
      });
      assert.equal(result.valid, true);
      assert.equal(result.totalPointsUsed, 16);
    });
  });
});
