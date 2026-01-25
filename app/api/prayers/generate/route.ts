import { NextResponse } from 'next/server';

export async function GET() {
  const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerTimes: Record<string, string> = {
    fajr: '05:45',
    dhuhr: '12:30',
    asr: '15:45',
    maghrib: '17:45',
    isha: '19:15'
  };

  const events: any[] = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    prayerNames.forEach((prayer, index) => {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const time = prayerTimes[prayer];
      const [hour, minute] = time.split(':').map(Number);

      const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour, minute);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 15);

      events.push({
        id: `prayer-${prayer}-${dateStr}`,
        title: prayer.charAt(0).toUpperCase() + prayer.slice(1),
        time,
        date: dateStr,
        location: 'Masjid',
        type: 'prayer',
        notes: `${prayerNames.length - index} times to pray today`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        protected: true
      });
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return NextResponse.json({ events });
}
