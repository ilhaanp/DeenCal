import { NextResponse } from 'next/server';
import { interpretMessage } from '@/lib/intents';
import { findSuggestions } from '@/lib/scheduler';
import { getPrayerTimes } from '@/lib/prayer';

export async function POST(request: Request) {
  const body = await request.json();
  const message: string = body?.message ?? '';
  const date: string = body?.date ?? new Date().toISOString().slice(0, 10);

  const intent = interpretMessage(message);
  const prayerTimes = await getPrayerTimes(date);
  const suggestions = findSuggestions(intent, prayerTimes);

  return NextResponse.json({ intent, suggestions, prayerTimes });
}
