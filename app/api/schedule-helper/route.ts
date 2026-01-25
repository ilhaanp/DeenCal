import { NextResponse } from 'next/server';

interface ConflictCheckRequest {
  startTime: string;
  endTime: string;
  events: any[];
}

interface AlternativeRequest {
  afterTime: string;
  durationMinutes: number;
  events: any[];
}

// Check if a time range overlaps with any protected event
function checkConflict(req: ConflictCheckRequest) {
  const requestStart = new Date(req.startTime).getTime();
  const requestEnd = new Date(req.endTime).getTime();

  for (const event of req.events) {
    if (!event.protected || !event.startTime || !event.endTime) continue;

    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = new Date(event.endTime).getTime();

    const overlaps = requestStart < eventEnd && requestEnd > eventStart;

    if (overlaps) {
      return { hasConflict: true, conflictingEvent: event };
    }
  }

  return { hasConflict: false };
}

// Recursively find next available time after a protected event
function findNextSlot(req: AlternativeRequest): { startTime: string; endTime: string } {
  const suggestedStart = new Date(req.afterTime);
  suggestedStart.setMinutes(suggestedStart.getMinutes() + 5);

  const suggestedEnd = new Date(suggestedStart);
  suggestedEnd.setMinutes(suggestedEnd.getMinutes() + req.durationMinutes);

  const check = checkConflict({
    startTime: suggestedStart.toISOString(),
    endTime: suggestedEnd.toISOString(),
    events: req.events
  });

  if (check.hasConflict && check.conflictingEvent?.endTime) {
    return findNextSlot({
      afterTime: check.conflictingEvent.endTime,
      durationMinutes: req.durationMinutes,
      events: req.events
    });
  }

  return {
    startTime: suggestedStart.toISOString(),
    endTime: suggestedEnd.toISOString()
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, ...data } = body;

  if (action === 'check-conflict') {
    const result = checkConflict(data);
    return NextResponse.json(result);
  }

  if (action === 'find-alternative') {
    const result = findNextSlot(data);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
