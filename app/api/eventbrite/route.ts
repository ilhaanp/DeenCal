import { NextResponse } from 'next/server';

// Server-only token — never exposed to client
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;

// Regex patterns for categorizing events
// Islamic community events (halaqas, masjid activities, Ramadan, Eid, etc.)
const islamicRegex = /(islam|muslim|masjid|mosque|salah|salat|prayer|ramadan|eid|ummah|quran|deen|halaqa|volunteer|charity|islamic)/i;
// Sports & fitness events
const sportsRegex = /(sport|soccer|football|basketball|cricket|run|marathon|tennis|swim|swimming|cycle|cycling|athletic|fitness|gym|track|volleyball|yoga|rugby|badminton|table.?tennis)/i;

/**
 * GET /api/eventbrite
 * 
 * Fetches nearby community and sports events from Eventbrite API.
 * Returns calendar-ready events with categories.
 * 
 * Query parameters:
 *   - city: location to search (default: Toronto)
 *   - radius: search radius in km (default: 50)
 */
export async function GET(request: Request) {
  // Fail fast if token is missing
  if (!EVENTBRITE_TOKEN) {
    return NextResponse.json(
      { events: [], error: 'Eventbrite token not configured' },
      { status: 500 }
    );
  }

  try {
    // Parse query params (allow client to specify location)
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city') || 'Toronto';
    const radius = searchParams.get('radius') || '50km';

    // Build Eventbrite search URL
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    
    // Combined search query: include both Islamic and sports keywords
    // Eventbrite pre-filters on the server side using these keywords
    url.searchParams.set('q', 'islam muslim masjid sports fitness community');
    
    // City-based location search (more flexible than lat/lng)
    url.searchParams.set('location.address', city);
    url.searchParams.set('location.within', radius);
    
    // Sort chronologically
    url.searchParams.set('sort_by', 'date');
    
    // Expand venue data so we get location details
    url.searchParams.set('expand', 'venue');
    
    // Skip unavailable/cancelled events
    url.searchParams.set('include_unavailable_events', 'false');
    
    // Limit results to reduce payload (we'll filter after)
    url.searchParams.set('per_page', '50');

    // Make the request
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`
      },
      // Cache for 5 minutes (revalidate every 300s)
      next: { revalidate: 300 }
    });

    // Handle Eventbrite errors gracefully
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Eventbrite API error:', resp.status, text);
      // Return empty array instead of failing — let chatbot handle gracefully
      return NextResponse.json({ events: [] });
    }

    const data = await resp.json();
    
    // Post-process: filter, categorize, and transform events
    // IMPORTANT: Be forgiving with filtering — only exclude if truly irrelevant
    const events = (data.events ?? [])
      .map((event: any) => {
        // Extract text for filtering
        const eventText = `${event?.name?.text ?? ''} ${event?.summary ?? ''}`.toLowerCase();
        const venueName = (event?.venue?.name ?? '').toLowerCase();
        const venueAddress = (event?.venue?.address?.city ?? '').toLowerCase();
        
        // Check if event matches Islamic community category
        const isIslamic = islamicRegex.test(eventText) || 
                          islamicRegex.test(venueName) ||
                          venueName.includes('masjid') ||
                          venueName.includes('mosque');
        
        // Check if event matches sports/fitness category
        const isSports = sportsRegex.test(eventText);
        
        // Keep event if it matches EITHER category (forgiving filtering)
        // This avoids the problem of losing events due to narrow filters
        if (!isIslamic && !isSports) return null;
        
        // Categorize: prefer "community" if event matches both
        const category = isIslamic ? 'community' : 'sports';
        
        // Extract venue/location info
        const venue = event.venue || {};
        const address = venue.address || {};
        const cityName = address.city ? `${address.city}${address.region ? ', ' + address.region : ''}` : undefined;
        const location = venue.name || cityName || address.country || 'Location TBA';
        
        // Return calendar-ready event shape
        return {
          id: event.id,
          title: event.name?.text ?? 'Event',
          // Use local time when available (better for user's calendar)
          startTime: event.start?.local ?? event.start?.utc ?? null,
          endTime: event.end?.local ?? event.end?.utc ?? null,
          location,
          url: event.url ?? null,
          summary: event.summary ?? '',
          category
        };
      })
      .filter(Boolean) // Remove nulls
      .slice(0, 15);   // Return up to 15 results

    return NextResponse.json({ events });
    
  } catch (error) {
    // Catch network errors, JSON parsing errors, etc.
    console.error('Eventbrite fetch error:', error);
    // Return empty array gracefully — don't crash
    return NextResponse.json({ events: [] });
  }
}
