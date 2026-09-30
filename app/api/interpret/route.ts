import { NextResponse } from 'next/server';
import { interpretMessage } from '@/lib/intents';
import type { CommandIntent } from '@/lib/intents';
import { findSuggestions } from '@/lib/scheduler';
import { getPrayerTimes } from '@/lib/prayer';

const extractTitle = (message: string) => {
  const original = message.trim();
  const lower = original.toLowerCase();
  const stopWords = /(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi;
  const timePattern = /\b\d{1,2}(?::\d{2})?\s*(am|pm)?/gi;
  const verbsPattern = /(reschedule|schedule|add|create|book|plan|set up|move|postpone)/gi;
  const filler = /\b(for|on|at|to|a|the|my|our|an|this|that)\b/gi;

  let working = original
    .replace(verbsPattern, '')
    .replace(stopWords, '')
    .replace(timePattern, '')
    .replace(/\bmeeting\b/gi, 'meeting')
    .replace(/\s+/g, ' ');

  working = working.replace(filler, ' ').replace(/\s+/g, ' ').trim();

  if (!working || working.length < 3) {
    // fallback to a simple, purposeful title
    if (lower.includes('meeting')) return 'Meeting';
    if (lower.includes('call')) return 'Call';
    if (lower.includes('coffee')) return 'Coffee meetup';
    return 'Planned event';
  }

  // Capitalize first letter
  return working.charAt(0).toUpperCase() + working.slice(1);
};

const parseEventWindow = (message: string) => {
  const lowerMsg = message.toLowerCase();
  const now = new Date();
  const date = new Date(now);
  let ambiguous = false;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const matchedDayIndex = dayNames.findIndex((d) => lowerMsg.includes(d));

  if (lowerMsg.includes('tomorrow')) {
    date.setDate(date.getDate() + 1);
  } else if (lowerMsg.includes('today')) {
    // keep as is
  } else if (lowerMsg.includes('next week')) {
    date.setDate(date.getDate() + 7);
  } else if (matchedDayIndex !== -1) {
    const currentDay = now.getDay();
    let daysAhead = matchedDayIndex - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    date.setDate(date.getDate() + daysAhead);
  } else {
    ambiguous = true;
  }

  let hour = 14;
  let minute = 0;
  if (lowerMsg.includes('morning')) {
    hour = 9;
  } else if (lowerMsg.includes('afternoon')) {
    hour = 14;
  } else if (lowerMsg.includes('evening')) {
    hour = 18;
  } else if (lowerMsg.includes('night')) {
    hour = 20;
  } else {
    const timeMatch = message.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      else if (meridiem === 'am' && hour === 12) hour = 0;
    }
  }

  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);

  return { startDate, endDate, ambiguous };
};

// Parse user message into structured CommandIntent with ISO timestamps
const parseCommandIntent = (message: string): CommandIntent => {
  // Check for scheduling keywords
  if (/schedule|add|create|book|plan|set up/i.test(message)) {
    const title = extractTitle(message);
    const { startDate, endDate, ambiguous } = parseEventWindow(message);

    return {
      type: 'schedule_event' as const,
      title,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      ambiguous
    };
  }

  // Check for rescheduling keywords
  if (/reschedule|move|change.*time|postpone/i.test(message)) {
    const eventTitle = extractTitle(message);
    const { startDate, endDate } = parseEventWindow(message);

    return {
      type: 'reschedule_event' as const,
      eventTitle,
      newStartTime: startDate.toISOString(),
      newEndTime: endDate.toISOString()
    };
  }
  
  // Default to suggest opportunities
  return {
    type: 'suggest_opportunities' as const
  };
};

export async function POST(request: Request) {
  const body = await request.json();
  const message: string = body?.message ?? '';
  const date: string = body?.date ?? new Date().toISOString().slice(0, 10);

  // Parse into structured intent
  const intent = parseCommandIntent(message);
  
  // Get prayer times for context
  const prayerTimes = await getPrayerTimes(date);

  return NextResponse.json({ intent, prayerTimes });
}
