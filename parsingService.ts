import { dancerColorTokens } from "@/constants/colors";
import { hasRemoteParser } from "@/config/parsing";
import {
  mockAssistantCards,
  mockCompetition,
  mockCostumeChecklistItems,
  mockDancers,
  mockEntries,
  mockFoodSuggestions,
  mockFoodWindows,
  mockLodgingPlans,
  mockRoutineCostumes,
  mockSelectedDancers,
} from "@/constants/mockData";
import { parserApiService } from "@/services/parserApiService";
import { openClawService } from "@/services/openClawService";
import {
  LinkImportInput,
  ManualEntryInput,
  ParsingJob,
  ParsingResult,
  ParsedCompetitionPayload,
  ScheduleEntry,
  SelectedDancer,
  SourceType,
  StoredScheduleAsset,
} from "@/types/models";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildCompetitionId(name: string) {
  return `comp-${slugify(name)}-${Date.now()}`;
}

function buildDancerId(competitionId: string, dancerName: string) {
  return `${competitionId}-${slugify(dancerName)}`;
}

function toIsoDatetime(date: string, time: string) {
  const parsed = new Date(`${date} ${time}`);
  return Number.isNaN(parsed.getTime()) ? `${date}T09:00:00` : parsed.toISOString();
}

function buildPayloadFromManualEntries(entries: ManualEntryInput[]): ParsedCompetitionPayload {
  const competitionId = buildCompetitionId(entries[0].competitionName);
  const uniqueNames = [...new Set(entries.map((entry) => entry.dancerName.trim()))];

  const dancers = uniqueNames.map((name, index) => ({
    id: buildDancerId(competitionId, name),
    competitionId,
    name,
    colorToken: dancerColorTokens[index % dancerColorTokens.length]
  }));

  const scheduleEntries: ScheduleEntry[] = entries.map((entry, index) => {
    const dancer = dancers.find((item) => item.name === entry.dancerName.trim());

    if (!dancer) {
      throw new Error(`Unable to find dancer ${entry.dancerName}`);
    }

    return {
      id: `${competitionId}-entry-${index + 1}`,
      competitionId,
      dancerId: dancer.id,
      eventDate: entry.date,
      eventTime: entry.time,
      datetimeStart: toIsoDatetime(entry.date, entry.time),
      title: entry.routineName,
      category: entry.category,
      performanceType: entry.performanceType,
      notes: entry.notes
    };
  });

  const selectedDancers: SelectedDancer[] = dancers.map((dancer) => ({
    id: `${competitionId}-${dancer.id}-selected`,
    competitionId,
    dancerId: dancer.id
  }));

    return {
      competition: {
        id: competitionId,
        ownerId: "mock-parent-user",
        name: entries[0].competitionName,
        startDate: entries
        .map((entry) => entry.date)
        .sort()[0],
      endDate: entries
        .map((entry) => entry.date)
        .sort()
        .at(-1) ?? entries[0].date,
      sourceType: "manual",
      createdAt: new Date().toISOString()
      },
      dancers,
      entries: scheduleEntries,
      selectedDancers,
      routineCostumes: [],
      costumeChecklistItems: [],
      foodWindows: [],
      foodSuggestions: [],
      lodgingPlans: [],
      assistantCards: [],
    };
}

function buildMockPayload(sourceType: SourceType, sourceUrl?: string): ParsedCompetitionPayload {
  const competitionId = `${mockCompetition.id}-${sourceType}`;
  return {
    competition: {
      ...mockCompetition,
      id: competitionId,
      sourceType,
      sourceUrl
    },
    dancers: mockDancers.map((dancer) => ({
      ...dancer,
      competitionId
    })),
    entries: mockEntries.map((entry) => ({
      ...entry,
      competitionId
    })),
    selectedDancers: mockSelectedDancers.map((selection) => ({
      ...selection,
      competitionId
    })),
    routineCostumes: mockRoutineCostumes.map((item) => ({
      ...item,
      competitionId,
    })),
    costumeChecklistItems: mockCostumeChecklistItems.map((item) => ({
      ...item,
      competitionId,
    })),
    foodWindows: mockFoodWindows.map((item) => ({
      ...item,
      competitionId,
    })),
    foodSuggestions: mockFoodSuggestions.map((item) => ({
      ...item,
      competitionId,
    })),
    lodgingPlans: mockLodgingPlans.map((item) => ({
      ...item,
      competitionId,
    })),
    assistantCards: mockAssistantCards.map((item) => ({
      ...item,
      competitionId,
    })),
  };
}

