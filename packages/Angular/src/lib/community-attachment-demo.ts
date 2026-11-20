import type { CommunityAttachmentItem } from '@mj-biz-apps/community-core';

const DEMO_SPACE_ARCH_ID = '11111111-1111-4111-8111-000000000101';
const DEMO_SPACE_OPS_ID = '11111111-1111-4111-8111-000000000102';
const DEMO_SPACE_IDEA_ID = '11111111-1111-4111-8111-000000000103';
const DEMO_SPACE_GOV_ID = '11111111-1111-4111-8111-000000000104';

const DEMO_IMAGE_BLUEPRINT_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAIAAACyfKYoAAABuElEQVR4nO3awU0EMRAF0Y2CCEgDkiEJDhsVaZAUZyRm3N02Nb21lvpc+npX+/by/rkPuNvlC57kNvSGdt0v6NePrz/v7f6duqPOs/Vz0FYFoJ+AFisA/Si0WwHoh6AvXynoj6E7rBT0B9BNVgr6Z9B9Vgr6h9CtVgr6a6AfXQHoL4AWKAD9WWiHAtCfgtYoAP06tEkB6BehZQpAvwLtUwD6aWilAtDPQVsVgH4CWqwA9KPQbgWgH4K+fKWgP4busFLQH0A3WSnon0H3WSnoRx9n3QpAfw30oysA/QXQAgWgPwvtUAD6U9AaBaBfhzYpAP0itEwB6FegfQpAPw2tVAD6OWirAtBPQIsVgH4U2q0A9EPQl68U9MfQHVYK+gPoJisF/TPoPisF/ejjrFth/4/29BdACxSA/iy0QwHoT0FrFIB+HdqkAPSL0DIFoF+B9ikA/TS0UgHo56CtCkA/AS1WAPpRaLcC0A9BX75S0B9Dd1gp6A+gm6wU9M+g+6wU9KOPs26F/T/a018ALVAA+rPQDgWgPwWtUQD6dWiTAtAvQssUgH4F2qcA9A+h9/3fbegN7boNDd0Pj2rtdxUeUC0AAAAASUVORK5CYII=';

const DEMO_IMAGE_TOPOLOGY_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAIAAACyfKYoAAABuUlEQVR4nO3asU0EMRBG4euAlDZogSpIaeMi2qBbYiR2PTM2b+feWZr46deX2reXj/d9wN0uX/Akt6E3tOt+Qb9+ff55b9/31B11nq2fg7YqAP0EtFgB6Eeh3QpAPwR9+UpBfwzdYaWgP4BuslLQP4Pus1LQP4RutVLQXwP96ApAfwG0QAHoz0I7FID+FLRGAejXoU0KQL8ILVMA+hVonwLQT0MrFYB+DtqqAPQT0GIFoB+FdisA/RD05SsF/TF0h5WC/gC6yUpB/wy6z0pBP/o461YA+mugH10B6C+AFigA/VlohwLQn4LWKAD9OrRJAegXoWUKQL8C7VMA+mlopQLQz0FbFYB+AlqsAPSj0G4FoB+CvnyloD+G7rBS0B9AN1kp6J9B91kp6EcfZ90K+3+0p78AWqAA9GehHQpAfwpaowD069AmBaBfhJYpAP0KtE8B6KehlQpAPwdtVQD6CWixAtCPQrsVgH4I+vKVgv4YusNKQX8A3WSloH8G3WeloB99nHUr7P/Rnv4CaIEC0J+FdigA/SlojQLQr0ObFIB+EVqmAPQr0D4FoH8Ive//bkNvaNdtaOh+AGrNI84pTtBzAAAAAElFTkSuQmCC';

const DEMO_IMAGE_TELEMETRY_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABICAIAAACyfKYoAAABuElEQVR4nO3awU0EMRAF0Y2HOBBpEABpoM2LNIiGMxIz7m6bmt5aS30ufb2rfXt9ue8D7nb5gie5Db2hXfcL+uPt68/7fP9O3VHn2fo5aKsC0E9AixWAfhTarQD0Q9CXrxT0x9AdVgr6A+gmKwX9M+g+KwX9Q+hWKwX9NdCPrgD0F0ALFID+LLRDAehPQWsUgH4d2qQA9IvQMgWgX4H2KQD9NLRSAejnoK0KQD8BLVYA+lFotwLQD0FfvlLQH0N3WCnoD6CbrBT0z6D7rBT0o4+zbgWgvwb60RWA/gJogQLQn4V2KAD9KWiNAtCvQ5sUgH4RWqYA9CvQPgWgn4ZWKgD9HLRVAegnoMUKQD8K7VYA+iHoy1cK+mPoDisF/QF0k5WC/hl0n5WCfvRx1q2w/0d7+gugBQpAfxbaoQD0p6A1CkC/Dm1SAPpFaJkC0K9A+xSAfhpaqQD0c9BWBaCfgBYrAP0otFsB6IegL18p6I+hO6wU9AfQTVYK+mfQfVYK+tHHWbfC/h/t6S+AFigA/VlohwLQn4LWKAD9OrRJAegXoWUKQL8C7VMA+ofQ+/7vNvSGdt2Ghu4HqJQP78/0MKwAAAAASUVORK5CYII=';

