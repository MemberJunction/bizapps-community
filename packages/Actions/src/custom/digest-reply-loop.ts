import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { GetGlobalObjectStore, IsValidUUID } from '@memberjunction/global';
import type { PersonalizedPostScore } from '@mj-biz-apps/community-core';

const EPHEMERAL_SECRET_GLOBAL_KEY = '___COMMUNITY_DIGEST_REPLY_SECRET__';
const DEFAULT_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

export interface DigestReplyTokenPayload {
  /** Schema version. */
  v: 1;
  /** Bound MemberJunction UserID of the digest recipient. */
  u: string;
  /** Bound ForumID of the target thread. */
  f: string;
  /** Bound RootPostID of the target thread. */
  r: string;
  /** Bound ParentPostID being replied to (equals RootPostID for root threads). */
  p: string;
  /** Normalized lowercase email address of the recipient for sender verification. */
  e?: string;
  /** Issued-at Unix epoch seconds. */
  iat: number;
  /** Expires-at Unix epoch seconds. */
  exp: number;
  /** Unique token nonce. */
  n: string;
}

export interface SignDigestReplyTokenInput {
  memberUserId: string;
  forumId: string;
  rootPostId: string;
  parentPostId?: string;
  recipientEmail?: string;
  signingSecret?: string;
  now?: Date;
  ttlSeconds?: number;
}

export type VerifyDigestReplyTokenResult =
  | { valid: true; payload: DigestReplyTokenPayload }
  | {
      valid: false;
      errorCode:
        | 'INVALID_TOKEN_FORMAT'
        | 'INVALID_SIGNATURE'
        | 'TOKEN_EXPIRED'
        | 'INVALID_PAYLOAD'
        | 'SENDER_MISMATCH';
      reason: string;
    };

export interface VerifyDigestReplyTokenOptions {
  signingSecret?: string;
  expectedSenderEmail?: string | null;
  skipSenderBindingCheck?: boolean;
  now?: Date;
}

export interface ParsedInboundEmailReply {
  token: VerifyDigestReplyTokenResult;
  cleanedBody: string;
}

export interface DigestRenderItem {
  ranked: PersonalizedPostScore;
  replyToAddress: string;
  replyToken: string;
}

export interface RenderedPersonalizedDigest {
  subject: string;
  htmlBody: string;
  textBody: string;
  primaryReplyToAddress: string;
  itemCount: number;
}

/**
 * Resolves the HMAC signing secret: explicit override -> `COMMUNITY_DIGEST_REPLY_SECRET` env ->
 * process-wide ephemeral random 32-byte key stored in GlobalObjectStore (never a static hardcoded string).
 */
export function ResolveDigestReplySigningSecret(explicitSecret?: string): string {
  if (explicitSecret && explicitSecret.trim().length > 0) {
    return explicitSecret.trim();
  }
  const envSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
  if (envSecret && envSecret.trim().length > 0) {
    return envSecret.trim();
  }
  const store = GetGlobalObjectStore();
  if (store) {
    const existing = store[EPHEMERAL_SECRET_GLOBAL_KEY];
    if (typeof existing === 'string' && existing.length > 0) {
      return existing;
    }
    const generated = randomBytes(32).toString('base64url');
    store[EPHEMERAL_SECRET_GLOBAL_KEY] = generated;
    return generated;
  }
  return randomBytes(32).toString('base64url');
}

/** Extracts the raw `<payload>.<sig>` token from either a raw token or a `reply+<token>@domain` email address. */
export function ExtractReplyTokenFromAddress(tokenOrAddress: string): string | null {
  const trimmed = tokenOrAddress.trim();
  if (!trimmed) return null;

  // Handle "Display Name <reply+token@domain>" or "<reply+token@domain>"
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : trimmed).trim();

  if (candidate.includes('@')) {
    const atIdx = candidate.indexOf('@');
    const localPart = candidate.slice(0, atIdx);
    const plusIdx = localPart.indexOf('+');
    if (plusIdx < 0) return null;
    const tokenPart = localPart.slice(plusIdx + 1).trim();
    return tokenPart.length > 0 ? tokenPart : null;
  }

  return candidate;
}