export const parsingService = {
  async parseCompetitionFromManual(entries: ManualEntryInput[]): Promise<ParsingResult> {
    if (!entries.length) {
      throw new Error("Manual entry requires at least one schedule row.");
    }

    return {
      payload: buildPayloadFromManualEntries(entries),
      metadata: {
        sourceType: "manual",
        isMock: false,
        parserMode: "manual"
      }
    };
  },

  async parseCompetitionFromPdf(asset: StoredScheduleAsset, targetDancerNames?: string[]): Promise<ParsingResult> {
    // OpenClaw can take over orchestration here later without changing screen code.
    if (openClawService.isConfigured()) {
      return {
        payload: await openClawService.parseCompetition({
          sourceType: "pdf",
          asset
        }),
        metadata: {
          sourceType: "pdf",
          isMock: false,
          parserMode: "remote-ai",
          uploadedAsset: asset
        }
      };
    }

    if (hasRemoteParser) {
      return {
        payload: await parserApiService.parseUploadedAsset("pdf", asset, targetDancerNames),
        metadata: {
          sourceType: "pdf",
          isMock: false,
          parserMode: "remote-ai",
          uploadedAsset: asset
        }
      };
    }

    return {
      payload: buildMockPayload("pdf"),
      metadata: {
        sourceType: "pdf",
        isMock: true,
        parserMode: "mock",
        uploadedAsset: asset
      }
    };
  },

  async parseCompetitionFromScreenshot(asset: StoredScheduleAsset, targetDancerNames?: string[]): Promise<ParsingResult> {
    // OpenClaw can take over orchestration here later without changing screen code.
    if (openClawService.isConfigured()) {
      return {
        payload: await openClawService.parseCompetition({
          sourceType: "screenshot",
          asset
        }),
        metadata: {
          sourceType: "screenshot",
          isMock: false,
          parserMode: "remote-ai",
          uploadedAsset: asset
        }
      };
    }

    if (hasRemoteParser) {
      return {
        payload: await parserApiService.parseUploadedAsset("screenshot", asset, targetDancerNames),
        metadata: {
          sourceType: "screenshot",
          isMock: false,
          parserMode: "remote-ai",
          uploadedAsset: asset
        }
      };
    }

    return {
      payload: buildMockPayload("screenshot"),
      metadata: {
        sourceType: "screenshot",
        isMock: true,
        parserMode: "mock",
        uploadedAsset: asset
      }
    };
  },

  async parseCompetitionFromLink(link: LinkImportInput): Promise<ParsingResult> {
    // OpenClaw can take over orchestration here later without changing screen code.
    if (openClawService.isConfigured()) {
      return {
        payload: await openClawService.parseCompetition({
          sourceType: "link",
          link
        }),
        metadata: {
          sourceType: "link",
          isMock: false,
          parserMode: "remote-ai",
          sourceUrl: link.url
        }
      };
    }

    if (hasRemoteParser) {
      return {
        payload: await parserApiService.parseLink(link),
        metadata: {
          sourceType: "link",
          isMock: false,
          parserMode: "remote-ai",
          sourceUrl: link.url
        }
      };
    }

    return {
      payload: buildMockPayload("link", link.url),
      metadata: {
        sourceType: "link",
        isMock: true,
        parserMode: "mock",
        sourceUrl: link.url
      }
    };
  }
,
  async startCompetitionParseFromPdf(asset: StoredScheduleAsset, targetDancerNames?: string[]): Promise<ParsingJob | ParsingResult> {
    if (hasRemoteParser) {
      return parserApiService.createParsingJob({
        sourceType: "pdf",
        asset,
        targetDancerNames
      });
    }

    return {
      payload: buildMockPayload("pdf"),
      metadata: {
        sourceType: "pdf",
        isMock: true,
        parserMode: "mock",
        uploadedAsset: asset
      }
    };
  },

  async startCompetitionParseFromScreenshot(asset: StoredScheduleAsset, targetDancerNames?: string[]): Promise<ParsingJob | ParsingResult> {
    if (hasRemoteParser) {
      return parserApiService.createParsingJob({
        sourceType: "screenshot",
        asset,
        targetDancerNames
      });
    }

    return {
      payload: buildMockPayload("screenshot"),
      metadata: {
        sourceType: "screenshot",
        isMock: true,
        parserMode: "mock",
        uploadedAsset: asset
      }
    };
  },

  async startCompetitionParseFromLink(link: LinkImportInput): Promise<ParsingJob | ParsingResult> {
    if (hasRemoteParser) {
      return parserApiService.createParsingJob({
        sourceType: "link",
        link,
        targetDancerNames: link.targetDancerNames
      });
    }

    return {
      payload: buildMockPayload("link", link.url),
      metadata: {
        sourceType: "link",
        isMock: true,
        parserMode: "mock",
        sourceUrl: link.url
      }
    };
  },

  async getParsingJob(jobId: string): Promise<ParsingJob> {
    return parserApiService.getParsingJob(jobId);
  }
};
