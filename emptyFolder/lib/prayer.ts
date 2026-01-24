type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type PrayerTimes = Record<PrayerName, string>;

const fallbackTimes: PrayerTimes = {
  fajr: '05:45',
  dhuhr: '12:45',
  asr: '16:15',
  maghrib: '18:05',
  isha: '19:30'
};

export const getPrayerTimes = async (date: string): Promise<PrayerTimes> => {
  // Hackathon-safe: mock a remote call while keeping the contract clear.
  // In production, replace with a real API like AlAdhan and add location params.
  void date;
  return fallbackTimes;
};

export const describeRelation = (relation: 'before' | 'after' | 'around' | undefined, anchor: string | undefined) => {
  if (!anchor) return 'around today';
  if (!relation) return `around ${anchor}`;
  return `${relation} ${anchor}`;
};
