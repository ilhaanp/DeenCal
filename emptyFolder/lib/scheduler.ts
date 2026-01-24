import events from '../data/mockEvents.json';
import { describeRelation, PrayerTimes } from './prayer';
import { ParsedIntent } from './intents';

type Event = {
  id: string;
  title: string;
  time: string;
  location: string;
  type: 'halaqa' | 'masjid' | 'habit';
  notes?: string;
};

export const listEvents = (): Event[] => events;

export const findSuggestions = (intent: ParsedIntent, prayers: PrayerTimes) => {
  if (intent.intent === 'ask_free') {
    return buildOpportunitySuggestions(prayers);
  }

  if (intent.intent === 'prayer_window') {
    return [
      {
        title: 'Keep a light buffer',
        detail: `Plan something short ${describeRelation(intent.details.relation, intent.details.when)} so you can reach salah calmly.`
      }
    ];
  }

  if (intent.intent === 'schedule') {
    return [
      {
        title: 'Try a focused 25m block',
        detail: `Place it ${describeRelation(intent.details.relation, intent.details.when)} and leave 10m margin before the next prayer.`
      }
    ];
  }

  return [
    {
      title: 'Check what is nearby',
      detail: 'Browse local halaqas or pick a short habit like dhikr or Quran reading.'
    }
  ];
};

const buildOpportunitySuggestions = (prayers: PrayerTimes) => {
  const { asr, maghrib } = prayers;
  return [
    {
      title: 'Attend a halaqa',
      detail: `Closest option: see the halaqa near Maghrib (${maghrib}).`
    },
    {
      title: 'Masjid visit',
      detail: `Drop by before Asr (${asr}) for quiet reflection.`
    },
    {
      title: 'Personal habit',
      detail: '15 minutes of Quran or dhikr wherever you are.'
    }
  ];
};
