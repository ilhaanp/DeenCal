import { NextResponse } from 'next/server';
import { interpretMessage } from '@/lib/intents';
import type { CommandIntent } from '@/lib/intents';
import { findSuggestions } from '@/lib/scheduler';
import { getPrayerTimes } from '@/lib/prayer';

// Parse user message into structured CommandIntent with ISO timestamps
const parseCommandIntent = (message: string): CommandIntent => {
  const lowerMsg = message.toLowerCase();
  
  // Check for scheduling keywords
  if (/schedule|add|create|book|plan|set up/i.test(message)) {
    // Extract title
    let title = 'Event';
    const titleMatch = message.match(/(?:schedule|add|create|book|plan|set up)\s+(?:a\s+)?(?:meeting\s+)?(?:with\s+)?([^(]+?)(?:\s+(?:on|for|at|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday))?$/i);
    if (titleMatch) {
      title = titleMatch[1].trim().replace(/\s+(?:at|in|during|morning|afternoon|evening|night|\d+(?:am|pm|:).*)?$/i, '').trim();
    }
    
    // Parse date
    let date = new Date();
    if (lowerMsg.includes('tomorrow')) {
      date.setDate(date.getDate() + 1);
    } else {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < dayNames.length; i++) {
        if (lowerMsg.includes(dayNames[i])) {
          const today = new Date();
          const currentDay = today.getDay();
          let daysAhead = i - currentDay;
          if (daysAhead <= 0) daysAhead += 7;
          date = new Date(today);
          date.setDate(date.getDate() + daysAhead);
          break;
        }
      }
    }
    
    // Parse time
    let hour = 14, minute = 0;
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
    
    // Create ISO timestamps (1 hour duration)
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    
    return {
      type: 'schedule_event' as const,
      title,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString()
    };
  }
  
  // Check for rescheduling keywords
  if (/reschedule|move|change.*time|postpone/i.test(message)) {
    return {
      type: 'reschedule_event' as const,
      eventTitle: 'Meeting',
      newStartTime: new Date().toISOString(),
      newEndTime: new Date(Date.now() + 3600000).toISOString()
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
