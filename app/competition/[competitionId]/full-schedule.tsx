import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Button, Text, XStack, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { FilterChip } from "@/components/FilterChip";
import { ScheduleItemCard as BaseScheduleItemCard } from "@/components/ScheduleItemCard";
import { SectionCard } from "@/components/SectionCard";
import { useCompetitionStore } from "@/hooks/useCompetitionStore";
import { CompetitionEvent, DayScheduleGroup } from "@/types/models";
import { buildDayGroups } from "@/utils/schedule";

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanCompetitionName(name: string) {
  return name
    .replace(/binder schedule/gi, "")
    .replace(/\b(schedule|final|revised)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildDisplayDancerGroups(
  dancers: { id: string; name: string }[]
): Array<{ key: string; label: string; ids: string[] }> {
  const groups = new Map<string, { key: string; label: string; ids: string[] }>();

  dancers.forEach((dancer) => {
    const key = normalizeName(dancer.name);
    const label = dancer.name.split(" ")[0] || dancer.name;
    const existing = groups.get(key);

    if (existing) {
      existing.ids.push(dancer.id);
      return;
    }

    groups.set(key, {
      key,
      label,
      ids: [dancer.id],
    });
  });

  return [...groups.values()];
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

function filterGroups(groups: DayScheduleGroup[], dancerIds: string[]) {
  return groups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => entry.itemType === "competition" || dancerIds.includes(entry.dancerId)),
    }))
    .filter((group) => group.entries.length);
}

function getCompetitionEventTone(type: CompetitionEvent["type"]) {
  switch (type) {
    case "awards":
      return {
        backgroundColor: "$accentSoft" as const,
        railColor: "#B18D4D",
        label: "Awards",
      };
    case "judges-break":
      return {
        backgroundColor: "$surfaceMuted" as const,
        railColor: "#7A97B8",
        label: "Judges break",
      };
    default:
      return {
        backgroundColor: "$surfaceMuted" as const,
        railColor: "$divider" as const,
        label: "Competition",
      };
  }
}

export default function FullScheduleScreen() {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const store = useCompetitionStore(competitionId);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  if (!store) {
    return (
      <AppScreen
        title="Full schedule"
        subtitle="CompCoach could not find that competition."
        headerVariant="plain"
      />
    );
  }

  const competition = store.snapshot.competition;
  const displayDancers = buildDisplayDancerGroups(store.snapshot.dancers);
  const allGroups = buildDayGroups(
    store.snapshot.entries,
    store.snapshot.dancers,
    store.snapshot.competitionEvents ?? []
  );
  const activeIds =
    activeFilter === "all"
      ? store.snapshot.dancers.map((dancer) => dancer.id)
      : displayDancers.find((dancer) => dancer.key === activeFilter)?.ids ?? [];
  const visibleGroups = filterGroups(allGroups, activeIds);

  return (
    <AppScreen
      title="Full schedule"
      subtitle={`${cleanCompetitionName(competition.name) || competition.name} in strict time order across the full weekend.`}
      headerVariant="plain"
    >
      <SectionCard
        title="Filter by dancer"
        subtitle="Keep the entire weekend visible, or narrow it down to one dancer at a time."
      >
        <XStack gap="$2" flexWrap="wrap">
          <FilterChip label="All" active={activeFilter === "all"} onPress={() => setActiveFilter("all")} />
          {displayDancers.map((dancer) => (
            <FilterChip
              key={dancer.key}
              label={dancer.label}
              active={activeFilter === dancer.key}
              onPress={() => setActiveFilter(dancer.key)}
            />
          ))}
        </XStack>
      </SectionCard>

      {visibleGroups.map((group) => (
        <SectionCard
          key={group.dayKey}
          title={group.dayLabel}
          subtitle={`${group.entries.length} event${group.entries.length === 1 ? "" : "s"} in time order.`}
        >
          <YStack gap="$3">
            {group.entries.map((entry) => {
              const costume = store.routineCostumeByEntryId.get(entry.id);
              const checklist = getChecklistSummary(store.checklistItemsByEntryId, entry.id);

              return (
                <FullScheduleItemCard
                  key={entry.id}
                  entry={entry}
                  costumeName={entry.itemType === "routine" ? costume?.costumeName : undefined}
                  checklistSummary={entry.itemType === "routine" ? checklist.summary : undefined}
                  checklistTone={entry.itemType === "routine" ? checklist.tone : undefined}
                  onPress={() =>
                    entry.itemType === "routine"
                      ? router.push(`/competition/${competition.id}/entry/${entry.id}`)
                      : undefined
                  }
                />
              );
            })}
          </YStack>
        </SectionCard>
      ))}

      <Button
        alignSelf="flex-start"
        backgroundColor="$surfaceMuted"
        color="$color"
        onPress={() => router.back()}
      >
        Back To Overview
      </Button>
    </AppScreen>
  );
}

function FullScheduleItemCard({
  entry,
  costumeName,
  checklistSummary,
  checklistTone,
  onPress,
}: {
  entry: DayScheduleGroup["entries"][number];
  costumeName?: string;
  checklistSummary?: string;
  checklistTone?: "default" | "warning" | "ready";
  onPress?: () => void;
}) {
  if (entry.itemType === "competition") {
    const theme = getCompetitionEventTone(entry.type);

    return (
      <XStack
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$divider"
        borderRadius={22}
        paddingHorizontal="$4"
        paddingVertical="$4"
        gap="$4"
        alignItems="center"
      >
        <YStack width={82} gap="$1">
          <Text fontSize={20} fontWeight="800" color="$color" letterSpacing={-0.4}>
            {entry.eventTime}
          </Text>
          <Text fontSize={12} color="$secondaryText" textTransform="uppercase" letterSpacing={0.5}>
            {theme.label}
          </Text>
        </YStack>
        <YStack width={8} alignSelf="stretch" borderRadius={999} style={{ backgroundColor: theme.railColor }} />
        <YStack flex={1} gap="$2">
          <Text fontSize={18} fontWeight="700" color="$color" letterSpacing={-0.2}>
            {entry.title}
          </Text>
          {entry.notes ? (
            <Text fontSize={14} color="$secondaryText" lineHeight={21}>
              {entry.notes}
            </Text>
          ) : null}
          <Text
            fontSize={12}
            fontWeight="700"
            color="$color"
            backgroundColor={theme.backgroundColor}
            paddingHorizontal="$2"
            paddingVertical={6}
            borderRadius={999}
            alignSelf="flex-start"
          >
            {theme.label}
          </Text>
        </YStack>
      </XStack>
    );
  }

  return (
    <BaseScheduleItemCard
      entry={entry}
      costumeName={costumeName}
      checklistSummary={checklistSummary}
      checklistTone={checklistTone}
      onPress={onPress ?? (() => {})}
    />
  );
}
