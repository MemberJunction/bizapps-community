import { UUIDsEqual } from '@memberjunction/global';
import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';

export interface PostBodyRow {
  ID: string;
  BodyMarkdown: string;
}

/**
 * Pure extraction of the authoritative Question/Answer body markdown out of the 2 Forum Post rows
 * `EpistemicAnswerGradingAction.loadAuthoritativeContent` fetches by ID — kept in this
 * decorator-free companion file (not the `@RegisterClass`-decorated Action file) so it can be
 * unit-tested under `node --experimental-strip-types`, which cannot parse class decorators.
 * Returns null when either expected row is missing from `rows` (a RunView result that came back
 * incomplete/empty).
 */
export function ExtractAuthoritativeContent(
  answerPostId: string,
  questionPostId: string,
  rows: ReadonlyArray<PostBodyRow>,
): { questionBodyMarkdown: string; answerBodyMarkdown: string } | null {
  const answerBodyMarkdown = rows.find((row) => UUIDsEqual(row.ID, answerPostId))?.BodyMarkdown;
  const questionBodyMarkdown = rows.find((row) => UUIDsEqual(row.ID, questionPostId))?.BodyMarkdown;
  if (!answerBodyMarkdown || !questionBodyMarkdown) return null;
  return { questionBodyMarkdown, answerBodyMarkdown };
}

export interface EpistemicGradingInput {
  questionBodyMarkdown: string;
  answerBodyMarkdown: string;
  /** The forum's existing canon/accepted answer, if any — used to detect a conflicting new answer. */
  priorCanonAnswerMarkdown?: string | null;
}

export type EpistemicVerificationStatus = 'AI_Verified' | 'Needs_Human_Review';

export interface EpistemicGradingResult {
  /** 0.000-1.000, rounded to 3 decimal places. */
  confidenceScore: number;
  epistemicStatus: EpistemicAnswerStatus;
  verificationStatus: EpistemicVerificationStatus;
  citationReferences: string[];
  rationaleMarkdown: string;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'to', 'of', 'in', 'on', 'for', 'and', 'or',
  'how', 'do', 'does', 'did', 'what', 'why', 'can', 'we', 'i', 'it', 'this', 'that', 'with', 'at',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Markdown links `[text](url)` and bare `http(s)://` URLs, de-duplicated, in document order. */
function extractCitations(markdown: string): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      refs.push(url);
    }
  };
  for (const m of markdown.matchAll(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)) add(m[1]);
  for (const m of markdown.matchAll(/(?<!\]\()\bhttps?:\/\/[^\s)]+/g)) add(m[0]);
  return refs;
}

/**
 * Deterministic epistemic answer grading: no LLM call required, so this fallback is itself the
 * grading path absent a live AI rubric. Scores confidence from topical overlap with the question,
 * citation density, and answer substance (word count), clamped to [0, 1]. `verificationStatus`
 * becomes `'AI_Verified'` at or above 0.85 confidence; below that it is `'Needs_Human_Review'`.
 */
export function GradeEpistemicAnswer(input: EpistemicGradingInput): EpistemicGradingResult {
  const questionTokens = tokenize(input.questionBodyMarkdown);
  const answerTokens = tokenize(input.answerBodyMarkdown);
  const citationReferences = extractCitations(input.answerBodyMarkdown);

  const topicalOverlap = jaccard(questionTokens, answerTokens);
  const citationScore = Math.min(citationReferences.length * 0.15, 0.3);
  const wordCount = input.answerBodyMarkdown.trim().split(/\s+/).filter(Boolean).length;
  const substanceScore = Math.min(wordCount / 150, 0.3);

  const rawConfidence = topicalOverlap * 0.4 + citationScore + substanceScore;
  const confidenceScore = Number(Math.max(0, Math.min(1, rawConfidence)).toFixed(3));

  const priorCanonTokens = input.priorCanonAnswerMarkdown ? tokenize(input.priorCanonAnswerMarkdown) : null;
  const conflictsWithCanon =
    priorCanonTokens !== null && priorCanonTokens.size > 0 && jaccard(priorCanonTokens, answerTokens) < 0.1;

  let epistemicStatus: EpistemicAnswerStatus;
  if (confidenceScore >= 0.85) {
    epistemicStatus = 'Canon Verified';
  } else if (confidenceScore >= 0.55) {
    epistemicStatus = 'Novel Insight';
  } else if (conflictsWithCanon) {
    epistemicStatus = 'Conflicts With Canon';
  } else {
    epistemicStatus = 'Partially Outdated';
  }

  const verificationStatus: EpistemicVerificationStatus =
    confidenceScore >= 0.85 ? 'AI_Verified' : 'Needs_Human_Review';

  const rationaleMarkdown = [
    `Topical overlap with the question: ${(topicalOverlap * 100).toFixed(0)}%.`,
    `Citations found: ${citationReferences.length}.`,
    `Answer length: ${wordCount} word(s).`,
    conflictsWithCanon ? 'Low overlap with the existing canon answer.' : null,
  ]
    .filter((line): line is string => line !== null)
    .join(' ');

  return { confidenceScore, epistemicStatus, verificationStatus, citationReferences, rationaleMarkdown };
}
