# CompCoach

CompCoach is a mobile-first Expo MVP for dance parents managing competition weekends. It turns raw schedule inputs into a clean combined timeline, detects likely stress points, and generates a simple shareable summary for family and friends.

CompCoach is also being extended into a broader competition-weekend assistant. The schedule remains the source of truth, with future layers for costumes, food, lodging, and dynamic assistant guidance generated from the schedule rather than maintained separately.

## Stack

- React Native with Expo
- Expo Router
- TypeScript
- Firebase Auth
- Cloud Firestore
- Firebase Storage
- Tamagui
- Service-based architecture

## MVP Features

- Multi-input add flow
  - Paste competition link: real link input, remote parser optional
  - Upload screenshot: real picker + upload path, remote parser optional
  - Upload PDF: real picker + upload path, remote parser optional
  - Manual entry: fully implemented
- Dancer detection and selection for schedule building
- Combined schedule grouped by day and sorted chronologically
- Conflict detection
  - overlaps
  - tight turnarounds under 20 minutes
  - high-density blocks with 3+ routines in 90 minutes
- Routine detail screen
- Share screen with copy and native share
- Seeded data for Kahlia Athill and Kadence Athill, including conflict scenarios

## Project Structure

```text
app/                  Expo Router screens
components/           Tamagui UI building blocks
config/               Firebase config helpers
constants/            Design tokens and seeded data
hooks/                Derived schedule state hooks
providers/            App-level state and theme providers
services/             Auth, Firestore, Storage, parsing, and sharing
types/                Domain models
utils/                Schedule and date logic
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file or export these variables in your shell:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_PARSER_API_URL=
```

3. Start the app:

```bash
npm run start
```

4. Open on iOS, Android, or a simulator from Expo.

## Firebase Setup

CompCoach runs in two modes:

- Live mode: if all `EXPO_PUBLIC_FIREBASE_*` variables are present, the app initializes Firebase, performs anonymous auth, and writes competition, dancer, schedule entry, and selected dancer documents.
- Seeded mode: if Firebase config is missing, the app falls back to local mock data so the MVP still works immediately.

## Extended Roadmap Shape

The product direction now has five linked layers:

- `Schedule`
  The source of truth for routines, dancers, times, and venue context
- `Costumes`
  Routine-linked costume sets, checklists, and missing item detection
- `Food`
  Meal, snack, and hydration windows generated from schedule gaps
- `Lodging`
  Departure timing and end-of-day planning generated from the day schedule
- `Assistant`
  Real-time hero cards, reminders, and timeline events for the weekend overview

The current schedule screen is the base for an eventual `Weekend Overview` surface.

## Parser Setup

Imports now have a real integration path:

- screenshot and PDF picks become typed assets in the app
- assets can upload through [`services/storageService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/storageService.ts)
- the app can call a remote OCR/AI parser through [`services/parserApiService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/parserApiService.ts)
- if no parser endpoint is configured, the app still falls back to seeded parsed data so the parent is never blocked

Set this to enable remote parsing:

```bash
EXPO_PUBLIC_PARSER_API_URL=
```

Expected parser request shape:

```json
{
  "sourceType": "pdf",
  "asset": {
    "uri": "file:///...",
    "name": "schedule.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "storagePath": "schedule-assets/...",
    "downloadUrl": "https://..."
  }
}
```

or:

```json
{
  "sourceType": "link",
  "link": {
    "url": "https://..."
  }
}
```

Expected parser response shape:

```json
{
  "competition": {},
  "dancers": [],
  "entries": [],
  "selectedDancers": []
}
```

### Firestore Collections

`competitions`
- `id`
- `name`
- `startDate`
- `endDate`
- `sourceType`
- `sourceUrl`
- `createdAt`

`dancers`
- `id`
- `competitionId`
- `name`

`scheduleEntries`
- `id`
- `competitionId`
- `dancerId`
- `eventDate`
- `eventTime`
- `datetimeStart`
- `title`
- `category`
- `performanceType`
- `notes`

`selectedDancers`
- `id`
- `competitionId`
- `dancerId`

## What Is Mocked

