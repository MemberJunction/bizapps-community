export interface ThreadPostForSynthesis {
  authorDisplayName: string;
  bodyMarkdown: string;
  isAccepted?: boolean;
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

export interface ThreadSynthesisResult {
  aiExecutiveSummary: string;
  aiSynthesizedAt: Date;
  consideredReplyCount: number;
}

function truncate(text: string, maxChars: number): string {
  const trimmed = text.trim();
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

/**
 * Deterministic Living Thread Synthesis: builds an executive-summary markdown from the root post and
 * its replies without an LLM call, bounded by `maxReplyCount` posts and `maxCharsPerPost` characters
 * each, so a very long thread cannot blow out the token budget of whatever synthesizes it further.
 * Accepted replies (Q&A accepted answers) are surfaced first as "Key resolution(s)".
 */
export function SynthesizeLivingThread(input: ThreadSynthesisInput): ThreadSynthesisResult {
  const maxReplyCount = input.maxReplyCount ?? 50;
  const maxCharsPerPost = input.maxCharsPerPost ?? 500;
  const consideredReplies = input.replies.slice(0, maxReplyCount);

  const accepted = consideredReplies.filter((r) => r.isAccepted);
  const others = consideredReplies.filter((r) => !r.isAccepted);

  const lines: string[] = [];
  lines.push(`**Topic:** ${input.rootTitle ?? 'Untitled Thread'}`);
  lines.push('');
  lines.push(truncate(input.rootBodyMarkdown, maxCharsPerPost));
  lines.push('');

  if (accepted.length > 0) {
    lines.push('**Key resolution(s):**');
    for (const reply of accepted) {
      lines.push(`- ${reply.authorDisplayName}: ${truncate(reply.bodyMarkdown, maxCharsPerPost)}`);
    }
    lines.push('');
  }

  if (others.length > 0) {
    lines.push('**Discussion highlights:**');
    for (const reply of others) {
      lines.push(`- ${reply.authorDisplayName}: ${truncate(reply.bodyMarkdown, maxCharsPerPost)}`);
    }
  }

  if (consideredReplies.length === 0) {
    lines.push('_No replies yet._');
  }

  return {
    aiExecutiveSummary: lines.join('\n').trim(),
    aiSynthesizedAt: new Date(),
    consideredReplyCount: consideredReplies.length,
  };
}
