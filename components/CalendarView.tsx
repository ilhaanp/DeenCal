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
  startTime?: string; // ISO
  endTime?: string;   // ISO
  protected?: boolean; // true for prayer times
};

type ViewType = 'yearly' | 'monthly' | 'weekly' | 'daily';

type Props = {
  events: CalendarEvent[];
  prayerTimes: Record<string, string>;
};

type DayDetail = {
  dateStr: string;
  events: CalendarEvent[];
  dayName: string;
} | null;

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

const MonthView: React.FC<{ date: Date; events: CalendarEvent[]; onSelectDay: (detail: DayDetail) => void }> = ({ date, events, onSelectDay }) => {
  const daysInMonth = getDaysInMonth(date);
  const firstDay = getFirstDayOfMonth(date);
  const days: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  const year = date.getFullYear();
  const today = new Date();
  const isCurrentMonth = date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  const todayDate = isCurrentMonth ? today.getDate() : null;

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-semibold text-ink">{monthName}</h2>
        <p className="text-sm text-gray-500 mt-1">{year}</p>
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-12 flex items-center justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{day}</p>
          </div>
        ))}
        
        {days.map((day, idx) => {
          const cellDate = day ? new Date(date.getFullYear(), date.getMonth(), day) : null;
          const dayEvents = cellDate ? getEventsForDate(events, cellDate) : [];
          const isToday = day === todayDate;
          const prayerCount = dayEvents.filter(e => e.type === 'prayer').length;
          const eventCount = dayEvents.filter(e => e.type !== 'prayer').length;

          return (
            <div
              key={idx}
              onClick={() => {
                if (cellDate) {
                  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(cellDate);
                  onSelectDay({
                    dateStr: formatDateYYYYMMDD(cellDate),
                    events: dayEvents,
                    dayName
                  });
                }
              }}
              className={`h-28 rounded-lg p-3 flex flex-col transition cursor-pointer ${
                day === null 
                  ? 'bg-transparent' 
                  : isToday 
                    ? 'bg-white border-2 border-teal ring-2 ring-teal/20' 
                    : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {day && (
                <>
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ml-auto transition ${
                    isToday ? 'bg-teal text-white font-semibold text-sm' : 'text-gray-700 font-medium text-base'
                  }`}>
                    {day}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 mt-2">
                    {prayerCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal"></div>
                        <span className="text-xs text-teal font-medium">{prayerCount} prayer{prayerCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {eventCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-ember"></div>
                        <span className="text-xs text-gray-600 truncate">{eventCount} event{eventCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
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

const WeekView: React.FC<{ date: Date; events: CalendarEvent[]; onSelectDay: (detail: DayDetail) => void }> = ({ date, events, onSelectDay }) => {
  const weekDates = getWeekDates(date);
  const weekStart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDates[0]);
  const weekEnd = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekDates[6]);

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold text-ink">{weekStart} – {weekEnd}</h2>
        <p className="text-sm text-gray-500 mt-1">Week view</p>
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map(cellDate => {
          const dayEvents = getEventsForDate(events, cellDate);
          const today = new Date();
          const isToday = cellDate.toDateString() === today.toDateString();
          const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(cellDate);
          const dayNum = cellDate.getDate();

          return (
            <div
              key={formatDateYYYYMMDD(cellDate)}
              onClick={() => {
                const fullDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(cellDate);
                onSelectDay({
                  dateStr: formatDateYYYYMMDD(cellDate),
                  events: dayEvents,
                  dayName: fullDayName
                });
              }}
              className={`rounded-lg p-4 cursor-pointer transition ${
                isToday 
                  ? 'bg-white border-2 border-teal ring-2 ring-teal/20' 
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="text-center mb-3">
                <p className={`text-sm font-medium ${isToday ? 'text-teal' : 'text-gray-600'}`}>{dayName}</p>
                <div className={`text-2xl font-semibold mt-1 ${isToday ? 'text-teal' : 'text-ink'}`}>
                  {dayNum}
                </div>
              </div>
              
              <div className="space-y-2">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className={`px-2 py-1.5 rounded text-xs font-medium truncate ${
                      event.type === 'prayer'
                        ? 'bg-teal/10 text-teal'
                        : 'bg-ember/10 text-ember'
                    }`}
                  >
                    {event.time}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-gray-500 text-center pt-1">+{dayEvents.length - 3} more</p>
                )}
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
            <div key={event.id} className={`rounded border p-3 ${
              event.type === 'prayer'
                ? 'border-teal/30 bg-teal/10'
                : 'border-gray-200 bg-white'
            }`}>
              <div className="mb-1 flex items-center justify-between">
                <p className={`font-semibold ${event.type === 'prayer' ? 'text-teal' : 'text-ink'}`}>{event.title}</p>
                <span className={`text-xs uppercase tracking-wide ${
                  event.type === 'prayer' 
                    ? 'text-teal/60 font-medium' 
                    : 'text-gray-600'
                }`}>{event.type}</span>
              </div>
              <p className={`text-sm ${event.type === 'prayer' ? 'text-teal/70' : 'text-gray-700'}`}>{event.time} · {event.location}</p>
              {event.notes && <p className={`mt-2 text-xs ${event.type === 'prayer' ? 'text-teal/60' : 'text-gray-600'}`}>{event.notes}</p>}
            </div>
          ))
        ) : (
          <p className="text-center text-sm text-gray-500">No events scheduled</p>
        )}
      </div>
    </div>
  );
};

const YearlyView: React.FC<{ date: Date; events: CalendarEvent[]; onSelectDay: (detail: DayDetail) => void }> = ({ date, events, onSelectDay }) => {
  const year = date.getFullYear();

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-semibold text-ink">{year}</h2>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 12 }, (_, i) => {
          const monthDate = new Date(year, i, 1);
          const daysInMonth = getDaysInMonth(monthDate);
          const firstDay = getFirstDayOfMonth(monthDate);
          const monthName = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(monthDate);

          return (
            <div key={i} className="rounded-lg bg-white border border-gray-200 p-4">
              <h4 className="mb-4 text-center text-sm font-semibold text-ink">{monthName}</h4>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="h-6 flex items-center justify-center">
                    <p className="text-xs font-medium text-gray-400">{day}</p>
                  </div>
                ))}
                {Array(firstDay)
                  .fill(null)
                  .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
                  .map((day, idx) => {
                    const cellDate = day ? new Date(year, i, day) : null;
                    const dayEvents = cellDate ? getEventsForDate(events, cellDate) : [];
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (cellDate) {
                            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(cellDate);
                            onSelectDay({
                              dateStr: formatDateYYYYMMDD(cellDate),
                              events: dayEvents,
                              dayName
                            });
                          }
                        }}
                        className={`h-6 flex items-center justify-center text-xs font-medium rounded transition ${
                          day === null
                            ? ''
                            : hasEvents
                              ? 'bg-teal/20 text-teal cursor-pointer hover:bg-teal/30'
                              : 'text-gray-600 cursor-pointer hover:bg-gray-100'
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

const DayDetailPanel: React.FC<{ detail: DayDetail; onClose: () => void }> = ({ detail, onClose }) => {
  if (!detail) return null;

  const sortedEvents = [...detail.events].sort((a, b) => {
    const aTime = a.time.split(':').map(Number);
    const bTime = b.time.split(':').map(Number);
    return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1]);
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">{detail.dayName}</h3>
            <p className="text-sm text-gray-600 mt-0.5">{sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedEvents.length > 0 ? (
            sortedEvents.map(event => (
              <div
                key={event.id}
                className={`rounded-xl p-4 border transition ${
                  event.type === 'prayer'
                    ? 'bg-teal/5 border-teal/20'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${event.type === 'prayer' ? 'text-teal' : 'text-ink'}`}>
                      {event.title}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    event.type === 'prayer' 
                      ? 'bg-teal/10 text-teal' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {event.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{event.location}</span>
                </div>
                {event.notes && (
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                    {event.notes}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-center text-sm text-gray-500">No events scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalendarView: React.FC<Props> = ({ events, prayerTimes }) => {
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayDetail>(null);

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
    <div className="flex flex-col gap-0 h-full bg-gray-50">
      <section className="bg-white border-b border-gray-200 shadow-sm flex flex-col">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex gap-3">
            <button
              onClick={() => setViewType('yearly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewType === 'yearly'
                  ? 'bg-teal/10 text-teal'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setViewType('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewType === 'monthly'
                  ? 'bg-teal/10 text-teal'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewType === 'weekly'
                  ? 'bg-teal/10 text-teal'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('daily')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                viewType === 'daily'
                  ? 'bg-teal/10 text-teal'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Day
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition"
              title="Previous"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700 transition"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition"
              title="Next"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <section className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        <div className="flex-1 overflow-y-auto p-8">
          {viewType === 'yearly' && <YearlyView date={currentDate} events={events} onSelectDay={setSelectedDay} />}
          {viewType === 'monthly' && <MonthView date={currentDate} events={events} onSelectDay={setSelectedDay} />}
          {viewType === 'weekly' && <WeekView date={currentDate} events={events} onSelectDay={setSelectedDay} />}
          {viewType === 'daily' && <DailyView date={currentDate} events={events} />}
        </div>
      </section>

      <DayDetailPanel detail={selectedDay} onClose={() => setSelectedDay(null)} />
    </div>
  );
};