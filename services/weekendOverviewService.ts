import { CompetitionSnapshot } from "@/services/competitionService";
import { WeekendOverview } from "@/types/models";
import { detectScheduleConflicts } from "@/utils/schedule";
import { buildWeekendOverview } from "@/utils/weekendOverview";

export const weekendOverviewService = {
  buildOverview(
    snapshot: CompetitionSnapshot,
    selectedDancerIds: string[],
    options?: { dayKey?: string; now?: string }
  ): WeekendOverview | undefined {
    const entries = snapshot.entries.filter((entry) => selectedDancerIds.includes(entry.dancerId));
    const dancers = snapshot.dancers.filter((dancer) => selectedDancerIds.includes(dancer.id));
    const conflicts = detectScheduleConflicts(entries, dancers);
    const competitionEvents = snapshot.competitionEvents ?? [];

    const overview = buildWeekendOverview({
      competition: snapshot.competition,
      entries,
      dancers,
      competitionEvents,
      conflicts,
      dayKey: options?.dayKey,
      now: options?.now,
    });

    if (!overview) {
      return undefined;
    }

    const foodWindows =
      snapshot.foodWindows?.filter((item) => item.dayKey === overview.dayKey) ?? overview.foodWindows;
    const lodgingPlan =
      snapshot.lodgingPlans?.find((item) => item.dayKey === overview.dayKey) ?? overview.lodgingPlan;
    const assistantCards =
      snapshot.assistantCards?.filter((item) => item.dayKey === overview.dayKey) ?? overview.assistantCards;

    return {
      ...overview,
      foodWindows,
      lodgingPlan,
      departureTime: lodgingPlan?.recommendedDepartureTime ?? overview.departureTime,
      assistantCards,
    };
  },
};
