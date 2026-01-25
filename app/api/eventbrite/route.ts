import { NextResponse } from 'next/server';

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

const islamRegex = /(islam|muslim|masjid|salah|salat|prayer|ramadan|eid|ummah|quran|deen)/i;
const sportsRegex = /(sport|soccer|football|basketball|cricket|run|marathon|tennis|swim|swimming|cycle|cycling|athletic|fitness|gym|track|volleyball)/i;

export async function GET() {
  if (!EVENTBRITE_TOKEN) {
    return NextResponse.json({ events: [], error: 'Eventbrite token not configured' }, { status: 500 });
  }

  try {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    url.searchParams.set('q', 'islam sports');
    url.searchParams.set('sort_by', 'date');
    url.searchParams.set('expand', 'venue');
    url.searchParams.set('include_unavailable_events', 'false');

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`
      },
      // Small timeout via AbortController to avoid hanging
      next: { revalidate: 300 }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ events: [], error: `Eventbrite responded with ${resp.status}: ${text}` }, { status: resp.status });
    }

    const data = await resp.json();
    const events = (data.events ?? [])
      .filter((event: any) => {
        const text = `${event?.name?.text ?? ''} ${event?.summary ?? ''}`.toLowerCase();
        return islamRegex.test(text) && sportsRegex.test(text);
      })
      .slice(0, 10)
      .map((event: any) => {
        const venue = event.venue || {};
        const address = venue.address || {};
        const city = address.city ? `${address.city}${address.region ? ', ' + address.region : ''}` : undefined;
        const location = venue.name || city || address.country || 'Eventbrite';

        return {
          id: event.id,
          title: event.name?.text ?? 'Event',
          startTime: event.start?.utc ?? null,
          endTime: event.end?.utc ?? null,
          url: event.url ?? null,
          location,
          summary: event.summary ?? ''
        };
      });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Eventbrite fetch error', error);
    return NextResponse.json({ events: [], error: 'Failed to reach Eventbrite' }, { status: 500 });
  }
}