const DEMO_AUDIO_SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

const DEMO_HTML_BENCHMARK_ARTIFACT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; margin: 12px; background: Canvas; color: CanvasText; }
  .panel { border: 1px solid currentColor; border-radius: 8px; padding: 12px; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 12px; }
  .bar-track { flex: 1; height: 8px; border-radius: 999px; background: ButtonFace; overflow: hidden; }
  .bar-fill { height: 100%; background: AccentColor; }
</style>
</head>
<body>
  <div class="panel">
    <strong style="font-size:13px;">Zero-Downtime Cutover Telemetry (p95 Latency)</strong>
    <div class="bar-row"><span>US-East</span><div class="bar-track"><div class="bar-fill" style="width:78%"></div></div><span>42ms</span></div>
    <div class="bar-row"><span>EU-West</span><div class="bar-track"><div class="bar-fill" style="width:86%"></div></div><span>51ms</span></div>
    <div class="bar-row"><span>AP-South</span><div class="bar-track"><div class="bar-fill" style="width:70%"></div></div><span>64ms</span></div>
  </div>
</body>
</html>`;

const DEMO_SVG_TOPOLOGY_ARTIFACT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 120" role="img" aria-label="Dual-dialect schema parity pipeline">
  <rect x="10" y="24" width="110" height="72" rx="10" fill="aliceblue" stroke="steelblue" stroke-width="2" />
  <text x="65" y="58" text-anchor="middle" font-family="system-ui" font-size="12" fill="navy">SQL Server</text>
  <text x="65" y="76" text-anchor="middle" font-family="system-ui" font-size="10" fill="slategray">Flyway V1</text>
  <line x1="120" y1="60" x2="155" y2="60" stroke="steelblue" stroke-width="2" />
  <rect x="155" y="24" width="110" height="72" rx="10" fill="mintcream" stroke="seagreen" stroke-width="2" />
  <text x="210" y="58" text-anchor="middle" font-family="system-ui" font-size="12" fill="darkgreen">Parity Gate</text>
  <text x="210" y="76" text-anchor="middle" font-family="system-ui" font-size="10" fill="slategray">CHECK + FK</text>
  <line x1="265" y1="60" x2="300" y2="60" stroke="seagreen" stroke-width="2" />
  <rect x="300" y="24" width="110" height="72" rx="10" fill="aliceblue" stroke="teal" stroke-width="2" />
  <text x="355" y="58" text-anchor="middle" font-family="system-ui" font-size="12" fill="teal">PostgreSQL</text>
  <text x="355" y="76" text-anchor="middle" font-family="system-ui" font-size="10" fill="slategray">Parity OK</text>
</svg>`;

