import { useMemo } from "react";

import { useAppData } from "@/providers/AppDataProvider";
import { weekendOverviewService } from "@/services/weekendOverviewService";
import { CostumeChecklistItem, FoodSuggestion } from "@/types/models";
import { buildDayGroups, detectScheduleConflicts, generateShareSummary } from "@/utils/schedule";

export function useCompetitionStore(competitionId?: string) {
  const { competitions, selectedByCompetitionId } = useAppData();
  const snapshot = competitions.find((item) => item.competition.id === competitionId) ?? competitions[0];

  const selectedDancerIds =
    snapshot && selectedByCompetitionId[snapshot.competition.id]?.length
      ? selectedByCompetitionId[snapshot.competition.id]
      : snapshot?.dancers.map((dancer) => dancer.id) ?? [];

  const filteredEntries =
    snapshot?.entries.filter((entry) => selectedDancerIds.includes(entry.dancerId)) ?? [];

  return useMemo(() => {
    if (!snapshot) {
      return null;
    }

    const routineCostumeByEntryId = new Map(
      (snapshot.routineCostumes ?? []).map((item) => [item.scheduleEntryId, item])
    );
    const checklistItemsByEntryId = (snapshot.costumeChecklistItems ?? []).reduce<
      Record<string, CostumeChecklistItem[]>
    >((accumulator, item) => {
      (accumulator[item.scheduleEntryId] ??= []).push(item);
      return accumulator;
    }, {});
    const foodSuggestionsByWindowId = (snapshot.foodSuggestions ?? []).reduce<Record<string, FoodSuggestion[]>>(
      (accumulator, item) => {
        (accumulator[item.foodWindowId] ??= []).push(item);
        return accumulator;
      },
      {}
    );

    return {
      snapshot,
      selectedDancerIds,
      dayGroups: buildDayGroups(filteredEntries, snapshot.dancers, snapshot.competitionEvents ?? []),
      conflicts: detectScheduleConflicts(filteredEntries, snapshot.dancers),
      overview: weekendOverviewService.buildOverview(snapshot, selectedDancerIds),
      routineCostumeByEntryId,
      checklistItemsByEntryId,
      foodSuggestionsByWindowId,
      shareText: generateShareSummary(
        snapshot.competition.name,
        snapshot.entries,
        snapshot.dancers,
        selectedDancerIds,
        snapshot.competitionEvents ?? []
      )
    };
  }, [filteredEntries, selectedDancerIds, snapshot]);
}
