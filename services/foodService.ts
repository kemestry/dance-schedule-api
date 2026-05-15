import { FoodSuggestion, FoodWindow } from "@/types/models";
import { openClawService } from "@/services/openClawService";

export const foodService = {
  buildFoodWindowsForEntries(competitionId: string, dayKey: string, windows: FoodWindow[]): FoodWindow[] {
    return windows.filter((window) => window.competitionId === competitionId && window.dayKey === dayKey);
  },

  buildMockSuggestions(windows: FoodWindow[]): FoodSuggestion[] {
    return windows.map((window, index) => ({
      id: `food-suggestion-${window.id}-${index + 1}`,
      competitionId: window.competitionId,
      foodWindowId: window.id,
      title: window.type === "meal" ? "Freshii" : window.type === "snack" ? "Starbucks" : "Water refill + granola bar",
      reason:
        window.type === "meal"
          ? "Fast pickup and predictable meals for a longer break."
          : window.type === "snack"
            ? "Quick snack option that keeps you close to the venue."
            : "Keep it light and stay close to the ballroom.",
      etaMinutes: window.type === "meal" ? 12 : 6,
    }));
  },

  async generateSuggestions(windows: FoodWindow[]) {
    if (!openClawService.isConfigured() || !windows.length) {
      return this.buildMockSuggestions(windows);
    }

    const firstWindow = windows[0];
    const enrichment = await openClawService.enrichCompetitionSchedule({
      competition: {
        id: firstWindow.competitionId,
        name: "",
        startDate: firstWindow.dayKey,
        endDate: firstWindow.dayKey,
        sourceType: "manual",
        createdAt: new Date().toISOString(),
      },
      entries: [],
    });

    return enrichment.foodSuggestions;
  },
};
