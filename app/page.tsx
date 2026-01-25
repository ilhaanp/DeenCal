'use client';

import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { CalendarView, CalendarEvent } from '@/components/CalendarView';
import { ChatMessage, CommandIntent } from '@/lib/intents';
import { PrayerTimes, fallbackTimes } from '@/lib/prayer';

type ExternalEvent = {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  url?: string;
  summary?: string;
  category?: 'community' | 'sports';
};

// Format ISO time to HH:MM
function isoToTimeString(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Generate prayer events for the entire month using prayer times from prayer.ts
const generatePrayerEvents = (prayerTimes: PrayerTimes): CalendarEvent[] => {
  const prayerNames: Array<keyof PrayerTimes> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const events: CalendarEvent[] = [];
  
  // Generate prayer events for the entire month
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    prayerNames.forEach((prayer, index) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const time = prayerTimes[prayer];
      const [hour, minute] = time.split(':').map(Number);
      
      // Create ISO timestamps for prayer time (15 min duration)
      const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 15);
      
      events.push({
        id: `prayer-${prayer}-${dateStr}`,
        title: prayer.charAt(0).toUpperCase() + prayer.slice(1),
        time: time,
        date: dateStr,
        location: 'Masjid',
        type: 'prayer' as const,
        notes: `${prayerNames.length - index} times to pray today`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        protected: true // Mark prayer times as protected
      });
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return events;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Salaam! Share what you need and I will keep prayer times in mind.'
    }
  ]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>(fallbackTimes);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    // Initialize with fallback prayer times
    return generatePrayerEvents(fallbackTimes);
  });
  const [pendingRecommendations, setPendingRecommendations] = useState<ExternalEvent[]>([]);

  useEffect(() => {
    const loadPrayerTimes = async () => {
      // Load prayer times from API (which uses lib/prayer.ts)
      const res = await fetch('/api/prayer');
      const data = await res.json();
      const loadedTimes: PrayerTimes = data.times;
      setPrayerTimes(loadedTimes);
      
      // Regenerate events with the loaded prayer times from prayer.ts
      const prayerEvents = generatePrayerEvents(loadedTimes);
      setEvents(prayerEvents);
    };

    void loadPrayerTimes();
  }, []);

  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);

    // If the user is confirming a recommended external event, schedule it directly
    const optionMatch = text.match(/schedule\s+(?:option\s*)?#?(\d+)/i) || text.match(/add\s+(?:option\s*)?#?(\d+)/i);
    if (optionMatch && pendingRecommendations.length > 0) {
      const index = Number(optionMatch[1]) - 1;
      const pick = pendingRecommendations[index];

      if (!pick) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: "I couldn't find that option. Try a number from the latest list of events.",
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const startIso = pick.startTime ?? new Date().toISOString();
      const endIso = pick.endTime ?? new Date(new Date(startIso).getTime() + 90 * 60 * 1000).toISOString();

      try {
        const conflictRes = await fetch('/api/schedule-helper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check-conflict',
            startTime: startIso,
            endTime: endIso,
            events
          })
        });

        const conflictData = await conflictRes.json();
        let assistantResponse = '';

        if (conflictData.hasConflict && conflictData.conflictingEvent) {
          const duration = (new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60);
          
          const altRes = await fetch('/api/schedule-helper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'find-alternative',
              afterTime: conflictData.conflictingEvent.endTime,
              durationMinutes: duration,
              events
            })
          });

          const altData = await altRes.json();
          const altStartStr = isoToTimeString(altData.startTime);
          const altEndStr = isoToTimeString(altData.endTime);
          assistantResponse = `That time overlaps with ${conflictData.conflictingEvent.title}. I can place "${pick.title}" after prayer instead, from ${altStartStr}–${altEndStr}. Would you like me to do that?`;
        } else {
          const startDate = new Date(startIso);
          const dateStr = startDate.toISOString().split('T')[0];
          const newEvent: CalendarEvent = {
            id: `event-${Date.now()}`,
            title: pick.title,
            time: isoToTimeString(startIso),
            date: dateStr,
            location: pick.location || 'TBD',
            type: 'eventbrite',
            notes: pick.url ? `Source: ${pick.url}` : 'Scheduled from Eventbrite recommendation',
            startTime: startIso,
            endTime: endIso,
            protected: false
          };
          setEvents((prev) => [...prev, newEvent]);
          assistantResponse = `✓ Added "${pick.title}" from the recommendations at ${newEvent.time}.`;
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error('Event scheduling error:', err);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'I encountered an error while scheduling the event. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      return;
    }

    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      const intent = data.intent as CommandIntent;
      let assistantResponse = '';

      // Handle schedule_event intent with Sacred Time Protection
      if (intent.type === 'schedule_event') {
        try {
          // Call backend to check conflicts and find alternatives
          const conflictRes = await fetch('/api/schedule-helper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'check-conflict',
              startTime: intent.startTime,
              endTime: intent.endTime,
              events
            })
          });

          const conflictData = await conflictRes.json();

          if (conflictData.hasConflict && conflictData.conflictingEvent) {
            // Calculate duration and find alternative
            const duration = (new Date(intent.endTime).getTime() - new Date(intent.startTime).getTime()) / (1000 * 60);
            
            const altRes = await fetch('/api/schedule-helper', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'find-alternative',
                afterTime: conflictData.conflictingEvent.endTime,
                durationMinutes: duration,
                events
              })
            });

            const altData = await altRes.json();
            const altStartStr = isoToTimeString(altData.startTime);
            const altEndStr = isoToTimeString(altData.endTime);
            
            assistantResponse = `That time overlaps with ${conflictData.conflictingEvent.title}. I can schedule "${intent.title}" after prayer instead, from ${altStartStr}–${altEndStr}. Would you like me to do that?`;
          } else {
            // No conflict - schedule the event
            const startDate = new Date(intent.startTime);
            const startTimeStr = isoToTimeString(intent.startTime);
            const endTimeStr = isoToTimeString(intent.endTime);
            const dateStr = startDate.toISOString().split('T')[0];

            const newEvent: CalendarEvent = {
              id: `event-${Date.now()}`,
              title: intent.title,
              time: startTimeStr,
              date: dateStr,
              location: 'TBD',
              type: 'meeting',
              notes: `Scheduled via chat`,
              startTime: intent.startTime,
              endTime: intent.endTime,
              protected: false
            };

            setEvents((prev) => [...prev, newEvent]);
            assistantResponse = `✓ Scheduled "${intent.title}" from ${startTimeStr}–${endTimeStr}. It's been added to your calendar.`;
          }
        } catch (err) {
          console.error('Schedule error:', err);
          assistantResponse = 'I encountered an error while scheduling. Please try again.';
        }
      }
      // Handle reschedule_event intent with Sacred Time Protection
      else if (intent.type === 'reschedule_event') {
        const eventToReschedule = events.find(e => e.title.toLowerCase() === intent.eventTitle.toLowerCase());

        if (!eventToReschedule) {
          assistantResponse = `I couldn't find "${intent.eventTitle}" on your calendar. Could you clarify which event you'd like to reschedule?`;
        } else if (eventToReschedule.protected) {
          assistantResponse = `Prayer times are protected and cannot be rescheduled. Would you like to schedule something around them instead?`;
        } else {
          try {
            // Check conflicts with backend
            const conflictRes = await fetch('/api/schedule-helper', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'check-conflict',
                startTime: intent.newStartTime,
                endTime: intent.newEndTime,
                events
              })
            });

            const conflictData = await conflictRes.json();

            if (conflictData.hasConflict && conflictData.conflictingEvent) {
              const duration = (new Date(intent.newEndTime).getTime() - new Date(intent.newStartTime).getTime()) / (1000 * 60);
              
              const altRes = await fetch('/api/schedule-helper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'find-alternative',
                  afterTime: conflictData.conflictingEvent.endTime,
                  durationMinutes: duration,
                  events
                })
              });

              const altData = await altRes.json();
              const altStartStr = isoToTimeString(altData.startTime);
              const altEndStr = isoToTimeString(altData.endTime);
              
              assistantResponse = `That new time overlaps with ${conflictData.conflictingEvent.title}. I can reschedule "${intent.eventTitle}" to after prayer instead, from ${altStartStr}–${altEndStr}. Would you like me to do that?`;
            } else {
              // No conflict - reschedule
              const newStartTime = isoToTimeString(intent.newStartTime);
              const newEndTime = isoToTimeString(intent.newEndTime);
              const newDate = new Date(intent.newStartTime).toISOString().split('T')[0];

              setEvents((prev) =>
                prev.map((e) =>
                  e.id === eventToReschedule.id
                    ? { ...e, time: newStartTime, date: newDate, startTime: intent.newStartTime, endTime: intent.newEndTime }
                    : e
                )
              );
              assistantResponse = `✓ Rescheduled "${intent.eventTitle}" to ${newStartTime}–${newEndTime}. The calendar has been updated.`;
            }
          } catch (err) {
            console.error('Reschedule error:', err);
            assistantResponse = 'I encountered an error while rescheduling. Please try again.';
          }
        }
      }
      // Handle suggest_opportunities intent
      else if (intent.type === 'suggest_opportunities') {
        try {
          // Fetch from Eventbrite with default city (Toronto) — can parameterize later
          const recRes = await fetch('/api/eventbrite?city=Toronto&radius=50km');
          const recData = await recRes.json();
          const recs: ExternalEvent[] = recData.events ?? [];
          setPendingRecommendations(recs);

          if (recs.length === 0) {
            // Graceful fallback: suggest at-home deen activities
            const activities = [
              'This could be a good time for a Quran reflection—even 10 minutes can reset your heart.',
              'Since there aren\'t events nearby, consider a few moments of dhikr or two rakahs to rebalance your evening.',
              'No events around, but you could journal your intentions for tomorrow or make dua for the Ummah.',
              'This might be a perfect time for a short Islamic lecture or reminder, followed by some quiet reflection.',
              'Consider spending some time in voluntary salah (Duha or Tahajjud) or a brief Quran study session.'
            ];
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            assistantResponse = randomActivity;
          } else {
            // Group events by category for better presentation
            const communityEvents = recs.filter((e: any) => e.category === 'community');
            const sportsEvents = recs.filter((e: any) => e.category === 'sports');
            
            const formatted = recs
              .slice(0, 8)
              .map((ev, idx) => {
                const start = ev.startTime ? new Date(ev.startTime) : null;
                const when = start ? `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Time TBA';
                const place = ev.location ?? 'Location TBA';
                const badge = (ev as any).category === 'community' ? '🕌' : '⚽';
                return `${idx + 1}. ${badge} ${ev.title}\n   ${when} · ${place}`;
              })
              .join('\n\n');

            const typeLabel = communityEvents.length > 0 && sportsEvents.length > 0 
              ? 'community and sports events' 
              : communityEvents.length > 0 
              ? 'community events' 
              : 'sports events';

            assistantResponse = `I found ${typeLabel} in your area:\n\n${formatted}\n\nReply with "schedule #" to add one to your calendar (for example: schedule 2).`;
          }
        } catch (err) {
          console.error('Eventbrite fetch failed', err);
          assistantResponse = 'I could not reach Eventbrite right now. Want me to try again later?';
          setPendingRecommendations([]);
        }
      } else {
        assistantResponse = data.suggestions
          ? data.suggestions.map((s: any) => `• ${s.title}: ${s.detail}`).join('\n')
          : 'I understood you wanted to schedule something. Could you give me more details?';
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setPrayerTimes(data.prayerTimes || prayerTimes);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I encountered an error. Could you rephrase that?',
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Sidebar - Chat */}
      <div className="w-72 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-ink">Prayer Assistant</h1>
            <p className="text-xs text-gray-600 mt-1">Plan with prayer in mind</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <MessageList messages={messages} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <ChatInput onSend={handleSend} placeholder="Ask about scheduling..." />
        </div>
      </div>

      {/* Main Content - Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar - takes all space */}
        <div className="flex-1 overflow-hidden bg-gray-50 p-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <CalendarView events={events} prayerTimes={prayerTimes} />
          </div>
        </div>
      </div>
    </div>
  );
}
