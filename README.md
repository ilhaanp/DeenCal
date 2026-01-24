# Faithful Calendar (Hackathon MVP)

A faith-aware, conversational calendar for Muslims. The goal: help users spend time intentionally and gently, with **Sacred Time Protection** to respect prayer times.

## Key Features

### 🕌 Sacred Time Protection
- **Protected Prayer Times**: All 5 daily prayers are marked as protected events
- **Conflict Detection**: Prevents scheduling events that overlap with prayer times
- **Respectful Suggestions**: When a conflict is detected, the chatbot suggests the next available time after prayer
- **User Control**: No forced changes—the user always has final say
- **Calm Tone**: Supportive guidance without religious lecturing

Example interaction:
```
User: "Schedule a meeting at 5:30pm tomorrow"
Assistant: "That time overlaps with Maghrib. I can schedule your meeting after prayer instead, from 6:05–7:05pm. Would you like me to do that?"
```

### 💬 Conversational Interface
- Natural language scheduling ("Schedule a meeting with Sarah tomorrow evening")
- Real-time calendar updates
- Multi-view calendar (Year/Month/Week/Day)
- Apple Calendar-inspired design

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
- `app/page.tsx`: Conversational UI, calendar state, and Sacred Time Protection logic
- `app/api/interpret/route.ts`: Intent parsing + suggestion stitching (mocked)
- `app/api/prayer/route.ts`: Prayer times (mocked)
- `components/*`: UI pieces (chat, calendar views)
- `lib/*`: Intent heuristics, prayer helpers, simple scheduler
- `data/mockEvents.json`: Demo events and habits

## How Sacred Time Protection Works

1. **Prayer times are preloaded** as protected events with 15-minute durations
2. **Conflict detection** runs before scheduling any event:
   - Checks if requested time overlaps with protected events
   - Calculates time overlap using ISO timestamps
3. **Alternative suggestions** find the next available slot:
   - Adds 5-minute buffer after prayer ends
   - Recursively checks for additional conflicts
   - Maintains the original event duration
4. **User confirmation** is always required before scheduling

## Notes
- Intent parsing is heuristic for hackathon safety; replace with a real LLM call that returns strict JSON.
- Prayer times use a static placeholder; swap with a provider like AlAdhan and add location later.
- Suggestions stay explainable and gentle—no automatic scheduling.
- Protected events (prayers) cannot be deleted or rescheduled by the user.
