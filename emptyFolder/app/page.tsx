'use client';

import { useEffect, useState } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { MessageList } from '@/components/MessageList';
import { CalendarView } from '@/components/CalendarView';
import { ChatMessage, ParsedIntent } from '@/lib/intents';
import { listEvents } from '@/lib/scheduler';

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Salaam! Share what you need and I will keep prayer times in mind.'
    }
  ]);
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

    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data: { intent: ParsedIntent; suggestions: { title: string; detail: string }[]; prayerTimes: Record<string, string> } =
      await response.json();

    setPrayerTimes(data.prayerTimes);

    const suggestionText = data.suggestions
      .map((s) => `• ${s.title}: ${s.detail}`)
      .join('\n');

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: `Intent: ${data.intent.intent}\nFocus: ${data.intent.details.when ?? 'today'}\n\nHere are gentle options:\n${suggestionText}`,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, assistantMessage]);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">Faith-aware calendar</p>
        <h1 className="text-3xl font-bold leading-tight">Plan with prayer in mind</h1>
        <p className="text-sm text-gray-700">
          Conversational, transparent, and gentle. No forced automations—just cues that keep you aligned.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <MessageList messages={messages} />
          <ChatInput onSend={handleSend} placeholder="e.g. Schedule a meeting after Asr" />
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Context snapshot</h2>
          <CalendarView events={listEvents()} prayerTimes={prayerTimes} />
        </div>
      </section>
    </div>
  );
}
