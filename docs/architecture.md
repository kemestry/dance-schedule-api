# CompCoach Architecture

CompCoach remains a competition-weekend assistant first. The current MVP schedule engine stays the system of record, and new layers are generated from it rather than maintained as separate planning silos.

## Product Layers

1. Schedule
- Source of truth for routines, dancers, and competition context
- Imported from manual entry, screenshot, PDF, or link

2. Costumes
- Linked one-to-one or one-to-many with schedule entries
- Generates checklist items, prep state, and missing item detection

3. Food
- Generated from gaps between routines
- Produces meal, snack, and hydration windows
- Suggests external options without owning ordering

4. Lodging
- Generated from first routine, last routine, and venue context
- Produces departure recommendations and end-of-day guidance

5. Assistant
- Synthesizes the above into dynamic hero cards, reminders, and a time-ordered day view

## Frontend Structure

- `app/(tabs)/schedule.tsx`
  Current schedule screen that will evolve into Weekend Overview
- `providers/AppDataProvider.tsx`
  Owns app-level loaded competitions and imports
- `services/competitionService.ts`
  Persistence boundary for competition data
- `services/parsingService.ts`
  Entry point for OCR/AI/manual parsing
- `services/weekendOverviewService.ts`
  Aggregates selected schedule state into assistant-ready day data
- `utils/schedule.ts`
  Deterministic grouping and conflict detection
- `utils/weekendOverview.ts`
  Deterministic timeline, prep, food, and lodging generation

## Backend / Service Boundaries

Screens should not call Firebase SDKs directly.

Recommended service layer:

- `authService`
  Sign-in, user session, role, and ownership context
- `competitionService`
  Competitions, dancers, schedule entries, selected dancers
- `storageService`
  PDF and screenshot asset upload and metadata
- `parsingService`
  OCR/AI/manual parsing into structured schedule payloads
- `weekendOverviewService`
  Assistant-ready day model built from trusted schedule data
- `costumeService`
  Costume sets and checklist generation
- `foodService`
  Window generation and external suggestion lookup
- `lodgingService`
  Hotel proximity and departure planning
- `shareService`
  Safe outbound summaries with only the right user-visible fields

## Weekend Overview Model

The primary screen should be driven by one aggregate view model:

- `competition`
- `dayKey`
- `summary`
- `nextEntry`
- `prepStartTime`
- `departureTime`
- `heroCountdownMinutes`
- `assistantCards`
- `timelineEvents`
- `foodWindows`
- `lodgingPlan`

This keeps the UI thin and lets you evolve logic without rewriting the screen repeatedly.

## Recommended Firestore Collections

Existing:

- `competitions`
- `dancers`
- `scheduleEntries`
- `selectedDancers`

Next layer:

- `routineCostumes`
- `costumeChecklistItems`
- `foodWindows`
- `foodSuggestions`
- `lodgingPlans`
- `assistantCards`

## API Shape

Recommended backend endpoints:

- `POST /parse-competition`
  Input: link or uploaded asset metadata
  Output: structured competition payload JSON
- `POST /generate-costume-checklist`
  Input: schedule entries + optional costume seed data
  Output: costume set + checklist items
- `POST /generate-weekend-assistant`
  Input: competition snapshot + selected dancer ids
  Output: overview-ready assistant cards, food windows, and lodging plan
- `GET /place-suggestions`
  Input: lat/lng, window type, optional preference tags
  Output: normalized food or hotel recommendations

## Security Model

Security has to be intentional from the beginning because this app stores child-related schedules, travel timing, venue details, and potentially hotel context.

Key principles:

1. Every competition document is owned
- Store `ownerId` on root records
- Propagate ownership checks to child collections

2. Reads are scoped to the signed-in parent
- A user can only read competitions they own
- Child documents are readable only if their parent competition is owned by the same user

3. Writes are validated, not just authenticated
- Prevent cross-competition writes
- Require valid `competitionId`
- Disallow changing `ownerId` after creation

4. Storage paths are user-scoped
- Example: `users/{uid}/schedule-assets/{assetId}`
- Prevent public buckets for uploaded schedules

5. AI parsing should run server-side
- Do not expose private parser secrets in the client
- Return normalized JSON only
- Strip unnecessary metadata before persistence

6. Shared schedule output must be least-privilege
- Share summary text only
- No hidden notes, hotel address, or internal metadata unless explicitly included

7. Minimize PII
- Avoid storing anything not required for the weekend workflow
- Prefer parent-owned anonymous auth until named accounts are necessary

## Security Roadmap

Phase 1:
- Anonymous auth
- Firestore owner checks
- Locked-down Storage paths
- Parser endpoint authenticated with server secrets only

Phase 2:
- Signed share links with expiry
- Audit logging for imports and sharing
- App Check
- Role-aware family collaboration

Phase 3:
- Encrypted sensitive preferences server-side if needed
- Fine-grained access for coaches or extended family
