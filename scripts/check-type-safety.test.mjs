import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findViolations, checkTree } from './check-type-safety.mjs';

describe('the type-safety gate', () => {
  it('flags `any` and `unknown` in type position', () => {
    assert.equal(findViolations('function f(x: any): void {}', 'a.ts').length, 1);
    assert.equal(findViolations('const x = y as any;', 'a.ts').length, 1);
    assert.equal(findViolations('function f(x: unknown): void {}', 'a.ts').length, 1);
    assert.equal(findViolations('const x = y as unknown as Record<string, unknown>;', 'a.ts').length, 1);
  });

  it('flags BaseEntity-style .Get()/.Set() dynamic field access', () => {
    assert.equal(findViolations("entity.Get('FieldName');", 'a.ts').length, 1);
    assert.equal(findViolations("entity.Set('FieldName', value);", 'a.ts').length, 1);
  });

  it('does not flag the English word "any"/"unknown" in a comment or prose string', () => {
    assert.equal(findViolations('// if any reload happens, rebuild the cache', 'a.ts').length, 0);
    assert.equal(findViolations('/** Whether there are any pending items. */', 'a.ts').length, 0);
    assert.equal(findViolations("const msg = 'any option not in the set is rejected';", 'a.ts').length, 0);
  });

  it('does not flag the reviewed ForumSubtypeDirectory/PostSubtypeDirectory .Get(id) exception', () => {
    assert.equal(findViolations('return ForumSubtypeDirectory.Instance.Get(typeId) ?? null;', 'a.ts').length, 0);
    assert.equal(findViolations('return PostSubtypeDirectory.Instance.Get(typeId) ?? null;', 'a.ts').length, 0);
  });

  it('still flags an UNRELATED class calling .Get()/.Set() even if the line also mentions a directory name in a comment', () => {
    assert.equal(findViolations("someOtherThing.Get('x'); // not ForumSubtypeDirectory", 'a.ts').length, 1);
  });

  it('scans the real repo tree clean', () => {
    const problems = checkTree(['packages']);
    assert.deepEqual(problems, []);
  });
});
