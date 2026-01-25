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

const atHomeSuggestions = [
  'Take 10–15 minutes for a short Quran reflection on a favorite ayah.',
  'Spend 5–10 minutes in calm dhikr; focus on presence and breath.',
  'Pray two rakahs with intentional du\'a for your goals and the Ummah.',
  'Listen to a 10-minute reminder or online halaqa and jot one takeaway.',
  'Plan tomorrow around salah times so your schedule flows with barakah.'
];

const isConfirmation = (text: string) => /^(yes|yep|yeah|sure|ok|okay|confirm|sounds good|go ahead|do it)\b/i.test(text.trim());

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  
  // Generate prayer events for the entire year to keep every day covered
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1);
  const endDate = new Date(today.getFullYear(), 11, 31);
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const isFriday = currentDate.getDay() === 5;

    prayerNames.forEach((prayer, index) => {
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

    if (isFriday) {
      const time = prayerTimes.dhuhr;
      const [hour, minute] = time.split(':').map(Number);
      const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45);

      events.push({
        id: `jummah-${dateStr}`,
        title: 'Jumu‘ah',
        time,
        date: dateStr,
        location: 'Masjid',
        type: 'prayer',
        notes: 'Weekly Jumu‘ah prayer',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        protected: true
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return events;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes>(fallbackTimes);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    // Initialize with fallback prayer times
    return generatePrayerEvents(fallbackTimes);
  });
  const [pendingRecommendations, setPendingRecommendations] = useState<ExternalEvent[]>([]);
  const [pendingEvent, setPendingEvent] = useState<{ event: CalendarEvent; replaceId?: string } | null>(null);

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

    // If user confirms a pending suggestion, finalize it
    if (pendingEvent && isConfirmation(text)) {
      if (pendingEvent.replaceId) {
        setEvents((prev) => prev.map((e) => (e.id === pendingEvent.replaceId ? { ...pendingEvent.event } : e)));
      } else {
        setEvents((prev) => [...prev, pendingEvent.event]);
      }
      const confirmMessage: ChatMessage = {
        role: 'assistant',
        content: pendingEvent.replaceId
          ? `✓ Updated "${pendingEvent.event.title}" to ${pendingEvent.event.time}.`
          : `✓ Scheduled "${pendingEvent.event.title}" for ${pendingEvent.event.time}. It's on your calendar.`,
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, confirmMessage]);
      setPendingEvent(null);
      return;
    }

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
          const altDateStr = formatLocalDate(new Date(altData.startTime));

          const altEvent: CalendarEvent = {
            id: `event-${Date.now()}`,
            title: pick.title,
            time: altStartStr,
            date: altDateStr,
            location: pick.location || 'TBD',
            type: 'eventbrite',
            notes: pick.url ? `Source: ${pick.url}` : 'Scheduled from Eventbrite recommendation (after prayer)',
            startTime: altData.startTime,
            endTime: altData.endTime,
            protected: false
          };

          setPendingEvent({ event: altEvent });
          assistantResponse = `That time overlaps with ${conflictData.conflictingEvent.title}. I can place "${pick.title}" after prayer at ${altStartStr}–${altEndStr}. Should I book it?`;
        } else {
          const startDate = new Date(startIso);
          const dateStr = formatLocalDate(startDate);
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
        if (intent.ambiguous) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: 'I can schedule that — what date did you have in mind (today, tomorrow, or a specific day)?',
            timestamp: new Date().toISOString()
          };
          setMessages((prev) => [...prev, assistantMessage]);
          return;
        }
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
            const altStartDate = new Date(altData.startTime);
            const altDateStr = formatLocalDate(altStartDate);

            const altEvent: CalendarEvent = {
              id: `event-${Date.now()}`,
              title: intent.title,
              time: altStartStr,
              date: altDateStr,
              location: 'TBD',
              type: 'meeting',
              notes: 'Scheduled after prayer to avoid conflict',
              startTime: altData.startTime,
              endTime: altData.endTime,
              protected: false
            };

            setPendingEvent({ event: altEvent });
            assistantResponse = `That time overlaps with ${conflictData.conflictingEvent.title}. I can place "${intent.title}" after prayer at ${altStartStr}–${altEndStr}. Should I book it?`;
          } else {
            // No conflict - schedule the event
            const startDate = new Date(intent.startTime);
            const startTimeStr = isoToTimeString(intent.startTime);
            const endTimeStr = isoToTimeString(intent.endTime);
            const dateStr = formatLocalDate(startDate);

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
              const proposedReschedule: CalendarEvent = {
                ...eventToReschedule,
                time: altStartStr,
                date: formatLocalDate(new Date(altData.startTime)),
                startTime: altData.startTime,
                endTime: altData.endTime,
                notes: eventToReschedule.notes ?? 'Rescheduled after prayer'
              };

              setPendingEvent({ event: proposedReschedule, replaceId: eventToReschedule.id });
              assistantResponse = `That new time overlaps with ${conflictData.conflictingEvent.title}. I can move "${intent.eventTitle}" to ${altStartStr}–${altEndStr}. Should I update it?`;
            } else {
              // No conflict - reschedule
              const newStartTime = isoToTimeString(intent.newStartTime);
              const newEndTime = isoToTimeString(intent.newEndTime);
              const newDate = formatLocalDate(new Date(intent.newStartTime));

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
            const pickCount = 2 + Math.floor(Math.random() * 2);
            const shuffled = [...atHomeSuggestions].sort(() => Math.random() - 0.5);
            const picks = shuffled.slice(0, pickCount).join('\n• ');
            assistantResponse = `Salaam 🌿 No nearby events right now. Here are beneficial at-home options:\n• ${picks}`;
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
      <div className="flex h-screen w-full bg-sand">
      {/* Sidebar - Chat */}
      <div className="w-72 border-r border-edge bg-card flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-edge/70">
            <div className="flex items-center gap-2">
              <div className="flex flex-col leading-tight">
                <h1 className="text-xl font-semibold text-ink font-display">DeenCal</h1>
                <p className="text-xs text-ink/70">your schedulling buddy</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <MessageList messages={messages} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-edge/70 bg-card">
          <ChatInput onSend={handleSend} placeholder="Ask about scheduling..." />
        </div>
      </div>

      {/* Main Content - Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Calendar - takes all space */}
        <div className="flex-1 overflow-hidden bg-sand p-8">
          <div className="bg-card rounded-2xl border border-edge/70 shadow-[0_12px_30px_rgba(0,0,0,0.35)] p-6 h-full">
            <CalendarView events={events} prayerTimes={prayerTimes} />
          </div>
        </div>
      </div>
    </div>
  );
}
