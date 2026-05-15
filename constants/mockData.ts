import {
  AssistantCard,
  Competition,
  CompetitionEvent,
  CostumeChecklistItem,
  Dancer,
  FoodSuggestion,
  FoodWindow,
  LodgingPlan,
  RoutineCostume,
  ScheduleEntry,
  SelectedDancer,
} from "@/types/models";
import { dancerColorTokens } from "@/constants/colors";

export const mockCompetition: Competition = {
  id: "comp-spark-2026",
  ownerId: "mock-parent-user",
  name: "Spark Dance Challenge",
  startDate: "2026-04-17",
  endDate: "2026-04-19",
  sourceType: "manual",
  venueName: "Metro Convention Centre",
  venueCity: "Toronto",
  phase: "upcoming",
  createdAt: "2026-03-24T12:00:00.000Z"
};

export const mockDancers: Dancer[] = [
  {
    id: "dancer-kahlia",
    competitionId: mockCompetition.id,
    name: "Kahlia Athill",
    colorToken: dancerColorTokens[0]
  },
  {
    id: "dancer-kadence",
    competitionId: mockCompetition.id,
    name: "Kadence Athill",
    colorToken: dancerColorTokens[1]
  }
];

export const mockEntries: ScheduleEntry[] = [
  {
    id: "entry-1",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    eventDate: "2026-04-17",
    eventTime: "8:35 AM",
    datetimeStart: "2026-04-17T08:35:00-04:00",
    title: "We're Fabulous",
    category: "Jazz",
    performanceType: "Solo",
    prepMinutes: 90,
    estDurationMinutes: 8
  },
  {
    id: "entry-2",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    eventDate: "2026-04-17",
    eventTime: "8:54 AM",
    datetimeStart: "2026-04-17T08:54:00-04:00",
    title: "No One Goes Unchanged",
    category: "Open",
    performanceType: "Solo",
    prepMinutes: 75,
    estDurationMinutes: 8
  },
  {
    id: "entry-3",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    eventDate: "2026-04-17",
    eventTime: "9:07 AM",
    datetimeStart: "2026-04-17T09:07:00-04:00",
    title: "Golden Hour",
    category: "Lyrical",
    performanceType: "Solo",
    prepMinutes: 60,
    estDurationMinutes: 8
  },
  {
    id: "entry-4",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    eventDate: "2026-04-17",
    eventTime: "10:02 AM",
    datetimeStart: "2026-04-17T10:02:00-04:00",
    title: "Pulse Line",
    category: "Contemporary",
    performanceType: "Group",
    prepMinutes: 60,
    estDurationMinutes: 10
  },
  {
    id: "entry-5",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    eventDate: "2026-04-18",
    eventTime: "2:14 PM",
    datetimeStart: "2026-04-18T14:14:00-04:00",
    title: "Heartbeat",
    category: "Jazz",
    performanceType: "Duo/Trio",
    prepMinutes: 75,
    estDurationMinutes: 8
  },
  {
    id: "entry-6",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    eventDate: "2026-04-18",
    eventTime: "2:20 PM",
    datetimeStart: "2026-04-18T14:20:00-04:00",
    title: "Northbound",
    category: "Contemporary",
    performanceType: "Solo",
    prepMinutes: 75,
    estDurationMinutes: 8
  },
  {
    id: "entry-7",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    eventDate: "2026-04-18",
    eventTime: "3:03 PM",
    datetimeStart: "2026-04-18T15:03:00-04:00",
    title: "Final Bow",
    category: "Musical Theatre",
    performanceType: "Group",
    prepMinutes: 45,
    estDurationMinutes: 10
  },
  {
    id: "entry-8",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    eventDate: "2026-04-19",
    eventTime: "11:10 AM",
    datetimeStart: "2026-04-19T11:10:00-04:00",
    title: "Afterlight",
    category: "Open",
    performanceType: "Solo",
    prepMinutes: 75,
    estDurationMinutes: 8
  }
];

export const mockCompetitionEvents: CompetitionEvent[] = [
  {
    id: "event-judges-break-friday",
    competitionId: mockCompetition.id,
    eventDate: "2026-04-17",
    eventTime: "11:15 AM",
    datetimeStart: "2026-04-17T11:15:00-04:00",
    title: "Judges break",
    type: "judges-break",
    notes: "Ballroom pause before the next age division begins."
  },
  {
    id: "event-awards-friday-junior",
    competitionId: mockCompetition.id,
    eventDate: "2026-04-17",
    eventTime: "12:30 PM",
    datetimeStart: "2026-04-17T12:30:00-04:00",
    title: "Junior awards",
    type: "awards",
    notes: "Stay close to the ballroom and expect lineup movement."
  }
];

