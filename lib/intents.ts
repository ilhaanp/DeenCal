export type Intent = 'schedule' | 'ask_free' | 'prayer_window' | 'unknown';

export type ParsedIntent = {
  intent: Intent;
  details: {
    when?: string;
    action?: string;
    target?: string;
    relation?: 'before' | 'after' | 'around';
  };
  raw: string;
  confidence: number;
  notes: string[];
};

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
};

const containsAny = (text: string, phrases: string[]) =>
  phrases.some((phrase) => text.toLowerCase().includes(phrase));

export const interpretMessage = (message: string): ParsedIntent => {
  const raw = message.trim();
  const lower = raw.toLowerCase();
  const notes: string[] = [];

  if (!raw) {
    return {
      intent: 'unknown',
      details: {},
      raw,
      confidence: 0,
      notes: ['Empty message']
    };
  }

  if (containsAny(lower, ['schedule', 'book', 'set up']) && containsAny(lower, ['after', 'before', 'around', 'following'])) {
    const relation: ParsedIntent['details']['relation'] = lower.includes('after')
      ? 'after'
      : lower.includes('before')
        ? 'before'
        : 'around';

    notes.push('Matched scheduling intent with relation to prayer or time anchor.');

    return {
      intent: 'schedule',
      details: {
        when: extractTimeAnchor(lower),
        action: 'schedule',
        target: 'meeting or task',
        relation
      },
      raw,
      confidence: 0.62,
      notes
    };
  }

  if (containsAny(lower, ['free', 'time', 'today', 'later']) && containsAny(lower, ['what', 'do', 'something'])) {
    notes.push('Looking for opportunities during free time.');
    return {
      intent: 'ask_free',
      details: {
        when: extractTimeAnchor(lower)
      },
      raw,
      confidence: 0.55,
      notes
    };
  }

  if (containsAny(lower, ['after asr', 'before maghrib', 'after maghrib', 'before isha'])) {
    const relation: ParsedIntent['details']['relation'] = lower.includes('before') ? 'before' : 'after';
    notes.push('Prayer window referenced directly.');
    return {
      intent: 'prayer_window',
      details: {
        when: extractTimeAnchor(lower),
        relation
      },
      raw,
      confidence: 0.68,
      notes
    };
  }

  notes.push('Fallback intent');
  return {
    intent: 'unknown',
    details: {},
    raw,
    confidence: 0.3,
    notes
  };
};

const extractTimeAnchor = (text: string): string | undefined => {
  const anchors = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'morning', 'evening', 'tonight', 'afternoon'];
  const found = anchors.find((anchor) => text.includes(anchor));
  return found ?? undefined;
};
