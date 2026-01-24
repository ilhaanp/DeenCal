import { NextResponse } from 'next/server';
import { getPrayerTimes } from '@/lib/prayer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const times = await getPrayerTimes(date);
  return NextResponse.json({ date, times });
}
