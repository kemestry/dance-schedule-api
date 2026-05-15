import {
  AssistantCard,
  Competition,
  CostumeChecklistItem,
  FoodSuggestion,
  FoodWindow,
  LinkImportInput,
  LodgingPlan,
  ParsedCompetitionPayload,
  RoutineCostume,
  ScheduleEntry,
  StoredScheduleAsset,
} from "@/types/models";

export interface OpenClawParsingRequest {
  sourceType: "link" | "pdf" | "screenshot";
  link?: LinkImportInput;
  asset?: StoredScheduleAsset;
}

export interface OpenClawScheduleEnrichmentRequest {
  competition: Competition;
  entries: ScheduleEntry[];
}

export interface OpenClawScheduleEnrichmentResult {
  routineCostumes: RoutineCostume[];
  costumeChecklistItems: CostumeChecklistItem[];
  foodWindows: FoodWindow[];
  foodSuggestions: FoodSuggestion[];
  lodgingPlans: LodgingPlan[];
  assistantCards: AssistantCard[];
}

async function notConfigured(feature: string): Promise<never> {
  throw new Error(`OpenClaw is not configured for ${feature} yet.`);
}

export const openClawService = {
  isConfigured(): boolean {
    return false;
  },

  async parseCompetition(_request: OpenClawParsingRequest): Promise<ParsedCompetitionPayload> {
    return notConfigured("competition parsing");
  },

  async enrichCompetitionSchedule(
    _request: OpenClawScheduleEnrichmentRequest
  ): Promise<OpenClawScheduleEnrichmentResult> {
    return notConfigured("schedule enrichment");
  },
};
