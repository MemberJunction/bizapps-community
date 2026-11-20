import type { EpistemicAnswerStatus } from '@mj-biz-apps/community-core';

export interface ThreadPostForSynthesis {
  postId?: string;
  authorDisplayName: string;
  bodyMarkdown: string;
  isAccepted?: boolean;
  isVerified?: boolean;
  epistemicStatus?: EpistemicAnswerStatus | null;
}

export interface ThreadSynthesisInput {
  rootTitle: string | null;
  rootBodyMarkdown: string;
  replies: ReadonlyArray<ThreadPostForSynthesis>;
  /** Only the first N replies are considered, bounding the synthesis input. Default 50. */
  maxReplyCount?: number;
  /** Each post's body is truncated to this many characters before inclusion. Default 500. */
  maxCharsPerPost?: number;
}

export interface ThreadContributorCitation {
  citationIndex: number;
  authorDisplayName: string;
  postId: string | null;
  roleLabel: string;
}

export interface ThreadSynthesisResult {
  aiExecutiveSummary: string;
  aiSynthesizedAt: Date;
  consideredReplyCount: number;
  keyTakeaways: string[];
  openQuestions: string[];
  contributorCitations: ThreadContributorCitation[];
}

function truncate(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxChars ? normalized : `${normalized.slice(0, maxChars).trimEnd()}…`;
}

function shortPostRef(postId: string | undefined): string | null {
  if (!postId) return null;
  const trimmed = postId.trim();
  if (!trimmed) return null;
  return trimmed.length > 12 ? trimmed.slice(0, 8) : trimmed;
}

function extractSentences(bodyMarkdown: string): string[] {
  return bodyMarkdown
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.replace(/^[-*#>\s]+/, '').trim())
    .filter((s) => s.length > 0);
}

function isOpenQuestionSentence(sentence: string): boolean {
  if (sentence.includes('?')) return true;
  const lower = sentence.toLowerCase();
  return (
    lower.includes('open question') ||
    lower.includes('need to confirm') ||
    lower.includes('still unclear') ||
    lower.includes('remaining question') ||
    /\btbd\b/i.test(sentence)
  );
}

/**
 * Deterministic Living Thread Synthesis: builds a structured executive-summary markdown from the
 * root post and its replies without an LLM call, bounded by `maxReplyCount` posts and
 * `maxCharsPerPost` characters each. Emits Key Resolutions, Key Takeaways, Discussion Highlights,
 * Open Questions, and Contributor Attribution with inline citations `[n]`.
 */
export function SynthesizeLivingThread(input: ThreadSynthesisInput): ThreadSynthesisResult {
  const maxReplyCount = Math.max(0, input.maxReplyCount ?? 50);
  const maxCharsPerPost = Math.max(10, input.maxCharsPerPost ?? 500);
  const compactMode = maxCharsPerPost < 40;
  const consideredReplies = input.replies.slice(0, maxReplyCount);

  const citationsByReplyIndex = new Map<number, number>();
  const contributorCitations: ThreadContributorCitation[] = [];

  consideredReplies.forEach((reply, idx) => {
    const citationIndex = idx + 1;
    citationsByReplyIndex.set(idx, citationIndex);
    const isCanon = reply.isVerified || reply.epistemicStatus === 'Canon Verified';
    const roleLabel = reply.isAccepted
      ? isCanon
        ? 'Accepted & Canon Verified'
        : 'Accepted Answer'
      : isCanon
        ? 'Canon Verified'
        : 'Contributor';
    contributorCitations.push({
      citationIndex,
      authorDisplayName: reply.authorDisplayName,
      postId: reply.postId ?? null,
      roleLabel,
    });
  });

  const acceptedEntries = consideredReplies
    .map((reply, idx) => ({ reply, citationIndex: citationsByReplyIndex.get(idx) ?? idx + 1 }))
    .filter((entry) => Boolean(entry.reply.isAccepted || entry.reply.isVerified || entry.reply.epistemicStatus === 'Canon Verified'));

  const otherEntries = consideredReplies
    .map((reply, idx) => ({ reply, citationIndex: citationsByReplyIndex.get(idx) ?? idx + 1 }))
    .filter((entry) => !entry.reply.isAccepted && !entry.reply.isVerified && entry.reply.epistemicStatus !== 'Canon Verified');

  const keyTakeaways: string[] = [];
  const openQuestions: string[] = [];

  const prioritizedForTakeaways = [...acceptedEntries, ...otherEntries];
  for (const entry of prioritizedForTakeaways) {
    const sentences = extractSentences(entry.reply.bodyMarkdown);
    const nonQuestionSentence = sentences.find((s) => !isOpenQuestionSentence(s));
    const candidateTakeaway = nonQuestionSentence ?? entry.reply.bodyMarkdown;
    if (candidateTakeaway.trim() && keyTakeaways.length < 5) {
      keyTakeaways.push(`${truncate(candidateTakeaway, maxCharsPerPost)} [${entry.citationIndex}]`);
    }
    for (const sentence of sentences) {
      if (isOpenQuestionSentence(sentence) && openQuestions.length < 5) {
        openQuestions.push(`${truncate(sentence, maxCharsPerPost)} [${entry.citationIndex}]`);
      }
    }
  }

  const lines: string[] = [];
  lines.push(`**Topic:** ${truncate(input.rootTitle ?? 'Untitled Thread', maxCharsPerPost + 80)}`);
  lines.push('');
  lines.push(truncate(input.rootBodyMarkdown, maxCharsPerPost));
  lines.push('');

  if (consideredReplies.length === 0) {
    lines.push('_No replies yet._');
  } else {
    if (acceptedEntries.length > 0) {
      lines.push('**Key resolution(s):**');
      for (const entry of acceptedEntries) {
        const citeSuffix = compactMode ? '' : ` [${entry.citationIndex}]`;
        lines.push(`- ${entry.reply.authorDisplayName}: ${truncate(entry.reply.bodyMarkdown, maxCharsPerPost)}${citeSuffix}`);
      }
      lines.push('');
    }

    if (keyTakeaways.length > 0) {
      lines.push('**Key Takeaways:**');
      for (const takeaway of keyTakeaways) {
        lines.push(`- ${takeaway}`);
      }
      lines.push('');
    }

    if (otherEntries.length > 0) {
      lines.push('**Discussion highlights:**');
      for (const entry of otherEntries) {
        const citeSuffix = compactMode ? '' : ` [${entry.citationIndex}]`;
        lines.push(`- ${entry.reply.authorDisplayName}: ${truncate(entry.reply.bodyMarkdown, maxCharsPerPost)}${citeSuffix}`);
      }
      lines.push('');
    }

    lines.push('**Open Questions:**');
    if (openQuestions.length > 0) {
      for (const question of openQuestions) {
        lines.push(`- ${question}`);
      }
    } else {
      lines.push('- None identified.');
    }
    lines.push('');

    lines.push('**Contributor Attribution:**');
    for (const cite of contributorCitations) {
      if (compactMode) {
        lines.push(`- [${cite.citationIndex}] ${cite.authorDisplayName}`);
      } else {
        const ref = shortPostRef(cite.postId ?? undefined);
        const refSuffix = ref ? `, post:${ref}` : '';
        lines.push(`- [${cite.citationIndex}] ${cite.authorDisplayName} (${cite.roleLabel}${refSuffix})`);
      }
    }
  }

  return {
    aiExecutiveSummary: lines.join('\n').trim(),
    aiSynthesizedAt: new Date(),
    consideredReplyCount: consideredReplies.length,
    keyTakeaways,
    openQuestions,
    contributorCitations,
  };
}
