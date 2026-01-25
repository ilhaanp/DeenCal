type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerTimes = Record<PrayerName, string>;

let latestPrayerTimes: PrayerTimes | null = null;

export const fallbackTimes: PrayerTimes = {
  fajr: '05:45',
  dhuhr: '12:45',
  asr: '16:15',
  maghrib: '18:05',
  isha: '19:30'
};

export const getPrayerTimes = async (date: string): Promise<PrayerTimes> => {
  // In a real app, you'd also use the date parameter.
  try {
    const res = await fetch("https://api.aladhan.com/v1/timingsByCity?city=Kitchener&country=Canada&method=2");
    const data = await res.json();
    const timings = data.data.timings;
    // Convert API's keys to match our PrayerName type
    const result: PrayerTimes = {
      fajr: timings.Fajr,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha
    };
    latestPrayerTimes = result;
    return result;
  } catch (e) {
    // Fallback in case of error
    latestPrayerTimes = fallbackTimes;
    return fallbackTimes;
  }
};

// Export or access the latestPrayerTimes variable anywhere in your module
export const getLatestPrayerTimes = (): PrayerTimes | null => latestPrayerTimes;

export const describeRelation = (relation: 'before' | 'after' | 'around' | undefined, anchor: string | undefined) => {
  if (!anchor) return 'around today';
  if (!relation) return `around ${anchor}`;
  return `${relation} ${anchor}`;
};
