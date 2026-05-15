import { useState } from "react";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { ConflictCard } from "@/components/ConflictCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterChip } from "@/components/FilterChip";
import { ScheduleItemCard } from "@/components/ScheduleItemCard";
import { SectionCard } from "@/components/SectionCard";
import { TimelineEventCard } from "@/components/TimelineEventCard";
import { useCompetitionStore } from "@/hooks/useCompetitionStore";
import { useAppData } from "@/providers/AppDataProvider";
import { AssistantCard, FoodWindow, WeekendOverview } from "@/types/models";

function formatClock(datetime?: string) {
  if (!datetime) {
    return "TBD";
  }

  return new Date(datetime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleDateString([], { month: "long" }).toUpperCase();
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startDate === endDate) {
    return `${startMonth} ${startDay}`;
  }

  return `${startMonth} ${startDay}-${endDay}`;
}

function formatCountdown(minutes?: number) {
  if (minutes == null) {
    return "TBD";
  }

  if (minutes <= 0) {
    return "Now";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!remainder) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

function getFoodWindowLabel(type: FoodWindow["type"]) {
  if (type === "meal") {
    return "Meal window";
  }

  if (type === "snack") {
    return "Snack window";
  }

  return "Hydration window";
}

function getAssistantCardTheme(type: AssistantCard["type"]) {
  switch (type) {
    case "prep-start":
      return {
        backgroundColor: "$surfaceMuted" as const,
        accentColor: "$shellDark" as const,
        label: "Prep cue",
      };
    case "leave-now":
      return {
        backgroundColor: "$accentSoft" as const,
        accentColor: "$shellDark" as const,
        label: "Travel cue",
      };
    case "tight-turnaround":
      return {
        backgroundColor: "$conflictSoft" as const,
        accentColor: "$conflict" as const,
        label: "Watchout",
      };
    default:
      return {
        backgroundColor: "$surfaceMuted" as const,
        accentColor: "$secondaryText" as const,
        label: "Assistant",
      };
  }
}

function getChecklistSummary(
  checklistItemsByEntryId: Record<string, { status: "todo" | "packed" | "missing" }[]>,
  entryId: string
) {
  const items = checklistItemsByEntryId[entryId] ?? [];
  if (!items.length) {
    return {
      summary: undefined,
      tone: "default" as const,
    };
  }

  const packedCount = items.filter((item) => item.status === "packed").length;
  const missingCount = items.filter((item) => item.status === "missing").length;

  if (missingCount > 0) {
    return {
      summary: `${missingCount} missing item${missingCount === 1 ? "" : "s"}`,
      tone: "warning" as const,
    };
  }

  if (packedCount === items.length) {
    return {
      summary: "Costume ready",
      tone: "ready" as const,
    };
  }

  return {
    summary: `${packedCount}/${items.length} packed`,
    tone: "default" as const,
  };
}

function getTodayProgress(overview: WeekendOverview | undefined, currentSelected: string[], store: ReturnType<typeof useCompetitionStore>) {
  if (!overview || !store) {
    return {
      readyCount: 0,
      missingCount: 0,
    };
  }

  const todayEntries = store.snapshot.entries.filter(
    (entry) => entry.eventDate === overview.dayKey && currentSelected.includes(entry.dancerId)
  );

  const missingCount = todayEntries
    .flatMap((entry) => store.checklistItemsByEntryId[entry.id] ?? [])
    .filter((item) => item.status === "missing").length;

  const readyCount = todayEntries.filter((entry) => {
    const items = store.checklistItemsByEntryId[entry.id] ?? [];
    return items.length > 0 && items.every((item) => item.status !== "missing");
  }).length;

  return {
    readyCount,
    missingCount,
  };
}

export default function ScheduleScreen() {
  const { currentCompetitionId, loading, competitions, selectedByCompetitionId, selectDancers } = useAppData();
  const store = useCompetitionStore(currentCompetitionId);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  if (loading) {
    return <AppScreen title="CompCoach" subtitle="Loading competition weekend..." headerVariant="plain" />;
  }

  if (!store || !competitions.length) {
    return (
      <AppScreen
        title="CompCoach"
        subtitle="Your weekend overview will show up here as soon as a competition is added."
        headerVariant="plain"
      >
        <EmptyStateCard
          title="No competition added yet"
          body="Start with manual entry, a screenshot, or a PDF so CompCoach can build a calm, shared weekend plan."
          ctaLabel="Add A Competition"
          onPress={() => router.push("/(tabs)/add")}
        />
      </AppScreen>
    );
  }

  const competition = store.snapshot.competition;
  const overview = store.overview;
  const currentSelected = selectedByCompetitionId[competition.id] ?? [];
  const visibleEntries =
    activeFilter === "all"
      ? store.snapshot.entries.filter((entry) => currentSelected.includes(entry.dancerId))
      : store.snapshot.entries.filter((entry) => entry.dancerId === activeFilter);
  const visibleGroups = store.dayGroups.map((group) => ({
    ...group,
    entries: group.entries.filter(
      (entry) => entry.itemType === "competition" || visibleEntries.some((visible) => visible.id === entry.id)
    ),
  }));
  const activeDayGroup = overview
    ? visibleGroups.find((group) => group.dayKey === overview.dayKey)
    : visibleGroups.find((group) => group.entries.length);
  const tomorrowGroup =
    overview && visibleGroups.length
      ? visibleGroups.find((group) => group.dayKey > overview.dayKey && group.entries.length)
      : visibleGroups.find((group, index) => index > 0 && group.entries.length);
  const checklistItemsByEntryId = store.checklistItemsByEntryId;

  const progress = getTodayProgress(overview, currentSelected, store);

  const featuredEntries = activeDayGroup?.entries.filter((entry) => entry.itemType === "routine").slice(0, 4) ?? [];
  const tomorrowRoutineEntries = tomorrowGroup?.entries.filter((entry) => entry.itemType === "routine") ?? [];

  return (
    <AppScreen
      title="CompCoach"
      subtitle="Calmer competition weekends with clearer timing, cleaner transitions, and fewer forgotten details."
      headerVariant="plain"
    >
      <YStack gap="$2">
        <Text fontSize={13} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={1}>
          {formatDateRange(competition.startDate, competition.endDate)}
        </Text>
        <Text fontSize={40} fontWeight="800" color="$color" letterSpacing={-1.2} lineHeight={44}>
          {competition.name}
        </Text>
        <XStack gap="$2" alignItems="center" flexWrap="wrap">
          <Text fontSize={16} color="$color">
            {competition.venueName ?? "Venue pending"}
          </Text>
          <Text fontSize={16} color="$secondaryText">
            {visibleEntries.length} routines · {store.snapshot.dancers.length} dancers · first at {overview?.nextEntry?.eventTime ?? "TBD"}
          </Text>
        </XStack>
      </YStack>

      {overview ? (
        <YStack
          backgroundColor="$shellDark"
          borderRadius={28}
          padding="$4"
          gap="$4"
          shadowColor="$shadowColor"
          shadowOpacity={0.18}
          shadowRadius={26}
          shadowOffset={{ width: 0, height: 16 }}
        >
          <XStack justifyContent="space-between" alignItems="flex-start" gap="$4">
            <YStack gap="$1.5" flex={1}>
              <Text fontSize={11} fontWeight="700" color="$shellTextOnDark" opacity={0.72} textTransform="uppercase" letterSpacing={1}>
                Next routine
              </Text>
              <Text fontSize={28} fontWeight="800" color="$shellTextOnDark" letterSpacing={-0.8}>
                {overview.nextEntry?.title ?? "No upcoming routine"}
              </Text>
              <Text fontSize={16} color="$shellTextOnDark" opacity={0.82}>
                {overview.nextEntry?.performanceType ?? "Routine"} · {overview.nextEntry?.eventTime ?? "TBD"}
              </Text>
            </YStack>

            <YStack alignItems="flex-end" gap="$1">
              <Text fontSize={11} fontWeight="700" color="$shellTextOnDark" opacity={0.72} textTransform="uppercase" letterSpacing={1}>
                Starts in
              </Text>
              <Text fontSize={38} fontWeight="800" color="$shellTextOnDark" letterSpacing={-1.2}>
                {formatCountdown(overview.heroCountdownMinutes)}
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" flexWrap="wrap">
            <YStack flex={1} minWidth={96} gap="$1.5">
              <Text fontSize={11} fontWeight="700" color="$shellTextOnDark" opacity={0.65} textTransform="uppercase" letterSpacing={0.9}>
                On stage
              </Text>
              <Text fontSize={24} fontWeight="800" color="$shellTextOnDark">
                {overview.nextEntry?.eventTime ?? "TBD"}
              </Text>
            </YStack>
            <YStack flex={1} minWidth={96} gap="$1.5">
              <Text fontSize={11} fontWeight="700" color="$shellTextOnDark" opacity={0.65} textTransform="uppercase" letterSpacing={0.9}>
                Prep starts
              </Text>
              <Text fontSize={24} fontWeight="800" color="$shellTextOnDark">
                {formatClock(overview.prepStartTime)}
              </Text>
            </YStack>
            <YStack flex={1} minWidth={96} gap="$1.5">
              <Text fontSize={11} fontWeight="700" color="$shellTextOnDark" opacity={0.65} textTransform="uppercase" letterSpacing={0.9}>
                Leave hotel
              </Text>
              <Text fontSize={24} fontWeight="800" color="$shellTextOnDark">
                {overview.departureTime ? formatClock(overview.departureTime) : "Ready"}
              </Text>
            </YStack>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center" gap="$3" paddingTop="$2" borderTopWidth={1} borderTopColor="rgba(246, 243, 234, 0.12)">
            <YStack gap="$0.5" flex={1}>
              <Text fontSize={12} color="$shellTextOnDark" opacity={0.7}>
                {overview.nextEntryDancerName ?? "Selected dancer"}
              </Text>
              <Text fontSize={13} color="$shellTextOnDark" opacity={0.62}>
                {progress.missingCount
                  ? `${progress.missingCount} prep item${progress.missingCount === 1 ? "" : "s"} still missing today`
                  : `${progress.readyCount} routine${progress.readyCount === 1 ? "" : "s"} look ready today`}
              </Text>
            </YStack>

            {overview.nextEntry ? (
              <Pressable
                onPress={() => router.push(`/competition/${competition.id}/entry/${overview.nextEntry?.id}`)}
              >
                <YStack
                  backgroundColor="$surface"
                  borderRadius={16}
                  paddingHorizontal="$4"
                  paddingVertical="$2.5"
                >
                  <Text fontSize={13} fontWeight="700" color="$shellDark" textTransform="uppercase" letterSpacing={0.6}>
                    Check details
                  </Text>
                </YStack>
              </Pressable>
            ) : null}
          </XStack>
        </YStack>
      ) : null}

      {overview?.assistantCards.length ? (
        <YStack gap="$3">
          {overview.assistantCards.slice(0, 3).map((card) => {
            const theme = getAssistantCardTheme(card.type);

            return (
              <Pressable
                key={card.id}
                onPress={() => {
                  const relatedEntryId = card.relatedEntryIds?.[0];
                  if (relatedEntryId) {
                    router.push(`/competition/${competition.id}/entry/${relatedEntryId}`);
                  }
                }}
              >
                <XStack
                  backgroundColor="$surface"
                  borderWidth={1}
                  borderColor="$divider"
                  borderRadius={22}
                  padding="$3.5"
                  gap="$3"
                  alignItems="flex-start"
                >
                  <YStack
                    width={46}
                    height={46}
                    borderRadius={16}
                    backgroundColor={theme.backgroundColor}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={18} fontWeight="700" color={theme.accentColor}>
                      {card.type === "prep-start" ? "P" : card.type === "leave-now" ? "L" : "!"}
                    </Text>
                  </YStack>

                  <YStack flex={1} gap="$1">
                    <Text fontSize={18} fontWeight="700" color="$color" letterSpacing={-0.3}>
                      {card.title}
                    </Text>
                    <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                      {card.body}
                    </Text>
                  </YStack>

                  <Text fontSize={18} color="$secondaryText">
                    ›
                  </Text>
                </XStack>
              </Pressable>
            );
          })}
        </YStack>
      ) : null}

      <SectionCard
        title="Day flow"
        subtitle={`${overview?.dayLabel ?? "Today"} in one scan: prep, routines, food windows, and travel cues.`}
      >
        <YStack gap="$3">
          {overview?.timelineEvents.slice(0, 6).map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </YStack>
      </SectionCard>

      {featuredEntries.length ? (
        <SectionCard
          title="Routine lineup"
          subtitle="The routines most likely to drive today’s decisions and prep load."
        >
          <YStack gap="$3">
            {featuredEntries.map((entry) => {
              const costume = store.routineCostumeByEntryId.get(entry.id);
              const checklist = getChecklistSummary(checklistItemsByEntryId, entry.id);

              return (
                <ScheduleItemCard
                  key={entry.id}
                  entry={entry}
                  costumeName={costume?.costumeName}
                  checklistSummary={checklist.summary}
                  checklistTone={checklist.tone}
                  onPress={() => router.push(`/competition/${competition.id}/entry/${entry.id}`)}
                />
              );
            })}
          </YStack>
        </SectionCard>
      ) : null}

      <XStack gap="$3" flexWrap="wrap">
        <SectionCard title="Readiness" subtitle="A quick check before the day speeds up.">
          <XStack gap="$3" flexWrap="wrap">
            <YStack backgroundColor="$background" borderRadius={18} padding="$3" minWidth={132} gap="$1">
              <Text fontSize={12} color="$secondaryText" fontWeight="700" textTransform="uppercase" letterSpacing={0.8}>
                Missing today
              </Text>
              <Text fontSize={26} fontWeight="800" color={progress.missingCount ? "$conflict" : "$color"}>
                {progress.missingCount}
              </Text>
            </YStack>

            <YStack backgroundColor="$background" borderRadius={18} padding="$3" minWidth={132} gap="$1">
              <Text fontSize={12} color="$secondaryText" fontWeight="700" textTransform="uppercase" letterSpacing={0.8}>
                Ready routines
              </Text>
              <Text fontSize={26} fontWeight="800" color="$color">
                {progress.readyCount}
              </Text>
            </YStack>
          </XStack>
        </SectionCard>

        <SectionCard title="Food + travel" subtitle="Only surfaced when timing makes them actionable.">
          <YStack gap="$2.5">
            {overview?.foodWindows[0] ? (
              <YStack backgroundColor="$background" borderRadius={18} padding="$3" gap="$1.5">
                <Text fontSize={13} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.8}>
                  {getFoodWindowLabel(overview.foodWindows[0].type)}
                </Text>
                <Text fontSize={18} fontWeight="800" color="$color">
                  {overview.foodWindows[0].minutesAvailable} min available
                </Text>
                <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                  {overview.foodWindows[0].guidance}
                </Text>
              </YStack>
            ) : null}

            <YStack backgroundColor="$background" borderRadius={18} padding="$3" gap="$1.5">
              <Text fontSize={13} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.8}>
                Departure
              </Text>
              <Text fontSize={18} fontWeight="800" color="$color">
                {overview?.departureTime ? formatClock(overview.departureTime) : "Not set"}
              </Text>
              <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                {competition.venueName ?? "Venue details pending"}
              </Text>
            </YStack>
          </YStack>
        </SectionCard>
      </XStack>

      {tomorrowGroup ? (
        <SectionCard title="Tomorrow preview" subtitle="A small look ahead so tonight’s prep feels easier.">
          <YStack gap="$3">
            <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
              <YStack gap="$1">
                <Text fontSize={18} fontWeight="700" color="$color">
                  {tomorrowGroup.dayLabel}
                </Text>
                <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                  {tomorrowRoutineEntries.length} routine{tomorrowRoutineEntries.length === 1 ? "" : "s"} · first up at {tomorrowRoutineEntries[0]?.eventTime ?? "TBD"}
                </Text>
              </YStack>
              <Text fontSize={20} color="$secondaryText">
                ›
              </Text>
            </XStack>

            <XStack gap="$3">
              {tomorrowRoutineEntries.slice(0, 2).map((entry) => (
                <YStack key={entry.id} backgroundColor="$background" borderRadius={18} padding="$3" flex={1} gap="$1.5">
                  <Text fontSize={12} color="$secondaryText" fontWeight="700" textTransform="uppercase" letterSpacing={0.7}>
                    {entry.eventTime}
                  </Text>
                  <Text fontSize={17} fontWeight="700" color="$color" letterSpacing={-0.3}>
                    {entry.title}
                  </Text>
                  <Text fontSize={13} color="$secondaryText" lineHeight={20}>
                    {entry.dancerName}
                  </Text>
                </YStack>
              ))}
            </XStack>
          </YStack>
        </SectionCard>
      ) : null}

      <SectionCard title="Selected dancers" subtitle="Filter the overview to the people you need to think about right now.">
        <XStack gap="$2" flexWrap="wrap">
          <FilterChip
            label="All"
            active={activeFilter === "all"}
            onPress={() => {
              setActiveFilter("all");
              selectDancers(
                competition.id,
                store.snapshot.dancers.map((dancer) => dancer.id)
              );
            }}
          />
          {store.snapshot.dancers.map((dancer) => {
            const selected = currentSelected.includes(dancer.id);
            return (
              <FilterChip
                key={dancer.id}
                label={dancer.name.split(" ")[0]}
                active={activeFilter === dancer.id || (activeFilter === "all" && selected)}
                onPress={() => {
                  setActiveFilter(dancer.id);
                  selectDancers(competition.id, [dancer.id]);
                }}
              />
            );
          })}
        </XStack>
      </SectionCard>

      {store.conflicts.length ? (
        <SectionCard title="Watchouts" subtitle="Pressure points CompCoach wants in front of you before the day gets noisy.">
          <YStack gap="$3">
            {store.conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </YStack>
        </SectionCard>
      ) : null}
    </AppScreen>
  );
}
