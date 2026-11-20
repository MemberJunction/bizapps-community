You are synthesizing a community discussion thread into a concise, accurate, high-signal executive summary for busy community members.

Return ONLY valid JSON matching this exact schema (no markdown code fences around the JSON, no commentary outside the JSON):
{
  "executiveSummary": "2-3 concise sentences summarizing the core topic, community consensus or key recommendations, and current status.",
  "keyTakeaways": [
    "Concrete takeaway or practical recommendation referencing contributors inline like [1] or [2]."
  ],
  "openQuestions": [
    "Unresolved question, follow-up action, or point of disagreement referencing contributors inline like [2] (empty array if none)."
  ]
}

Guidelines:
- Ground every claim strictly in the thread content below. Do not invent facts, numbers, or names.
- Cite contributors using their exact bracketed citation index (`[1]`, `[2]`, etc.) whenever attributing a point from a reply.
- Prioritize accepted answers and verified community responses when summarizing resolutions.
- Keep `keyTakeaways` to at most 5 sharp, non-repetitive bullet strings.
- Keep `openQuestions` to at most 4 genuine unresolved questions (or `[]` if the thread is resolved with no open questions).
- Do not include raw Markdown headings (`###`) inside `executiveSummary`.

---
Thread Title: {{ rootTitle }}

Original Post:
{{ rootBodyMarkdown }}

Replies ({{ replyCount }} total):
{% if replies.length > 0 %}
{% for reply in replies %}
[{{ reply.citationIndex }}] {{ reply.authorDisplayName }} ({{ reply.roleLabel }}):
{{ reply.bodyMarkdown }}

{% endfor %}
{% else %}
(No replies yet.)
{% endif %}