- `parseCompetitionFromLink()` when `EXPO_PUBLIC_PARSER_API_URL` is not configured
- `parseCompetitionFromScreenshot()` when `EXPO_PUBLIC_PARSER_API_URL` is not configured
- `parseCompetitionFromPdf()` when `EXPO_PUBLIC_PARSER_API_URL` is not configured
- OCR and remote document ingestion
- Full backend parser implementation

The import buttons now send real links and picked files into the parsing pipeline. Without a parser endpoint, they still return structured seeded payloads.

## Where To Plug In OCR / Parsing

- [`services/parsingService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/parsingService.ts)
  This decides between remote parsing and mock fallback.
- [`services/parserApiService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/parserApiService.ts)
  Point this at your OCR/AI backend and return `ParsedCompetitionPayload`.
- [`services/storageService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/storageService.ts)
  Upload the selected PDF or screenshot before handing the asset off to OCR or parsing workers.
- [`app/(tabs)/add.tsx`](/Users/michaelathill/Documents/Businesses/CompCoach/app/(tabs)/add.tsx)
  Capture additional metadata from the picked files or link input before calling the parsing service.

## Architecture Notes

- Screens stay thin and delegate data concerns to services and the app data provider.
- Firebase logic is isolated from UI screens.
- Schedule grouping, sorting, conflict detection, and share summary generation live in `utils/`.
- Tamagui is the primary UI system for consistent spacing, cards, buttons, and typography.
- Weekend overview planning logic is now scaffolded in [`utils/weekendOverview.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/utils/weekendOverview.ts).
- The overview aggregation layer lives in [`services/weekendOverviewService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/weekendOverviewService.ts).
- Expanded product architecture guidance lives in [`docs/architecture.md`](/Users/michaelathill/Documents/Businesses/CompCoach/docs/architecture.md).

## OpenClaw Integration Plan

OpenClaw is not required for the current MVP runtime. The app can keep moving with:

- Expo UI and local service logic
- deterministic schedule, conflict, and prep behavior
- the current OpenAI-backed parser backend for document extraction

OpenClaw is intended as a future orchestration layer for:

- document intake workflows
- parse -> validate -> enrich chains
- costume checklist generation
- food suggestion generation
- lodging recommendation generation
- assistant card generation

OpenClaw-ready seams now exist in:

- [`services/openClawService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/openClawService.ts)
- [`services/parsingService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/parsingService.ts)
- [`services/costumeService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/costumeService.ts)
- [`services/foodService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/foodService.ts)
- [`services/lodgingService.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/lodgingService.ts)

Current status:

- `openClawService.isConfigured()` returns `false`
- no active runtime path depends on OpenClaw yet
- these seams do not change current runtime behavior

Recommended rollout later:

1. configure OpenClaw outside the mobile app
2. connect it first for parsing orchestration
3. connect enrichment for costumes, food, lodging, and assistant cards
4. keep deterministic fallback logic in place so the app is never blocked by AI availability

## Security

Security is a design concern, not a cleanup task for later.

Current guidance:

- keep AI parsing server-side
- scope every competition to an owner id
- restrict child collection reads and writes by parent competition ownership
- store uploaded schedule assets in user-scoped storage paths such as `users/{uid}/schedule-assets/...`
- share least-privilege summaries only
- avoid collecting extra personal data not required for the workflow

Security scaffolding added:

- Firestore rules template: [`firebase/firestore.rules`](/Users/michaelathill/Documents/Businesses/CompCoach/firebase/firestore.rules)
- Storage rules template: [`firebase/storage.rules`](/Users/michaelathill/Documents/Businesses/CompCoach/firebase/storage.rules)

Important note:

- the current native runtime is still using mocked Firebase clients in [`services/firebaseClient.ts`](/Users/michaelathill/Documents/Businesses/CompCoach/services/firebaseClient.ts) while the app shell is being stabilized
- when live Firebase is re-enabled, wire auth and ownership checks before broadening read/write access

## Validation

- Run TypeScript validation:

```bash
npm run typecheck
```

- Run Expo locally:

```bash
npm run start
```

## Future Roadmap

- OCR for screenshots and PDFs
- Link scraping for competition sites
- Parent tips and packing guidance
- Food planning for long days
- Venue and competition reviews
- Costume checklist generation
- Weekend Overview hero card and assistant timeline
- Schedule-aware lodging guidance
