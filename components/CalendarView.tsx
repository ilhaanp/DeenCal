'use client';

import React, { useState } from 'react';

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  date?: string;
  location: string;
  type: string;
  notes?: string;
};

type ViewType = 'yearly' | 'monthly' | 'weekly' | 'daily';

type Props = {
  events: CalendarEvent[];
  prayerTimes: Record<string, string>;
};

const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const formatDateYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr: string): Date | null => {
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
};

const getEventsForDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
  const dateStr = formatDateYYYYMMDD(date);
  return events.filter(e => e.date === dateStr);
};

const getWeekDates = (date: Date): Date[] => {
  const current = new Date(date);
  const dayOfWeek = current.getDay();
  const diff = current.getDate() - dayOfWeek;
  const dates: Date[] = [];
  
  for (let i = 0; i < 7; i++) {
    const newDate = new Date(current.getFullYear(), current.getMonth(), diff + i);
    dates.push(newDate);
  }
  return dates;
};

const MonthView: React.FC<{ date: Date; events: CalendarEvent[] }> = ({ date, events }) => {
  const daysInMonth = getDaysInMonth(date);
  const firstDay = getFirstDayOfMonth(date);
  const days: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

  return (
    <div>
      <h3 className="mb-4 text-center text-lg font-semibold">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 py-2 text-center text-xs font-semibold text-gray-700">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const cellDate = day ? new Date(date.getFullYear(), date.getMonth(), day) : null;
          const dayEvents = cellDate ? getEventsForDate(events, cellDate) : [];
          const isToday = cellDate && formatDateYYYYMMDD(cellDate) === formatDateYYYYMMDD(new Date());

          return (
            <div
              key={idx}
              className={`min-h-20 rounded border p-2 text-xs ${
                day === null ? 'bg-gray-50' : isToday ? 'border-teal bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              {day && (
                <>
                  <div className={`mb-1 font-semibold ${isToday ? 'text-teal' : 'text-gray-700'}`}>{day}</div>
                  <div className="flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} className="truncate rounded bg-sand px-1 py-0.5 text-ink">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-gray-500">+{dayEvents.length - 2} more</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const WeekView: React.FC<{ date: Date; events: CalendarEvent[] }> = ({ date, events }) => {
  const weekDates = getWeekDates(date);
  const weekStart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDates[0]);
  const weekEnd = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDates[6]);

  return (
    <div>
      <h3 className="mb-4 text-center text-lg font-semibold">
        {weekStart} — {weekEnd}
      </h3>
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map(cellDate => {
          const dayEvents = getEventsForDate(events, cellDate);
          const isToday = formatDateYYYYMMDD(cellDate) === formatDateYYYYMMDD(new Date());
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(cellDate);
          const dayNum = cellDate.getDate();

          return (
            <div
              key={formatDateYYYYMMDD(cellDate)}
              className={`min-h-32 rounded border p-2 ${
                isToday ? 'border-teal bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className={`mb-2 text-center text-xs font-semibold ${isToday ? 'text-teal' : 'text-gray-700'}`}>
                {dayName} {dayNum}
              </div>
              <div className="flex flex-col gap-1">
                {dayEvents.map(event => (
                  <div key={event.id} className="rounded bg-sand px-1.5 py-1 text-xs text-ink">
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-gray-600">{event.time}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DailyView: React.FC<{ date: Date; events: CalendarEvent[] }> = ({ date, events }) => {
  const dayEvents = getEventsForDate(events, date);
  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);

  return (
    <div>
      <h3 className="mb-4 text-center text-lg font-semibold">{dayName}</h3>
      <div className="flex flex-col gap-3">
        {dayEvents.length > 0 ? (
          dayEvents.map(event => (
            <div key={event.id} className="rounded border border-gray-200 bg-white p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold text-ink">{event.title}</p>
                <span className="text-xs uppercase tracking-wide text-gray-600">{event.type}</span>
              </div>
              <p className="text-sm text-gray-700">{event.time} · {event.location}</p>
              {event.notes && <p className="mt-2 text-xs text-gray-600">{event.notes}</p>}
            </div>
          ))
        ) : (
          <p className="text-center text-sm text-gray-500">No events scheduled</p>
        )}
      </div>
    </div>
  );
};

const YearlyView: React.FC<{ date: Date; events: CalendarEvent[] }> = ({ date, events }) => {
  const year = date.getFullYear();

  return (
    <div>
      <h3 className="mb-4 text-center text-lg font-semibold">{year}</h3>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, i) => {
          const monthDate = new Date(year, i, 1);
          const daysInMonth = getDaysInMonth(monthDate);
          const firstDay = getFirstDayOfMonth(monthDate);
          const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(monthDate);

          return (
            <div key={i} className="rounded border border-gray-200 bg-white p-2">
              <h4 className="mb-2 text-center text-xs font-semibold text-gray-700">{monthName}</h4>
              <div className="grid grid-cols-7 gap-0.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500">
                    {day}
                  </div>
                ))}
                {Array(firstDay)
                  .fill(null)
                  .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
                  .map((day, idx) => {
                    const cellDate = day ? new Date(year, i, day) : null;
                    const hasEvents = cellDate ? getEventsForDate(events, cellDate).length > 0 : false;

                    return (
                      <div
                        key={idx}
                        className={`aspect-square text-center text-xs font-medium ${
                          day === null
                            ? ''
                            : hasEvents
                              ? 'rounded bg-sand text-ink'
                              : 'text-gray-600'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CalendarView: React.FC<Props> = ({ events, prayerTimes }) => {
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else if (viewType === 'monthly') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'yearly') {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else if (viewType === 'monthly') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col gap-6">
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('yearly')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewType === 'yearly'
                  ? 'bg-teal text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewType === 'monthly'
                  ? 'bg-teal text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewType === 'weekly'
                  ? 'bg-teal text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewType('daily')}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                viewType === 'daily'
                  ? 'bg-teal text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Daily
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="min-h-96 rounded border border-gray-100 bg-gray-50 p-4">
          {viewType === 'yearly' && <YearlyView date={currentDate} events={events} />}
          {viewType === 'monthly' && <MonthView date={currentDate} events={events} />}
          {viewType === 'weekly' && <WeekView date={currentDate} events={events} />}
          {viewType === 'daily' && <DailyView date={currentDate} events={events} />}
        </div>
      </section>
    </div>
  );
};