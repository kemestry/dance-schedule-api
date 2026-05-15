import { Competition, LodgingPlan, ScheduleEntry } from "@/types/models";
import { openClawService } from "@/services/openClawService";
import { buildLodgingPlan } from "@/utils/weekendOverview";

export const lodgingService = {
  buildPlanForDay(competition: Competition, dayKey: string, entries: ScheduleEntry[]): LodgingPlan | undefined {
    const dayEntries = entries.filter((entry) => entry.eventDate === dayKey);
    return buildLodgingPlan(competition, dayKey, dayEntries);
  },

  async generatePlanForDay(competition: Competition, dayKey: string, entries: ScheduleEntry[]) {
    if (!openClawService.isConfigured()) {
      return this.buildPlanForDay(competition, dayKey, entries);
    }

    const dayEntries = entries.filter((entry) => entry.eventDate === dayKey);
    const enrichment = await openClawService.enrichCompetitionSchedule({
      competition,
      entries: dayEntries,
    });

    return (
      enrichment.lodgingPlans.find((plan) => plan.dayKey === dayKey) ??
      this.buildPlanForDay(competition, dayKey, entries)
    );
  },
};
