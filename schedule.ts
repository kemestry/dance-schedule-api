import { CompetitionEvent, Dancer, DayScheduleGroup, ScheduleConflict, ScheduleEntry } from "@/types/models";
import { formatDayLabel, getMinutesBetween, sortByDatetime } from "@/utils/date";

function getCompetitionBadgeLabel(type: CompetitionEvent["type"]) {
  switch (type) {
    case "awards":
      return "Awards";
    case "judges-break":
      return "Judges break";
    case "break":
      return "Break";
    default:
      return "Competition";
  }
}

export function buildDayGroups(
  entries: ScheduleEntry[],
  dancers: Dancer[],
  competitionEvents: CompetitionEvent[] = []
): DayScheduleGroup[] {
  const dancerMap = new Map(dancers.map((dancer) => [dancer.id, dancer]));
  const groups = new Map<string, DayScheduleGroup>();
  const mergedItems = [
    ...sortByDatetime(entries).map((entry) => ({ kind: "routine" as const, datetime: entry.datetimeStart, value: entry })),
    ...competitionEvents
      .slice()
      .sort((left, right) => left.datetimeStart.localeCompare(right.datetimeStart))
      .map((event) => ({ kind: "competition" as const, datetime: event.datetimeStart, value: event })),
  ].sort((left, right) => left.datetime.localeCompare(right.datetime));

  mergedItems.forEach((item) => {
    const dayKey = item.kind === "routine" ? item.value.eventDate : item.value.eventDate;

    if (!groups.has(dayKey)) {
      groups.set(dayKey, {
        dayKey,
        dayLabel: formatDayLabel(dayKey),
        entries: []
      });
    }

    if (item.kind === "routine") {
      const dancer = dancerMap.get(item.value.dancerId);
      groups.get(dayKey)?.entries.push({
        ...item.value,
        itemType: "routine",
        dancerName: dancer?.name ?? "Unknown dancer",
        dancerColor: dancer?.colorToken ?? "#CCCCCC"
      });
      return;
    }

    groups.get(dayKey)?.entries.push({
      ...item.value,
      itemType: "competition",
      badgeLabel: getCompetitionBadgeLabel(item.value.type),
    });
  });

  return [...groups.values()];
}

export function detectScheduleConflicts(entries: ScheduleEntry[], dancers: Dancer[]): ScheduleConflict[] {
  const sortedEntries = sortByDatetime(entries);
  const dancerMap = new Map(dancers.map((dancer) => [dancer.id, dancer.name]));
  const conflicts: ScheduleConflict[] = [];

  for (let index = 0; index < sortedEntries.length - 1; index += 1) {
    const current = sortedEntries[index];
    const next = sortedEntries[index + 1];
    const gapMinutes = getMinutesBetween(current.datetimeStart, next.datetimeStart);

    if (current.eventDate !== next.eventDate) {
      continue;
    }

    if (gapMinutes <= 0) {
      conflicts.push({
        id: `overlap-${current.id}-${next.id}`,
        type: "overlap",
        severity: "high",
        title: "Overlap detected",
        description: `${dancerMap.get(current.dancerId)} and ${dancerMap.get(next.dancerId)} are scheduled at the same time.`,
        relatedEntryIds: [current.id, next.id],
        dayKey: current.eventDate
      });
      continue;
    }

    if (gapMinutes < 20) {
      conflicts.push({
        id: `tight-${current.id}-${next.id}`,
        type: "tight-transition",
        severity: "medium",
        title: `Tight turnaround: ${current.eventTime} → ${next.eventTime}`,
        description: `${gapMinutes} minutes between ${dancerMap.get(current.dancerId)} and ${dancerMap.get(next.dancerId)}.`,
        relatedEntryIds: [current.id, next.id],
        dayKey: current.eventDate
      });
    }
  }

  const entriesByDay = sortedEntries.reduce<Record<string, ScheduleEntry[]>>((accumulator, entry) => {
    accumulator[entry.eventDate] ??= [];
    accumulator[entry.eventDate].push(entry);
    return accumulator;
  }, {});

  Object.entries(entriesByDay).forEach(([dayKey, dayEntries]) => {
    for (let start = 0; start < dayEntries.length; start += 1) {
      const windowStart = dayEntries[start];
      const denseEntries = dayEntries.filter((entry) => {
        const minutes = getMinutesBetween(windowStart.datetimeStart, entry.datetimeStart);
        return minutes >= 0 && minutes <= 90;
      });

      if (denseEntries.length >= 3) {
        conflicts.push({
          id: `density-${dayKey}-${start}`,
          type: "high-density",
          severity: "medium",
          title: "High-density block",
          description: `${denseEntries.length} routines land within 90 minutes. Plan costume, awards, and line changes early.`,
          relatedEntryIds: denseEntries.map((entry) => entry.id),
          dayKey
        });
        break;
      }
    }
  });

  return conflicts;
}

export function generateShareSummary(
  competitionName: string,
  entries: ScheduleEntry[],
  dancers: Dancer[],
  selectedDancerIds: string[]
) {
  const dancerMap = new Map(dancers.map((dancer) => [dancer.id, dancer.name]));
  const selectedNames = dancers
    .filter((dancer) => selectedDancerIds.includes(dancer.id))
    .map((dancer) => dancer.name.split(" ")[0]);

  const title = `${selectedNames.join(" & ")} - ${competitionName}`;
  const groups = buildDayGroups(entries.filter((entry) => selectedDancerIds.includes(entry.dancerId)), dancers);
  const body = groups
    .map(
      (group) =>
        `${group.dayLabel}\n${group.entries
          .map(
            (entry) =>
              entry.itemType === "competition"
                ? `${entry.eventTime} - ${entry.badgeLabel} - ${entry.title}`
                : `${entry.eventTime} - ${dancerMap.get(entry.dancerId)} - ${entry.title} - ${entry.category} ${entry.performanceType}`
          )
          .join("\n")}`
    )
    .join("\n\n");

  return `${title}\n\n${body}`;
}
