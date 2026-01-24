import React from 'react';

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  location: string;
  type: string;
  notes?: string;
};

type Props = {
  events: CalendarEvent[];
  prayerTimes: Record<string, string>;
};

export const CalendarView: React.FC<Props> = ({ events, prayerTimes }) => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Prayer-aware timeline</h2>
          <span className="text-xs text-gray-500">Local placeholders</span>
        </header>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(prayerTimes).map(([name, time]) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-md bg-sand px-3 py-2 text-ink"
            >
              <span className="capitalize">{name}</span>
              <span className="font-medium">{time}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Nearby & personal</h2>
          <span className="text-xs text-gray-500">Mock data for demo</span>
        </header>
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-md border bg-sand px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{event.title}</p>
                <span className="text-xs uppercase tracking-wide text-gray-600">{event.type}</span>
              </div>
              <p className="text-sm text-gray-700">{event.time} · {event.location}</p>
              {event.notes && <p className="text-xs text-gray-600">{event.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