/** Builds a `reply+<token>@<domain>` address for a signed digest reply token. */
export function BuildReplyToEmailAddress(token: string, replyDomain: string): string {
  const cleanDomain = replyDomain.trim().replace(/^@+/, '') || 'reply.bizapps.local';
  return `reply+${token}@${cleanDomain}`;
}

/** Signs a member- and thread-bound digest reply token with HMAC-SHA256. */
export function SignDigestReplyToken(input: SignDigestReplyTokenInput): string {
  if (!IsValidUUID(input.memberUserId)) {
    throw new Error('memberUserId must be a valid UUID.');
  }
  if (!IsValidUUID(input.forumId)) {
    throw new Error('forumId must be a valid UUID.');
  }
  if (!IsValidUUID(input.rootPostId)) {
    throw new Error('rootPostId must be a valid UUID.');
  }
  const parentPostId = input.parentPostId ?? input.rootPostId;
  if (!IsValidUUID(parentPostId)) {
    throw new Error('parentPostId must be a valid UUID.');
  }

  const nowEpoch = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const ttl =
    input.ttlSeconds !== undefined && Number.isFinite(input.ttlSeconds) && input.ttlSeconds > 0
      ? Math.floor(input.ttlSeconds)
      : DEFAULT_TOKEN_TTL_SECONDS;

  const payload: DigestReplyTokenPayload = {
    v: 1,
    u: input.memberUserId.trim(),
    f: input.forumId.trim(),
    r: input.rootPostId.trim(),
    p: parentPostId.trim(),
    ...(input.recipientEmail?.trim() ? { e: input.recipientEmail.trim().toLowerCase() } : {}),
    iat: nowEpoch,
    exp: nowEpoch + ttl,
    n: randomBytes(6).toString('base64url'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = ResolveDigestReplySigningSecret(input.signingSecret);
  const sigB64 = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

/** Verifies an HMAC-SHA256 digest reply token or `reply+<token>@...` address, failing closed on any anomaly. */
export function VerifyDigestReplyToken(
  tokenOrAddress: string,
  options?: VerifyDigestReplyTokenOptions,
): VerifyDigestReplyTokenResult {
  const token = ExtractReplyTokenFromAddress(tokenOrAddress);
  if (!token) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN_FORMAT',
      reason: 'Reply token or reply+<token>@domain address is missing or malformed.',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN_FORMAT',
      reason: 'Reply token must contain a base64url payload and signature separated by a dot.',
    };
  }

  const [payloadB64, providedSigB64] = parts;
  const secret = ResolveDigestReplySigningSecret(options?.signingSecret);
  const expectedSigBuf = createHmac('sha256', secret).update(payloadB64).digest();

  let providedSigBuf: Buffer;
  try {
    providedSigBuf = Buffer.from(providedSigB64, 'base64url');
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_SIGNATURE',
      reason: 'Reply token signature is not valid base64url.',
    };
  }

  if (
    providedSigBuf.length !== expectedSigBuf.length ||
    !timingSafeEqual(providedSigBuf, expectedSigBuf)
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_SIGNATURE',
      reason: 'HMAC-SHA256 signature verification failed.',
    };
  }

  let parsed: DigestReplyTokenPayload;
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    parsed = JSON.parse(json) as DigestReplyTokenPayload;
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_PAYLOAD',
      reason: 'Reply token payload could not be parsed as JSON.',
    };
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.v !== 1 ||
    typeof parsed.u !== 'string' ||
    typeof parsed.f !== 'string' ||
    typeof parsed.r !== 'string' ||
    typeof parsed.p !== 'string' ||
    !IsValidUUID(parsed.u) ||
    !IsValidUUID(parsed.f) ||
    !IsValidUUID(parsed.r) ||
    !IsValidUUID(parsed.p) ||
    typeof parsed.iat !== 'number' ||
    typeof parsed.exp !== 'number'
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_PAYLOAD',
      reason: 'Reply token payload is missing required member/thread UUID bindings.',
    };
  }

  const nowEpoch = Math.floor((options?.now ?? new Date()).getTime() / 1000);
  if (nowEpoch > parsed.exp || parsed.iat > nowEpoch + 60) {
    return {
      valid: false,
      errorCode: 'TOKEN_EXPIRED',
      reason: `Reply token expired at epoch ${parsed.exp} (current ${nowEpoch}).`,
    };
  }

  if (!options?.skipSenderBindingCheck && parsed.e) {
    const sender = options?.expectedSenderEmail?.trim().toLowerCase();
    if (!sender || sender !== parsed.e.toLowerCase()) {
      return {
        valid: false,
        errorCode: 'SENDER_MISMATCH',
        reason: 'Inbound sender email does not match the digest recipient bound to this reply token.',
      };
    }
  }

  return { valid: true, payload: parsed };
}

