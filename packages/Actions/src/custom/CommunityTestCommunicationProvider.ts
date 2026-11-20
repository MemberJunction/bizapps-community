import { randomUUID } from 'node:crypto';
import {
  BaseCommunicationProvider,
  type CreateDraftParams,
  type CreateDraftResult,
  type ForwardMessageParams,
  type ForwardMessageResult,
  type GetMessageMessage,
  type GetMessagesParams,
  type GetMessagesResult,
  type MessageResult,
  type ProcessedMessage,
  type ProviderCredentialsBase,
  type ProviderOperation,
  type ReplyToMessageParams,
  type ReplyToMessageResult,
} from '@memberjunction/communication-types';
import { BaseSingleton, RegisterClass } from '@memberjunction/global';

export const COMMUNITY_TEST_EMAIL_DRIVER_NAME = 'Community Test Email Driver';

export interface RecordedOutboxMessage {
  id: string;
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  body: string;
  htmlBody: string;
  headers: Record<string, string>;
  dryRun: boolean;
  recordedAt: string;
  metadata: {
    providerMessageTypeName?: string;
    ccRecipients?: string[];
    bccRecipients?: string[];
  };
}

/**
 * Process-wide singleton in-memory outbox for {@link CommunityTestCommunicationProvider}.
 * Stored via {@link BaseSingleton} so tests and server actions share the same outbox instance.
 */
export class CommunityTestOutbox extends BaseSingleton<CommunityTestOutbox> {
  private readonly _messages: RecordedOutboxMessage[] = [];

  protected constructor() {
    super();
  }

  public static get Instance(): CommunityTestOutbox {
    return super.getInstance<CommunityTestOutbox>();
  }

  public Record(entry: RecordedOutboxMessage): void {
    this._messages.push(entry);
  }

  public List(): RecordedOutboxMessage[] {
    return [...this._messages];
  }

  public FindByRecipient(email: string): RecordedOutboxMessage[] {
    const target = email.trim().toLowerCase();
    return this._messages.filter((m) => m.to.trim().toLowerCase() === target);
  }

  public Clear(): void {
    this._messages.length = 0;
  }
}

function extractReplyToHeader(headers?: Record<string, string>): string | undefined {
  if (!headers) return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.trim().toLowerCase() === 'reply-to' && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * MemberJunction `BaseCommunicationProvider` test driver registered under
 * `'Community Test Email Driver'`. Exercises the full MJ Communications Framework pipeline
 * (`CommunicationEngine.Instance.SendSingleMessage` / `ProcessedMessageServer`) while recording
 * every outbound email into {@link CommunityTestOutbox} with zero external SMTP/HTTP calls.
 */
@RegisterClass(BaseCommunicationProvider, COMMUNITY_TEST_EMAIL_DRIVER_NAME)
export class CommunityTestCommunicationProvider extends BaseCommunicationProvider {
  protected override get ProviderName(): string {
    return COMMUNITY_TEST_EMAIL_DRIVER_NAME;
  }

  public override getSupportedOperations(): ProviderOperation[] {
    return ['SendSingleMessage', 'GetMessages', 'ForwardMessage', 'ReplyToMessage', 'CreateDraft'];
  }

  public static GetSentMessages(): RecordedOutboxMessage[] {
    return CommunityTestOutbox.Instance.List();
  }

  public static ClearSentMessages(): void {
    CommunityTestOutbox.Instance.Clear();
  }

  public async SendSingleMessage(
    message: ProcessedMessage,
    _credentials?: ProviderCredentialsBase,
  ): Promise<MessageResult> {
    const dryRun = Boolean(message.DryRun);
    if (!message.To?.trim() || !message.From?.trim()) {
      return {
        Success: false,
        Error: 'Recipient (To) and sender (From) addresses are required.',
        Message: message,
        DryRun: dryRun,
      };
    }

    const headers: Record<string, string> = message.Headers ? { ...message.Headers } : {};
    const subject = message.ProcessedSubject ?? message.Subject ?? '';
    const body = message.ProcessedBody ?? message.Body ?? '';
    const htmlBody = message.ProcessedHTMLBody ?? message.HTMLBody ?? '';

    const recorded: RecordedOutboxMessage = {
      id: `test-msg-${randomUUID()}`,
      to: message.To.trim(),
      from: message.From.trim(),
      fromName: message.FromName,
      replyTo: extractReplyToHeader(headers),
      subject,
      body,
      htmlBody,
      headers,
      dryRun,
      recordedAt: new Date().toISOString(),
      metadata: {
        providerMessageTypeName: message.MessageType?.Name,
        ccRecipients: message.CCRecipients ? [...message.CCRecipients] : undefined,
        bccRecipients: message.BCCRecipients ? [...message.BCCRecipients] : undefined,
      },
    };

    CommunityTestOutbox.Instance.Record(recorded);

    return {
      Success: true,
      Error: '',
      Message: message,
      DryRun: dryRun,
    };
  }

  public async GetMessages(
    params: GetMessagesParams,
    _credentials?: ProviderCredentialsBase,
  ): Promise<GetMessagesResult> {
    const all = params.Identifier
      ? CommunityTestOutbox.Instance.FindByRecipient(params.Identifier)
      : CommunityTestOutbox.Instance.List();

    const limit = Math.max(0, params.NumMessages);
    const sliced = all.slice(-limit);
    const messages: GetMessageMessage[] = sliced.map((entry) => ({
      From: entry.from,
      To: entry.to,
      Direction: 'Outbound',
      Body: entry.body,
      ReplyTo: entry.replyTo ? [entry.replyTo] : undefined,
      Subject: entry.subject,
      ExternalSystemRecordID: entry.id,
      SentAt: new Date(entry.recordedAt),
    }));

    return {
      Success: true,
      Messages: messages,
    };
  }

  public async ForwardMessage(
    params: ForwardMessageParams,
    _credentials?: ProviderCredentialsBase,
  ): Promise<ForwardMessageResult> {
    return {
      Success: params.ToRecipients.length > 0 && params.MessageID.trim().length > 0,
      ErrorMessage: params.ToRecipients.length > 0 ? undefined : 'ToRecipients is required.',
    };
  }

  public async ReplyToMessage(
    params: ReplyToMessageParams,
    credentials?: ProviderCredentialsBase,
  ): Promise<ReplyToMessageResult> {
    const sendResult = await this.SendSingleMessage(params.Message, credentials);
    return {
      Success: sendResult.Success,
      ErrorMessage: sendResult.Error || undefined,
    };
  }

  public async CreateDraft(
    params: CreateDraftParams,
    _credentials?: ProviderCredentialsBase,
  ): Promise<CreateDraftResult> {
    return {
      Success: Boolean(params.Message),
      DraftID: `test-draft-${randomUUID()}`,
    };
  }
}
