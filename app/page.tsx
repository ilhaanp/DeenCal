'use client';

import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { CalendarView, CalendarEvent } from '@/components/CalendarView';
import { ChatMessage, ParsedIntent, CommandIntent } from '@/lib/intents';
import { listEvents } from '@/lib/scheduler';

// Convert time string HH:MM to ISO datetime
const timeToISO = (dateStr: string, timeStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
};

// Convert ISO datetime to HH:MM format
const isoToTimeString = (iso: string): string => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// Helper function to generate prayer time events for all days
const generatePrayerEvents = (): CalendarEvent[] => {
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerTimes: Record<string, string> = {
    fajr: '05:45',
    dhuhr: '12:30',
    asr: '15:45',
    maghrib: '17:45',
    isha: '19:15'
  };
  
  const events: CalendarEvent[] = [];
  
  // Generate prayer events for the entire month
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    prayerNames.forEach((prayer, index) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      events.push({
        id: `prayer-${prayer}-${dateStr}`,
        title: prayer.charAt(0).toUpperCase() + prayer.slice(1),
        time: prayerTimes[prayer],
        date: dateStr,
        location: 'Masjid',
        type: 'prayer' as const,
        notes: `${prayerNames.length - index} times to pray today`
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
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const baseEvents = listEvents();
    const prayerEvents = generatePrayerEvents();
    return [...baseEvents, ...prayerEvents];
  });
  const [prayerTimes, setPrayerTimes] = useState<Record<string, string>>({
    fajr: '--:--',
    dhuhr: '--:--',
    asr: '--:--',
    maghrib: '--:--',
    isha: '--:--'
  });

  useEffect(() => {
    const loadPrayerTimes = async () => {
      const res = await fetch('/api/prayer');
      const data = await res.json();
      setPrayerTimes(data.times);
    };
    void loadPrayerTimes();
  }, []);

  const handleSend = async (text: string) => {
    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      const intent = data.intent as CommandIntent;
      let assistantResponse = '';

      // Handle schedule_event intent
      if (intent.type === 'schedule_event') {
        const startDate = new Date(intent.startTime);
        const endDate = new Date(intent.endTime);
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
          notes: `Scheduled via chat`
        };

        setEvents((prev) => [...prev, newEvent]);
        assistantResponse = `✓ Scheduled "${intent.title}" from ${startTimeStr}–${endTimeStr}. It's been added to your calendar.`;
      }
      // Handle reschedule_event intent
      else if (intent.type === 'reschedule_event') {
        const eventToReschedule = events.find(e => e.title.toLowerCase() === intent.eventTitle.toLowerCase());

        if (!eventToReschedule) {
          assistantResponse = `I couldn't find "${intent.eventTitle}" on your calendar. Could you clarify which event you'd like to reschedule?`;
        } else {
          const newStartTime = isoToTimeString(intent.newStartTime);
          const newEndTime = isoToTimeString(intent.newEndTime);
          const newDate = new Date(intent.newStartTime).toISOString().split('T')[0];

          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventToReschedule.id
                ? { ...e, time: newStartTime, date: newDate }
                : e
            )
          );
          assistantResponse = `✓ Rescheduled "${intent.eventTitle}" to ${newStartTime}–${newEndTime}. The calendar has been updated.`;
        }
      }
      // Handle suggest_opportunities intent
      else if (intent.type === 'suggest_opportunities') {
        assistantResponse = `Here are some calm moments today:\n\n• After Dhuhr: 1:00 PM – Good for a short break or reading\n• Before Asr: 3:00 PM – Perfect for personal reflection\n• After Isha: 8:30 PM – Wind down time\n\nWould you like to schedule anything?`;
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