/**
 * Strips quoted email reply history (`On ... wrote:`, Outlook `-----Original Message-----`,
 * `>` quote blocks, signature delimiters `-- `, and mobile footers) from an inbound email body.
 */
export function StripQuotedEmailReply(rawBody: string): string {
  const normalized = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    // Standard RFC 3676 signature separator ("-- " or "--")
    if (line === '-- ' || trimmed === '--') {
      break;
    }

    // Outlook / Exchange quote separator
    if (/^-{3,}\s*Original Message\s*-{3,}$/i.test(trimmed)) {
      break;
    }

    // Outlook header block: "From: ..." followed closely by "Sent:" or "Date:"
    if (/^From:\s+.+/i.test(trimmed) && i + 1 < lines.length && /^(Sent|Date|To):/i.test(lines[i + 1].trim())) {
      break;
    }

    // Gmail / Apple Mail attribution line: "On Mon, Nov 19, 2026 at 10:00 AM ... wrote:"
    if (/^On\s+.+wrote:\s*$/i.test(trimmed)) {
      break;
    }

    // Multi-line wrapped "On ...\n... wrote:" header
    if (
      /^On\s+.+$/i.test(trimmed) &&
      i + 1 < lines.length &&
      /wrote:\s*$/i.test(lines[i + 1].trim())
    ) {
      break;
    }

    // Underscore horizontal separator often inserted before quoted digests
    if (/^_{8,}$/.test(trimmed)) {
      break;
    }

    // Quoted ">" lines
    if (trimmed.startsWith('>')) {
      continue;
    }

    // Mobile client footers
    if (/^(Sent from my (iPhone|iPad|Android)|Get Outlook for (iOS|Android))/i.test(trimmed)) {
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Pure helper combining HMAC-SHA256 reply token verification with email chrome stripping.
 */
export function ParseAndVerifyInboundEmailReply(params: {
  replyToAddressOrToken: string;
  rawBodyText: string;
  senderEmail?: string | null;
  signingSecret?: string;
  skipSenderBindingCheck?: boolean;
  now?: Date;
}): ParsedInboundEmailReply {
  const token = VerifyDigestReplyToken(params.replyToAddressOrToken, {
    signingSecret: params.signingSecret,
    expectedSenderEmail: params.senderEmail,
    skipSenderBindingCheck: params.skipSenderBindingCheck,
    now: params.now,
  });
  const cleanedBody = StripQuotedEmailReply(params.rawBodyText ?? '');
  return { token, cleanedBody };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders responsive HTML and plaintext personalized community digest emails with relevance badges
 * and per-thread HMAC-signed `mailto:reply+<token>@...` reply links.
 */
export function RenderPersonalizedDigestEmail(params: {
  recipientName: string;
  communityName: string;
  items: ReadonlyArray<DigestRenderItem>;
  generatedAt?: Date;
}): RenderedPersonalizedDigest {
  const generatedAt = params.generatedAt ?? new Date();
  const dateLabel = generatedAt.toISOString().slice(0, 10);
  const topItem = params.items[0];
  const primaryReplyToAddress = topItem?.replyToAddress ?? 'noreply@bizapps.local';

  const subject =
    params.items.length > 0
      ? `${params.communityName} Digest (${dateLabel}): ${topItem.ranked.post.title}`
      : `${params.communityName} Digest (${dateLabel})`;

  const textLines: string[] = [
    `${params.communityName} — Personalized Community Digest for ${params.recipientName}`,
    `Date: ${dateLabel}`,
    '',
  ];

  if (params.items.length === 0) {
    textLines.push('No new discussions matched your digest filters in this period.');
  } else {
    params.items.forEach((item, idx) => {
      const p = item.ranked.post;
      textLines.push(`${idx + 1}. ${p.title}`);
      textLines.push(`   Why this matters: ${item.ranked.explanation}`);
      if (p.epistemicStatus) {
        textLines.push(`   Verification: ${p.epistemicStatus}`);
      }
      const excerpt = (p.summaryMarkdown ?? p.bodyMarkdown).replace(/\s+/g, ' ').trim().slice(0, 220);
      textLines.push(`   ${excerpt}`);
      textLines.push(`   Reply directly via email: ${item.replyToAddress}`);
      textLines.push('');
    });
  }

  textLines.push('---');
  textLines.push('Reply directly to any thread link above to post your response into the community.');

  const htmlCards = params.items
    .map((item) => {
      const p = item.ranked.post;
      const excerpt = escapeHtml((p.summaryMarkdown ?? p.bodyMarkdown).replace(/\s+/g, ' ').trim().slice(0, 240));
      const epistemicChip = p.epistemicStatus
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#ecfdf5;color:#047857;margin-left:6px;">${escapeHtml(p.epistemicStatus)}</span>`
        : '';
      const mailtoHref = `mailto:${encodeURIComponent(item.replyToAddress)}?subject=${encodeURIComponent(`Re: ${p.title}`)}`;
      return `
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:14px;background:#ffffff;">
          <div style="font-size:12px;color:#475569;margin-bottom:6px;">
            <strong>${escapeHtml(p.forumName ?? 'Community')}</strong>
            ${epistemicChip}
          </div>
          <h2 style="margin:0 0 8px 0;font-size:16px;line-height:1.35;color:#0f172a;">${escapeHtml(p.title)}</h2>
          <div style="display:inline-block;padding:4px 10px;border-radius:6px;background:#eef2ff;color:#3730a3;font-size:12px;margin-bottom:10px;">
            ${escapeHtml(item.ranked.explanation)}
          </div>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#334155;">${excerpt}</p>
          <div>
            <a href="${mailtoHref}" style="display:inline-block;padding:8px 14px;border-radius:6px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
              Reply via Email
            </a>
          </div>
        </div>
      `;
    })
    .join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="padding:18px 20px;border-radius:12px;background:#0f172a;color:#ffffff;margin-bottom:18px;">
      <div style="font-size:12px;opacity:0.8;text-transform:uppercase;letter-spacing:0.06em;">Personalized Digest · ${escapeHtml(dateLabel)}</div>
      <h1 style="margin:6px 0 4px 0;font-size:20px;">${escapeHtml(params.communityName)}</h1>
      <div style="font-size:13px;opacity:0.9;">Curated for ${escapeHtml(params.recipientName)}</div>
    </div>
    ${htmlCards || '<p style="font-size:14px;color:#475569;">No new discussions matched your digest filters in this period.</p>'}
    <div style="font-size:12px;color:#64748b;text-align:center;margin-top:20px;">
      Reply directly to any thread link above to contribute from your inbox.
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    htmlBody,
    textBody: textLines.join('\n'),
    primaryReplyToAddress,
    itemCount: params.items.length,
  };
}
