import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ParseAllowedForumIDsParam,
  ParseOptionalUUIDParam,
  ParseRequiredUUIDParam,
} from './action-id-params.ts';

const VALID_1 = 'EE9A6630-CEF5-4996-8AB8-1CA68B2FF475';
const VALID_2 = 'FE5FFFC8-2CB4-4DC4-862F-E38DF19FE88D';
const SQL_INJECTION = "' OR '1'='1";

describe('ParseAllowedForumIDsParam — guards RunView ExtraFilter construction', () => {
  it('returns [] for null/empty input (no forums allowed, the safe default)', () => {
    assert.deepEqual(ParseAllowedForumIDsParam(null), []);
    assert.deepEqual(ParseAllowedForumIDsParam(''), []);
  });

  it('parses a valid comma-separated UUID list', () => {
    assert.deepEqual(ParseAllowedForumIDsParam(`${VALID_1},${VALID_2}`), [VALID_1, VALID_2]);
  });

  it('rejects a SQL quote injection payload instead of reaching RunView', () => {
    assert.throws(() => ParseAllowedForumIDsParam(SQL_INJECTION));
    assert.throws(() => ParseAllowedForumIDsParam(`${VALID_1},${SQL_INJECTION}`));
  });

  it('rejects malformed (non-UUID-shaped) entries', () => {
    assert.throws(() => ParseAllowedForumIDsParam('not-a-uuid'));
    assert.throws(() => ParseAllowedForumIDsParam(`${VALID_1},12345`));
  });
});

describe('ParseRequiredUUIDParam — guards single-ID RunView ExtraFilter construction', () => {
  it('parses a valid UUID', () => {
    assert.equal(ParseRequiredUUIDParam(VALID_1, 'RootPostID'), VALID_1);
  });

  it('throws when missing', () => {
    assert.throws(() => ParseRequiredUUIDParam(null, 'RootPostID'));
    assert.throws(() => ParseRequiredUUIDParam('', 'RootPostID'));
  });

  it('rejects a SQL quote injection payload', () => {
    assert.throws(() => ParseRequiredUUIDParam(SQL_INJECTION, 'RootPostID'));
  });

  it('rejects malformed (non-UUID-shaped) input', () => {
    assert.throws(() => ParseRequiredUUIDParam('not-a-uuid', 'RootPostID'));
  });
});

describe('ParseOptionalUUIDParam — guards optional single-ID RunView ExtraFilter construction', () => {
  it('returns null for null/empty input', () => {
    assert.equal(ParseOptionalUUIDParam(null, 'AcceptedAnswerPostID'), null);
    assert.equal(ParseOptionalUUIDParam('', 'AcceptedAnswerPostID'), null);
  });

  it('parses a valid UUID', () => {
    assert.equal(ParseOptionalUUIDParam(VALID_1, 'AcceptedAnswerPostID'), VALID_1);
  });

  it('rejects a SQL quote injection payload', () => {
    assert.throws(() => ParseOptionalUUIDParam(SQL_INJECTION, 'AcceptedAnswerPostID'));
  });

  it('rejects malformed (non-UUID-shaped) input', () => {
    assert.throws(() => ParseOptionalUUIDParam('not-a-uuid', 'AcceptedAnswerPostID'));
  });
});
