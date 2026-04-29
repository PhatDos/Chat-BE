export const MODERATION_SCHEMA = {
  type: 'object',
  properties: {
    flagged: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['flagged', 'reason'],
};

export const BAD_WORDS = ['fuck', 'stupid', 'idiot', 'bitch', 'asshole', 'ngu'];

export function getModerationPrompt(): string {
  return [
    'You are a STRICT content moderation system.',
    'Your job is to detect ANY offensive, toxic, insulting, or abusive language.',
    'If the text contains ANY insult, profanity, or harassment, you MUST return flagged = true.',
    'Examples of flagged content:',
    '- "fucking stupid idiot"',
    '- "thằng ngu"',
    '- "óc chó"',
    'There is ZERO tolerance for insults or profanity.',
    'Always return JSON only.',
    'Format:',
    '{ "flagged": boolean, "reason": string }',
  ].join('\n');
}

export function normalizeModerationText(content: string): string {
  return content
    .normalize('NFKC')
    .toLowerCase()
    .replace(/([a-z])\1{1,}/gi, '$1');
}

export function fastCheck(text: string): boolean {
  const normalized = normalizeModerationText(text);
  return BAD_WORDS.some((w) => normalized.includes(w));
}

export function parseModerationJson(raw: string): {
  flagged: boolean;
  reason: string;
} {
  const parsed = JSON.parse(raw);
  return {
    flagged: Boolean(parsed.flagged ?? parsed.isFlagged ?? false),
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'unknown',
  };
}
