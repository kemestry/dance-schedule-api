export type SourceType = "manual" | "link" | "screenshot" | "pdf";

export type PerformanceType = "Solo" | "Duo/Trio" | "Group" | "Line" | "Production";
export type CompetitionPhase = "upcoming" | "live" | "complete";
export type ChecklistStatus = "todo" | "packed" | "missing";
export type FoodWindowType = "meal" | "snack" | "hydration";
export type TravelMode = "walk" | "drive" | "shuttle";
export type CompetitionEventType = "awards" | "judges-break" | "break" | "announcement";
export type AssistantCardType =
  | "prep-start"
  | "leave-now"
  | "meal-window"
  | "snack-window"
  | "hydration-window"
  | "tight-turnaround"
  | "tomorrow-preview";
export type TimelineEventType = "prep" | "routine" | "food" | "travel" | "assistant" | "competition";

export interface Competition {
  id: string;
  ownerId?: string;
  name: string;
  startDate: string;
  endDate: string;
  sourceType: SourceType;
  sourceUrl?: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  phase?: CompetitionPhase;
  createdAt: string;
}

export interface Dancer {
  id: string;
  competitionId: string;
  name: string;
  colorToken: string;
}

export interface ScheduleEntry {
  id: string;
  competitionId: string;
  dancerId: string;
  eventDate: string;
  eventTime: string;
  datetimeStart: string;
  title: string;
  category: string;
  performanceType: PerformanceType;
  prepMinutes?: number;
  estDurationMinutes?: number;
  locationLabel?: string;
  notes?: string;
}

export interface CompetitionEvent {
  id: string;
  competitionId: string;
  eventDate: string;
  eventTime: string;
  datetimeStart: string;
  title: string;
  type: CompetitionEventType;
  notes?: string;
  locationLabel?: string;
}

export interface SelectedDancer {
  id: string;
  competitionId: string;
  dancerId: string;
}

export interface ParsedCompetitionPayload {
  competition: Competition;
  dancers: Dancer[];
  entries: ScheduleEntry[];
  competitionEvents?: CompetitionEvent[];
  selectedDancers?: SelectedDancer[];
  routineCostumes?: RoutineCostume[];
  costumeChecklistItems?: CostumeChecklistItem[];
  foodWindows?: FoodWindow[];
  foodSuggestions?: FoodSuggestion[];
  lodgingPlans?: LodgingPlan[];
  assistantCards?: AssistantCard[];
}

export interface RoutineCostume {
  id: string;
  competitionId: string;
  dancerId: string;
  scheduleEntryId: string;
  costumeName: string;
  shoes?: string[];
  accessories?: string[];
  hairNotes?: string;
  makeupNotes?: string;
  source: "template" | "manual" | "ai";
}

export interface CostumeChecklistItem {
  id: string;
  competitionId: string;
  dancerId: string;
  scheduleEntryId: string;
  routineCostumeId?: string;
  label: string;
  category: "costume" | "shoes" | "accessory" | "hair" | "makeup" | "other";
  status: ChecklistStatus;
}

export interface FoodWindow {
  id: string;
  competitionId: string;
  dancerIds: string[];
  dayKey: string;
  startTime: string;
  endTime: string;
  type: FoodWindowType;
  minutesAvailable: number;
  guidance: string;
  suggestionIds?: string[];
}

export interface FoodSuggestion {
  id: string;
  competitionId: string;
  foodWindowId: string;
  title: string;
  reason: string;
  cuisine?: string;
  etaMinutes?: number;
  deepLinkUrl?: string;
}

export interface LodgingPlan {
  id: string;
  competitionId: string;
  dayKey: string;
  hotelName?: string;
  hotelAddress?: string;
  travelMode: TravelMode;
  estimatedTravelMinutes: number;
  recommendedDepartureTime: string;
  endOfDaySuggestion?: string;
}

export interface AssistantCard {
  id: string;
  competitionId: string;
  type: AssistantCardType;
  priority: 1 | 2 | 3;
  dayKey: string;
  title: string;
  body: string;
  actionLabel?: string;
  relatedEntryIds?: string[];
}

export interface TimelineEvent {
  id: string;
  competitionId: string;
  dayKey: string;
  datetime: string;
  type: TimelineEventType;
  title: string;
  subtitle?: string;
  relatedEntryId?: string;
  dancerId?: string;
  eventKind?: CompetitionEventType;
}

export interface WeekendOverview {
  competition: Competition;
  dayKey: string;
  dayLabel: string;
  summary: string;
  nextEntry?: ScheduleEntry;
  nextEntryDancerName?: string;
  prepStartTime?: string;
  departureTime?: string;
  heroCountdownMinutes?: number;
  assistantCards: AssistantCard[];
  timelineEvents: TimelineEvent[];
  foodWindows: FoodWindow[];
  lodgingPlan?: LodgingPlan;
}

export interface ImportedScheduleAsset {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface StoredScheduleAsset extends ImportedScheduleAsset {
  storagePath: string;
  downloadUrl?: string;
}

export interface LinkImportInput {
  url: string;
  targetDancerNames?: string[];
}

export interface ParsingMetadata {
  sourceType: SourceType;
  isMock: boolean;
  parserMode: "manual" | "mock" | "remote-ai";
  uploadedAsset?: StoredScheduleAsset;
  sourceUrl?: string;
}

export interface ParsingResult {
  payload: ParsedCompetitionPayload;
  metadata: ParsingMetadata;
}

export type ParsingJobStatus = "queued" | "processing" | "completed" | "failed";
export type ParsingJobStage =
  | "queued"
  | "uploading"
  | "extracting-pdf-text"
  | "matching-dancer-names"
  | "building-schedule"
  | "processing-image"
  | "fetching-link"
  | "completed"
  | "failed";

export interface ParsingJob {
  id: string;
  status: ParsingJobStatus;
  sourceType: Exclude<SourceType, "manual">;
  createdAt: string;
  updatedAt: string;
  stage?: ParsingJobStage;
  targetDancerNames?: string[];
  payload?: ParsedCompetitionPayload;
  error?: string;
}

export interface ManualEntryInput {
  competitionName: string;
  date: string;
  dancerName: string;
  time: string;
  routineName: string;
  category: string;
  performanceType: PerformanceType;
  notes?: string;
}

export interface ShareableScheduleItem {
  dayLabel: string;
  lines: string[];
}

export type ConflictType = "overlap" | "tight-transition" | "high-density";

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  severity: "high" | "medium";
  title: string;
  description: string;
  relatedEntryIds: string[];
  dayKey: string;
}

export interface DayScheduleGroup {
  dayKey: string;
  dayLabel: string;
  entries: Array<
    | (ScheduleEntry & { itemType: "routine"; dancerName: string; dancerColor: string })
    | (CompetitionEvent & { itemType: "competition"; badgeLabel: string })
  >;
}
