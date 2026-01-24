# Faithful Calendar (Hackathon MVP)

A faith-aware, conversational calendar for Muslims. The goal: help users spend time intentionally and gently, keeping prayer times in view without being pushy.

## Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- API routes: `/api/interpret` (intent parsing), `/api/prayer` (prayer times)
- Mock data for events, single LLM-like intent parser (stubbed)

## Development
1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Visit `http://localhost:3000`

## Project layout
- `app/page.tsx`: Conversational UI and context snapshot
- `app/api/interpret/route.ts`: Intent parsing + suggestion stitching (mocked)
- `app/api/prayer/route.ts`: Prayer times (mocked)
- `components/*`: UI pieces (chat, timeline, calendar)
- `lib/*`: Intent heuristics, prayer helpers, simple scheduler
- `data/mockEvents.json`: Demo events and habits

## Notes
- Intent parsing is heuristic for hackathon safety; replace with a real LLM call that returns strict JSON.
- Prayer times use a static placeholder; swap with a provider like AlAdhan and add location later.
- Suggestions stay explainable and gentle—no automatic scheduling.
