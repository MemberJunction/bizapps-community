import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaveOrFail } from './save-or-fail.ts';
import { ExtractAuthoritativeContent, type PostBodyRow } from './epistemic-answer-grading.ts';

const ANSWER_POST_ID = 'EE9A6630-CEF5-4996-8AB8-1CA68B2FF475';
const QUESTION_POST_ID = 'FE5FFFC8-2CB4-4DC4-862F-E38DF19FE88D';

describe('SaveOrFail — Save() === false failure handling', () => {
  it('returns a SAVE_FAILED action result when Save() returns false', async () => {
    const rejectingEntity = { Save: async () => false };
    const result = await SaveOrFail(rejectingEntity, 'SAVE_FAILED', 'did not persist');
    assert.ok(result);
    assert.equal(result?.Success, false);
    assert.equal(result?.ResultCode, 'SAVE_FAILED');
    assert.equal(result?.Message, 'did not persist');
  });

  it('returns null when Save() returns true', async () => {
    const acceptingEntity = { Save: async () => true };
    const result = await SaveOrFail(acceptingEntity, 'SAVE_FAILED', 'did not persist');
    assert.equal(result, null);
  });
});

describe('ExtractAuthoritativeContent — authoritative Question/Answer markdown loading', () => {
  it('extracts both bodies when both rows are present (authoritative DB content wins)', () => {
    const rows: PostBodyRow[] = [
      { ID: ANSWER_POST_ID, BodyMarkdown: 'The real answer from the database.' },
      { ID: QUESTION_POST_ID, BodyMarkdown: 'The real question from the database.' },
    ];
    const result = ExtractAuthoritativeContent(ANSWER_POST_ID, QUESTION_POST_ID, rows);
    assert.deepEqual(result, {
      questionBodyMarkdown: 'The real question from the database.',
      answerBodyMarkdown: 'The real answer from the database.',
    });
  });

  it('matches rows by UUIDsEqual, not ===, so differently-cased IDs still match', () => {
    const rows: PostBodyRow[] = [
      { ID: ANSWER_POST_ID.toLowerCase(), BodyMarkdown: 'answer' },
      { ID: QUESTION_POST_ID.toLowerCase(), BodyMarkdown: 'question' },
    ];
    const result = ExtractAuthoritativeContent(ANSWER_POST_ID, QUESTION_POST_ID, rows);
    assert.deepEqual(result, { questionBodyMarkdown: 'question', answerBodyMarkdown: 'answer' });
  });

  it('returns null when the answer row is missing (incomplete RunView result)', () => {
    const rows: PostBodyRow[] = [{ ID: QUESTION_POST_ID, BodyMarkdown: 'question' }];
    assert.equal(ExtractAuthoritativeContent(ANSWER_POST_ID, QUESTION_POST_ID, rows), null);
  });

  it('returns null when the question row is missing (incomplete RunView result)', () => {
    const rows: PostBodyRow[] = [{ ID: ANSWER_POST_ID, BodyMarkdown: 'answer' }];
    assert.equal(ExtractAuthoritativeContent(ANSWER_POST_ID, QUESTION_POST_ID, rows), null);
  });

  it('returns null for an empty row set', () => {
    assert.equal(ExtractAuthoritativeContent(ANSWER_POST_ID, QUESTION_POST_ID, []), null);
  });
});