export const mockSelectedDancers: SelectedDancer[] = mockDancers.map((dancer) => ({
  id: `selected-${dancer.id}`,
  competitionId: mockCompetition.id,
  dancerId: dancer.id
}));

export const mockRoutineCostumes: RoutineCostume[] = [
  {
    id: "costume-entry-1",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    scheduleEntryId: "entry-1",
    costumeName: "Gold Fringe",
    shoes: ["Tan jazz shoes"],
    accessories: ["Gold hair clip", "Rhinestone earrings"],
    hairNotes: "High ponytail",
    makeupNotes: "Stage glam touch-up",
    source: "template",
  },
  {
    id: "costume-entry-2",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    scheduleEntryId: "entry-2",
    costumeName: "Teal Solo Dress",
    shoes: ["Half soles"],
    accessories: ["Crystal pin"],
    hairNotes: "Low bun",
    makeupNotes: "Soft contemporary eye",
    source: "template",
  },
];

export const mockCostumeChecklistItems: CostumeChecklistItem[] = [
  {
    id: "checklist-1",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    scheduleEntryId: "entry-1",
    routineCostumeId: "costume-entry-1",
    label: "Pack gold fringe costume",
    category: "costume",
    status: "packed",
  },
  {
    id: "checklist-2",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kadence",
    scheduleEntryId: "entry-1",
    routineCostumeId: "costume-entry-1",
    label: "Pack rhinestone earrings",
    category: "accessory",
    status: "missing",
  },
  {
    id: "checklist-3",
    competitionId: mockCompetition.id,
    dancerId: "dancer-kahlia",
    scheduleEntryId: "entry-2",
    routineCostumeId: "costume-entry-2",
    label: "Pack teal solo dress",
    category: "costume",
    status: "packed",
  },
];

export const mockFoodWindows: FoodWindow[] = [
  {
    id: "food-window-friday",
    competitionId: mockCompetition.id,
    dancerIds: ["dancer-kahlia", "dancer-kadence"],
    dayKey: "2026-04-17",
    startTime: "2026-04-17T10:15:00-04:00",
    endTime: "2026-04-17T11:25:00-04:00",
    type: "meal",
    minutesAvailable: 70,
    guidance: "Meal window detected. Pre-order something simple before awards and line-up chaos starts.",
    suggestionIds: ["food-suggestion-1"],
  },
];

export const mockFoodSuggestions: FoodSuggestion[] = [
  {
    id: "food-suggestion-1",
    competitionId: mockCompetition.id,
    foodWindowId: "food-window-friday",
    title: "Freshii",
    reason: "Fast pickup, predictable meals, and easy to eat between routines.",
    cuisine: "Healthy bowls",
    etaMinutes: 12,
    deepLinkUrl: "ubereats://store/freshii",
  },
];

export const mockLodgingPlans: LodgingPlan[] = [
  {
    id: "lodging-friday",
    competitionId: mockCompetition.id,
    dayKey: "2026-04-17",
    hotelName: "Delta Downtown",
    hotelAddress: "75 Lower Simcoe St, Toronto",
    travelMode: "drive",
    estimatedTravelMinutes: 18,
    recommendedDepartureTime: "2026-04-17T07:47:00-04:00",
    endOfDaySuggestion: "Stay close to the hotel tonight and keep dinner easy after the morning rush.",
  },
];

export const mockAssistantCards: AssistantCard[] = [
  {
    id: "assistant-1",
    competitionId: mockCompetition.id,
    type: "prep-start",
    priority: 1,
    dayKey: "2026-04-17",
    title: "Start getting ready by 7:20 AM",
    body: "Kadence is first up with We're Fabulous at 8:35 AM.",
    relatedEntryIds: ["entry-1"],
  },
  {
    id: "assistant-2",
    competitionId: mockCompetition.id,
    type: "leave-now",
    priority: 1,
    dayKey: "2026-04-17",
    title: "Leave hotel by 7:47 AM",
    body: "Allow 18 minutes to get from the hotel to the venue and settle in calmly.",
  },
];