export const DEMO_SEED_ATTACHMENTS: Readonly<{
  feedRotation: CommunityAttachmentItem[];
  rfcMotion: CommunityAttachmentItem[];
  rfcReply1: CommunityAttachmentItem[];
  wgTelemetry: CommunityAttachmentItem[];
  wgReply1: CommunityAttachmentItem[];
  qaRotation: CommunityAttachmentItem[];
  ideaSigning: CommunityAttachmentItem[];
  livingPlaybook: CommunityAttachmentItem[];
}> = {
  feedRotation: [
    {
      id: 'demo-att-feed-img-1',
      kind: 'image',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'dual-key-sequence.png',
      mimeType: 'image/png',
      sizeBytes: 18420,
      url: DEMO_IMAGE_BLUEPRINT_DATA_URI,
      caption: 'Phase 1: Provision secondary client secret across edge workers',
      sequence: 1,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-feed-img-2',
      kind: 'image',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'lease-drain-metrics.png',
      mimeType: 'image/png',
      sizeBytes: 21540,
      url: DEMO_IMAGE_TOPOLOGY_DATA_URI,
      caption: 'Phase 2: Verify zero active sessions on legacy key before revocation',
      sequence: 2,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-feed-img-3',
      kind: 'image',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'multi-region-rollover.png',
      mimeType: 'image/png',
      sizeBytes: 19800,
      url: DEMO_IMAGE_TELEMETRY_DATA_URI,
      caption: 'Phase 3: Global cutover health across US-East, EU-West, and AP-South',
      sequence: 3,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-feed-art-1',
      kind: 'artifact',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      artifactId: 'aaaa0000-0000-4000-8000-000000000001',
      artifactVersionId: 'aaaa0000-0000-4000-8000-000000000101',
      artifactTypeName: 'HTML',
      artifactName: 'Multi-Region Rollover Latency Report',
      previewContent: DEMO_HTML_BENCHMARK_ARTIFACT,
      contentType: 'text/html',
      versionNumber: 2,
      modality: 'Document',
      collaborationMode: 'Suggest',
      showInlinePreview: true,
      caption: 'Live p95 cutover metrics across active edge regions',
      sequence: 4,
      featureInLibrary: true,
      folder: 'Library',
    },
    {
      id: 'demo-att-feed-audio-1',
      kind: 'audio',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'rollover-walkthrough-part1.wav',
      mimeType: 'audio/wav',
      sizeBytes: 48200,
      url: DEMO_AUDIO_SILENT_WAV_URI,
      durationSeconds: 74,
      caption: 'Part 1: Pre-flight key rotation checklist (Voice Memo)',
      sequence: 5,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-feed-audio-2',
      kind: 'audio',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'rollover-walkthrough-part2.wav',
      mimeType: 'audio/wav',
      sizeBytes: 51900,
      url: DEMO_AUDIO_SILENT_WAV_URI,
      durationSeconds: 88,
      caption: 'Part 2: Revoking legacy keys safely after lease drain',
      sequence: 6,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-feed-file-1',
      kind: 'file',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-feed-1',
      fileName: 'api-key-rotation-runbook.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 412800,
      url: 'https://docs.memberjunction.org/community/api-key-rotation-runbook.pdf',
      caption: 'Printable SOC2 audit runbook',
      sequence: 7,
      featureInLibrary: true,
      folder: 'Library',
    },
  ],
  rfcMotion: [
    {
      id: 'demo-att-rfc-svg-1',
      kind: 'artifact',
      spaceId: DEMO_SPACE_GOV_ID,
      postId: 'commons-rfc-2026-08',
      artifactId: 'aaaa0000-0000-4000-8000-000000000002',
      artifactVersionId: 'aaaa0000-0000-4000-8000-000000000102',
      artifactTypeName: 'SVG',
      artifactName: 'Dual-Dialect Schema Parity Pipeline Diagram',
      previewContent: DEMO_SVG_TOPOLOGY_ARTIFACT,
      contentType: 'image/svg+xml',
      versionNumber: 3,
      modality: 'Presentation',
      collaborationMode: 'Comment Only',
      showInlinePreview: true,
      caption: 'Automated SQL Server and PostgreSQL parity verification gate',
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    },
    {
      id: 'demo-att-rfc-file-1',
      kind: 'file',
      spaceId: DEMO_SPACE_GOV_ID,
      postId: 'commons-rfc-2026-08',
      fileName: 'rfc-2026-08-parity-matrix.csv',
      mimeType: 'text/csv',
      sizeBytes: 24576,
      url: 'https://docs.memberjunction.org/community/rfc-2026-08-parity-matrix.csv',
      caption: 'Entity constraint parity matrix across 25 tables',
      sequence: 2,
      featureInLibrary: true,
      folder: 'Library',
    },
  ],
  rfcReply1: [
    {
      id: 'demo-att-rfc-reply-img-1',
      kind: 'image',
      spaceId: DEMO_SPACE_GOV_ID,
      postId: 'reply-rfc-1',
      fileName: 'pg-staging-parity-pass.png',
      mimeType: 'image/png',
      sizeBytes: 14320,
      url: DEMO_IMAGE_TOPOLOGY_DATA_URI,
      caption: 'PostgreSQL 17 staging parity verification snapshot',
      sequence: 1,
      featureInLibrary: false,
      folder: 'Post Media',
    },
  ],
  wgTelemetry: [
    {
      id: 'demo-att-wg-json-1',
      kind: 'artifact',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'commons-wg-webhook-telemetry',
      artifactId: 'aaaa0000-0000-4000-8000-000000000003',
      artifactVersionId: 'aaaa0000-0000-4000-8000-000000000103',
      artifactTypeName: 'JSON',
      artifactName: 'OpenTelemetry Webhook Retry Span Schema',
      previewContent: JSON.stringify(
        {
          schemaVersion: '1.0.0',
          spanName: 'community.webhook.delivery',
          attributes: ['http.status_code', 'retry.attempt', 'retry.after_ms', 'dlq.routed'],
          slo: { maxRetryWindowMinutes: 15, targetSuccessRatePct: 99.95 },
        },
        null,
        2,
      ),
      contentType: 'application/json',
      versionNumber: 1,
      modality: 'Document',
      collaborationMode: 'Edit',
      showInlinePreview: true,
      caption: 'Standardized span attributes adopted by 5 working group teams',
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    },
  ],
  wgReply1: [
    {
      id: 'demo-att-wg-reply-file-1',
      kind: 'file',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'reply-wg-1',
      fileName: 'prometheus-dlq-alerts.md',
      mimeType: 'text/markdown',
      sizeBytes: 6144,
      url: 'https://docs.memberjunction.org/community/prometheus-dlq-alerts.md',
      caption: 'Prometheus alert thresholds for Milestone 2',
      sequence: 1,
      featureInLibrary: false,
      folder: 'Post Media',
    },
  ],
  qaRotation: [
    {
      id: 'demo-att-qa-md-1',
      kind: 'artifact',
      spaceId: DEMO_SPACE_ARCH_ID,
      postId: 'seed-answer-1',
      artifactId: 'aaaa0000-0000-4000-8000-000000000004',
      artifactVersionId: 'aaaa0000-0000-4000-8000-000000000104',
      artifactTypeName: 'Markdown',
      artifactName: 'Verified Key Rotation Cutover Checklist',
      previewContent:
        '### Verified Cutover Sequence\n- Mint secondary key with `Active` lease\n- Roll configuration to all worker nodes\n- Confirm zero traffic on primary key via telemetry\n- Revoke legacy key cleanly',
      contentType: 'text/markdown',
      versionNumber: 4,
      modality: 'Document',
      collaborationMode: 'Suggest',
      showInlinePreview: true,
      caption: 'Canon-verified checklist linked to this Q&A entry',
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    },
    {
      id: 'demo-att-qa-img-1',
      kind: 'image',
      spaceId: DEMO_SPACE_ARCH_ID,
      postId: 'seed-answer-1',
      fileName: 'dual-key-overlap-window.png',
      mimeType: 'image/png',
      sizeBytes: 15200,
      url: DEMO_IMAGE_BLUEPRINT_DATA_URI,
      caption: 'Overlapping grace window timeline',
      sequence: 2,
      featureInLibrary: false,
      folder: 'Post Media',
    },
  ],
  ideaSigning: [
    {
      id: 'demo-att-idea-img-1',
      kind: 'image',
      spaceId: DEMO_SPACE_IDEA_ID,
      postId: 'seed-idea-1',
      fileName: 'signing-secret-cli-flow.png',
      mimeType: 'image/png',
      sizeBytes: 16400,
      url: DEMO_IMAGE_TELEMETRY_DATA_URI,
      caption: 'Proposed CLI workflow for rotating HMAC webhook secrets',
      sequence: 1,
      featureInLibrary: false,
      folder: 'Post Media',
    },
    {
      id: 'demo-att-idea-file-1',
      kind: 'file',
      spaceId: DEMO_SPACE_IDEA_ID,
      postId: 'seed-idea-1',
      fileName: 'webhook-rotation-rfc-draft.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 84200,
      url: 'https://docs.memberjunction.org/community/webhook-rotation-rfc-draft.docx',
      caption: 'API contract specification draft',
      sequence: 2,
      featureInLibrary: false,
      folder: 'Post Media',
    },
  ],
  livingPlaybook: [
    {
      id: 'demo-att-playbook-art-1',
      kind: 'artifact',
      spaceId: DEMO_SPACE_OPS_ID,
      postId: 'seed-doc-1',
      artifactId: 'aaaa0000-0000-4000-8000-000000000005',
      artifactVersionId: 'aaaa0000-0000-4000-8000-000000000105',
      artifactTypeName: 'Markdown',
      artifactName: 'PKCE Partner Integration Readiness Guide',
      previewContent:
        '### OAuth2 PKCE Verification\n- Register exact redirect URIs per tenant\n- Enforce `S256` code challenge method\n- Enable automatic refresh token rotation alerts',
      contentType: 'text/markdown',
      versionNumber: 2,
      modality: 'Document',
      collaborationMode: 'Edit',
      showInlinePreview: true,
      caption: 'Co-authored living playbook artifact',
      sequence: 1,
      featureInLibrary: true,
      folder: 'Library',
    },
  ],
};
