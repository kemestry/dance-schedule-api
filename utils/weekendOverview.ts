import {
  AssistantCard,
  Competition,
  CompetitionEvent,
  Dancer,
  FoodWindow,
  LodgingPlan,
  ScheduleConflict,
  ScheduleEntry,
  TimelineEvent,
  WeekendOverview,
} from "@/types/models";
import { formatDayLabel, getMinutesBetween, sortByDatetime } from "@/utils/date";

const DEFAULT_PREP_MINUTES = 75;
const DEFAULT_TRAVEL_MINUTES = 20;
const DEFAULT_ROUTINE_DURATION = 8;

function formatTime(datetime: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(datetime));
}

function subtractMinutes(datetime: string, minutes: number) {
  const date = new Date(datetime);
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
}

function formatRelativeCountdown(targetDatetime: string, now: Date) {
  const totalMinutes = getMinutesBetween(now.toISOString(), targetDatetime);

  if (totalMinutes <= 0) {
    return "Now";
  }

  if (totalMinutes < 60) {
    return `In ${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `In ${hours}h`;
  }

  return `In ${hours}h ${minutes}m`;
}

function formatEntryTimingLabel(datetime: string, now: Date) {
  const entryDate = new Date(datetime);
  const sameDay = entryDate.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = entryDate.toDateString() === tomorrow.toDateString();
  const timeLabel = formatTime(datetime);

  if (sameDay) {
    return `Today at ${timeLabel}`;
  }

  if (isTomorrow) {
    return `Tomorrow at ${timeLabel}`;
  }

  return `${formatDayLabel(datetime.slice(0, 10))} at ${timeLabel}`;
}

function formatActionTimingLabel(targetDatetime: string | undefined, now: Date, fallback: string) {
  if (!targetDatetime) {
    return fallback;
  }

  const minutesUntil = getMinutesBetween(now.toISOString(), targetDatetime);

  if (minutesUntil <= 0) {
    return "Now";
  }

  if (minutesUntil < 60) {
    return `In ${minutesUntil}m`;
  }

  return formatTime(targetDatetime);
}

function buildFoodWindows(entries: ScheduleEntry[]): FoodWindow[] {
  const sorted = sortByDatetime(entries);
  const windows: FoodWindow[] = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];

    if (current.eventDate !== next.eventDate) {
      continue;
    }

    const currentDuration = current.estDurationMinutes ?? DEFAULT_ROUTINE_DURATION;
    const currentEnd = new Date(current.datetimeStart);
    currentEnd.setMinutes(currentEnd.getMinutes() + currentDuration);
    const gapMinutes = getMinutesBetween(currentEnd.toISOString(), next.datetimeStart);

    if (gapMinutes < 10) {
      continue;
    }

    let type: FoodWindow["type"] | null = null;
    let guidance = "";

    if (gapMinutes >= 60) {
      type = "meal";
      guidance = "Meal window detected. A quick sit-down or pre-order pickup is realistic here.";
    } else if (gapMinutes >= 20) {
      type = "snack";
      guidance = "Snack window detected. Keep it fast, predictable, and easy to digest.";
    } else {
      type = "hydration";
      guidance = "Hydration-only window. Stay close to the ballroom and keep transitions light.";
    }

    windows.push({
      id: `food-${current.id}-${next.id}`,
      competitionId: current.competitionId,
      dancerIds: [current.dancerId, next.dancerId],
      dayKey: current.eventDate,
      startTime: currentEnd.toISOString(),
      endTime: next.datetimeStart,
      type,
      minutesAvailable: gapMinutes,
      guidance,
    });
  }

  return windows;
}

function buildTimelineEvents(
  entries: ScheduleEntry[],
  dancers: Dancer[],
  foodWindows: FoodWindow[],
  competitionEvents: CompetitionEvent[],
  lodgingPlan?: LodgingPlan
): TimelineEvent[] {
  const dancerMap = new Map(dancers.map((dancer) => [dancer.id, dancer.name]));

  const prepEvents = entries.map((entry) => ({
    id: `prep-${entry.id}`,
    competitionId: entry.competitionId,
    dayKey: entry.eventDate,
    datetime: subtractMinutes(entry.datetimeStart, entry.prepMinutes ?? DEFAULT_PREP_MINUTES),
    type: "prep" as const,
    title: `Prep for ${entry.title}`,
    subtitle: `${dancerMap.get(entry.dancerId) ?? "Unknown dancer"} starts getting ready`,
    relatedEntryId: entry.id,
    dancerId: entry.dancerId,
  }));

  const routineEvents = entries.map((entry) => ({
    id: `routine-${entry.id}`,
    competitionId: entry.competitionId,
    dayKey: entry.eventDate,
    datetime: entry.datetimeStart,
    type: "routine" as const,
    title: entry.title,
    subtitle: `${dancerMap.get(entry.dancerId) ?? "Unknown dancer"} · ${entry.performanceType}`,
    relatedEntryId: entry.id,
    dancerId: entry.dancerId,
  }));

  const foodEvents = foodWindows.map((window) => ({
    id: `timeline-${window.id}`,
    competitionId: window.competitionId,
    dayKey: window.dayKey,
    datetime: window.startTime,
    type: "food" as const,
    title: `${window.type[0].toUpperCase()}${window.type.slice(1)} window`,
    subtitle: `${window.minutesAvailable} minutes available`,
  }));

  const travelEvents = lodgingPlan
    ? [
        {
          id: `travel-${lodgingPlan.id}`,
          competitionId: lodgingPlan.competitionId,
          dayKey: lodgingPlan.dayKey,
          datetime: lodgingPlan.recommendedDepartureTime,
          type: "travel" as const,
          title: "Leave for venue",
          subtitle: `${lodgingPlan.estimatedTravelMinutes} minute ${lodgingPlan.travelMode}`,
        },
      ]
    : [];

  const competitionWideEvents = competitionEvents.map((event) => ({
    id: `competition-${event.id}`,
    competitionId: event.competitionId,
    dayKey: event.eventDate,
    datetime: event.datetimeStart,
    type: "competition" as const,
    title: event.title,
    subtitle: event.notes ?? event.locationLabel ?? "Competition-wide event",
    eventKind: event.type,
  }));

  return [...prepEvents, ...routineEvents, ...foodEvents, ...travelEvents, ...competitionWideEvents].sort((left, right) =>
    left.datetime.localeCompare(right.datetime)
  );
}

function buildAssistantCards(
  competition: Competition,
  dayKey: string,
  nextEntry: ScheduleEntry | undefined,
  dancers: Dancer[],
  foodWindows: FoodWindow[],
  conflicts: ScheduleConflict[],
  lodgingPlan?: LodgingPlan
): AssistantCard[] {
  const dancerMap = new Map(dancers.map((dancer) => [dancer.id, dancer.name]));
  const cards: AssistantCard[] = [];

  if (nextEntry) {
    const prepMinutes = nextEntry.prepMinutes ?? DEFAULT_PREP_MINUTES;
    cards.push({
      id: `assistant-prep-${nextEntry.id}`,
      competitionId: competition.id,
      type: "prep-start",
      priority: 1,
      dayKey,
      title: `Start getting ready by ${formatTime(subtractMinutes(nextEntry.datetimeStart, prepMinutes))}`,
      body: `${dancerMap.get(nextEntry.dancerId) ?? "Your dancer"} is next with ${nextEntry.title} at ${nextEntry.eventTime}.`,
      relatedEntryIds: [nextEntry.id],
    });
  }

  if (lodgingPlan) {
    cards.push({
      id: `assistant-leave-${lodgingPlan.id}`,
      competitionId: competition.id,
      type: "leave-now",
      priority: 1,
      dayKey,
      title: `Leave by ${formatTime(lodgingPlan.recommendedDepartureTime)}`,
      body: `${lodgingPlan.estimatedTravelMinutes} minute ${lodgingPlan.travelMode} from hotel to venue.`,
    });
  }

  const topFoodWindow = foodWindows[0];
  if (topFoodWindow) {
    const type =
      topFoodWindow.type === "meal"
        ? "meal-window"
        : topFoodWindow.type === "snack"
          ? "snack-window"
          : "hydration-window";
    cards.push({
      id: `assistant-food-${topFoodWindow.id}`,
      competitionId: competition.id,
      type,
      priority: 2,
      dayKey,
      title: `${topFoodWindow.minutesAvailable} minute ${topFoodWindow.type} window`,
      body: topFoodWindow.guidance,
    });
  }

  const tightConflict = conflicts.find((conflict) => conflict.type === "tight-transition" && conflict.dayKey === dayKey);
  if (tightConflict) {
    cards.push({
      id: `assistant-conflict-${tightConflict.id}`,
      competitionId: competition.id,
      type: "tight-turnaround",
      priority: 2,
      dayKey,
      title: tightConflict.title,
      body: tightConflict.description,
      relatedEntryIds: tightConflict.relatedEntryIds,
    });
  }

  return cards.sort((left, right) => left.priority - right.priority);
}

export function buildLodgingPlan(
  competition: Competition,
  dayKey: string,
  entries: ScheduleEntry[]
): LodgingPlan | undefined {
  if (!entries.length) {
    return undefined;
  }

  const firstEntry = sortByDatetime(entries)[0];
  return {
    id: `lodging-${competition.id}-${dayKey}`,
    competitionId: competition.id,
    dayKey,
    travelMode: "drive",
    estimatedTravelMinutes: DEFAULT_TRAVEL_MINUTES,
    recommendedDepartureTime: subtractMinutes(firstEntry.datetimeStart, DEFAULT_TRAVEL_MINUTES),
    endOfDaySuggestion: "Plan dinner close to the hotel and avoid one more long drive after awards.",
  };
}

export function buildWeekendOverview(params: {
  competition: Competition;
  entries: ScheduleEntry[];
  dancers: Dancer[];
  competitionEvents?: CompetitionEvent[];
  conflicts: ScheduleConflict[];
  dayKey?: string;
  now?: string;
}): WeekendOverview | undefined {
  const { competition, dancers, conflicts } = params;
  const now = params.now ? new Date(params.now) : new Date();
  const relevantEntries = sortByDatetime(params.entries);
  const competitionEvents = (params.competitionEvents ?? [])
    .slice()
    .sort((left, right) => left.datetimeStart.localeCompare(right.datetimeStart));

  if (!relevantEntries.length) {
    return undefined;
  }

  const targetDayKey =
    params.dayKey ??
    relevantEntries.find((entry) => new Date(entry.datetimeStart) >= now)?.eventDate ??
    relevantEntries[0].eventDate;

  const dayEntries = relevantEntries.filter((entry) => entry.eventDate === targetDayKey);
  if (!dayEntries.length) {
    return undefined;
  }

  const upcomingEntry = dayEntries.find((entry) => new Date(entry.datetimeStart) >= now);
  const completedDay = !upcomingEntry;
  const nextEntry = upcomingEntry ?? dayEntries[dayEntries.length - 1];
  const dayCompetitionEvents = competitionEvents.filter((event) => event.eventDate === targetDayKey);
  const foodWindows = buildFoodWindows(dayEntries);
  const lodgingPlan = buildLodgingPlan(competition, targetDayKey, dayEntries);
  const assistantCards = buildAssistantCards(
    competition,
    targetDayKey,
    nextEntry,
    dancers,
    foodWindows,
    conflicts,
    lodgingPlan
  );
  const timelineEvents = buildTimelineEvents(dayEntries, dancers, foodWindows, dayCompetitionEvents, lodgingPlan);
  const prepStartTime = subtractMinutes(nextEntry.datetimeStart, nextEntry.prepMinutes ?? DEFAULT_PREP_MINUTES);
  const heroCountdownMinutes = Math.max(0, getMinutesBetween(now.toISOString(), nextEntry.datetimeStart));
  const nextEntryDancerName = dancers.find((dancer) => dancer.id === nextEntry.dancerId)?.name;
  const heroState = completedDay
    ? "completed"
    : heroCountdownMinutes <= 10
      ? "live"
      : heroCountdownMinutes <= 60
        ? "soon"
        : "upcoming";
  const heroCountdownLabel = completedDay ? "Completed" : formatRelativeCountdown(nextEntry.datetimeStart, now);
  const nextEntryTimingLabel = completedDay
    ? `Completed at ${formatTime(nextEntry.datetimeStart)}`
    : formatEntryTimingLabel(nextEntry.datetimeStart, now);
  const prepStatusLabel = completedDay
    ? "Done"
    : formatActionTimingLabel(prepStartTime, now, "Prep set");
  const departureTime = lodgingPlan?.recommendedDepartureTime;
  const departureStatusLabel = completedDay
    ? "Done"
    : formatActionTimingLabel(departureTime, now, "Venue ready");
  const summary = completedDay
    ? `${dayEntries.length} routines today${dayCompetitionEvents.length ? ` · ${dayCompetitionEvents.length} key event${dayCompetitionEvents.length === 1 ? "" : "s"}` : ""} · day complete`
    : `${dayEntries.length} routines today${dayCompetitionEvents.length ? ` · ${dayCompetitionEvents.length} key event${dayCompetitionEvents.length === 1 ? "" : "s"}` : ""} · first at ${dayEntries[0].eventTime}`;

  return {
    competition,
    dayKey: targetDayKey,
    dayLabel: formatDayLabel(targetDayKey),
    summary,
    nextEntry,
    nextEntryDancerName,
    nextEntryTimingLabel,
    prepStartTime,
    prepStatusLabel,
    departureTime,
    departureStatusLabel,
    heroCountdownMinutes,
    heroCountdownLabel,
    heroState,
    assistantCards,
    timelineEvents,
    foodWindows,
    lodgingPlan,
  };
}
