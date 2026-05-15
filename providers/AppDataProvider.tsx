import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

import { authService } from "@/services/authService";
import { competitionService, CompetitionSnapshot } from "@/services/competitionService";
import { parsingService } from "@/services/parsingService";
import { storageService } from "@/services/storageService";
import {
  ChecklistStatus,
  CostumeChecklistItem,
  ImportedScheduleAsset,
  LinkImportInput,
  ManualEntryInput,
  ParsingJob,
  ParsedCompetitionPayload,
  RoutineCostume
} from "@/types/models";

interface AppDataContextValue {
  competitions: CompetitionSnapshot[];
  loading: boolean;
  activeParsingJob: ParsingJob | null;
  currentCompetitionId?: string;
  selectedByCompetitionId: Record<string, string[]>;
  refresh: () => Promise<void>;
  setCurrentCompetition: (competitionId: string) => void;
  deleteCompetition: (competitionId: string) => Promise<void>;
  selectDancers: (competitionId: string, dancerIds: string[]) => void;
  addManualEntries: (entries: ManualEntryInput[]) => Promise<string>;
  importCompetitionFromLink: (
    link: LinkImportInput
  ) => Promise<{ competitionId?: string; isMock: boolean; parsingJob?: ParsingJob }>;
  importCompetitionFromAsset: (
    sourceType: "pdf" | "screenshot",
    asset: ImportedScheduleAsset,
    targetDancerNames?: string[]
  ) => Promise<{ competitionId?: string; isMock: boolean; parsingJob?: ParsingJob }>;
  refreshParsingJob: (jobId: string) => Promise<ParsingJob>;
  clearParsingJob: () => void;
  updateChecklistItemStatus: (itemId: string, status: ChecklistStatus) => Promise<void>;
  updateChecklistItemsStatus: (itemIds: string[], status: ChecklistStatus) => Promise<void>;
  addChecklistItem: (item: CostumeChecklistItem) => Promise<void>;
  upsertChecklistItems: (items: CostumeChecklistItem[]) => Promise<void>;
  upsertRoutineCostume: (item: RoutineCostume) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function toSelectedState(snapshots: CompetitionSnapshot[]) {
  return snapshots.reduce<Record<string, string[]>>((accumulator, snapshot) => {
    accumulator[snapshot.competition.id] =
      snapshot.selectedDancers?.map((selection) => selection.dancerId) ??
      snapshot.dancers.map((dancer) => dancer.id);
    return accumulator;
  }, {});
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [competitions, setCompetitions] = useState<CompetitionSnapshot[]>([]);
  const [activeParsingJob, setActiveParsingJob] = useState<ParsingJob | null>(null);
  const [selectedByCompetitionId, setSelectedByCompetitionId] = useState<Record<string, string[]>>({});
  const [currentCompetitionId, setCurrentCompetitionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);

    try {
      await authService.ensureSignedIn();
      const snapshots = await competitionService.listCompetitions();
      setCompetitions(snapshots);
      setSelectedByCompetitionId(toSelectedState(snapshots));
      setCurrentCompetitionId((current) => current ?? snapshots[0]?.competition.id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void refresh();

      if (activeParsingJob && activeParsingJob.status !== "completed" && activeParsingJob.status !== "failed") {
        void refreshParsingJob(activeParsingJob.id).catch(() => {
          // Keep the current UI state if a foreground refresh fails; the user can retry explicitly.
        });
      }
    });

    return () => subscription.remove();
  }, [activeParsingJob]);

  const persistAndAppend = async (payload: ParsedCompetitionPayload) => {
    const session = await authService.ensureSignedIn();
    const ownedPayload = {
      ...payload,
      competition: {
        ...payload.competition,
        ownerId: session.uid
      }
    };

    await competitionService.saveParsedCompetition(ownedPayload);
    setCompetitions((current) => {
      const existingIndex = current.findIndex((snapshot) => snapshot.competition.id === ownedPayload.competition.id);

      if (existingIndex === -1) {
        return [...current, ownedPayload as CompetitionSnapshot];
      }

      return current.map((snapshot) =>
        snapshot.competition.id === ownedPayload.competition.id
          ? (ownedPayload as CompetitionSnapshot)
          : snapshot
      );
    });
    setSelectedByCompetitionId((current) => ({
      ...current,
      [ownedPayload.competition.id]:
        ownedPayload.selectedDancers?.map((item) => item.dancerId) ?? ownedPayload.dancers.map((item) => item.id)
    }));
    setCurrentCompetitionId(ownedPayload.competition.id);
    return ownedPayload.competition.id;
  };

  const updateChecklistItemStatus = async (itemId: string, status: ChecklistStatus) => {
    await competitionService.updateChecklistItemStatus(itemId, status);
    setCompetitions((current) =>
      current.map((snapshot) => {
        const items = snapshot.costumeChecklistItems ?? [];

        if (!items.some((item) => item.id === itemId)) {
          return snapshot;
        }

        return {
          ...snapshot,
          costumeChecklistItems: items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status
                }
              : item
          )
        };
      })
    );
  };

  const updateChecklistItemsStatus = async (itemIds: string[], status: ChecklistStatus) => {
    await Promise.all(itemIds.map((itemId) => competitionService.updateChecklistItemStatus(itemId, status)));
    setCompetitions((current) =>
      current.map((snapshot) => {
        const items = snapshot.costumeChecklistItems ?? [];

        if (!items.some((item) => itemIds.includes(item.id))) {
          return snapshot;
        }

        return {
          ...snapshot,
          costumeChecklistItems: items.map((item) =>
            itemIds.includes(item.id)
              ? {
                  ...item,
                  status
                }
              : item
          )
        };
      })
    );
  };

  const addChecklistItem = async (item: CostumeChecklistItem) => {
    await competitionService.addChecklistItem(item);
    setCompetitions((current) =>
      current.map((snapshot) =>
        snapshot.competition.id === item.competitionId
          ? {
              ...snapshot,
              costumeChecklistItems: [...(snapshot.costumeChecklistItems ?? []), item]
            }
          : snapshot
      )
    );
  };

  const upsertChecklistItems = async (items: CostumeChecklistItem[]) => {
    if (!items.length) {
      return;
    }

    await competitionService.upsertChecklistItems(items);
    setCompetitions((current) =>
      current.map((snapshot) => {
        const competitionItems = items.filter((item) => item.competitionId === snapshot.competition.id);

        if (!competitionItems.length) {
          return snapshot;
        }

        const existing = snapshot.costumeChecklistItems ?? [];
        const incomingById = new Map(competitionItems.map((item) => [item.id, item]));
        const merged = existing.map((item) => incomingById.get(item.id) ?? item);
        const additions = competitionItems.filter((item) => !existing.some((existingItem) => existingItem.id === item.id));

        return {
          ...snapshot,
          costumeChecklistItems: [...merged, ...additions]
        };
      })
    );
  };

  const upsertRoutineCostume = async (item: RoutineCostume) => {
    await competitionService.upsertRoutineCostume(item);
    setCompetitions((current) =>
      current.map((snapshot) => {
        if (snapshot.competition.id !== item.competitionId) {
          return snapshot;
        }

        const existing = snapshot.routineCostumes ?? [];
        const hasMatch = existing.some((costume) => costume.id === item.id);

        return {
          ...snapshot,
          routineCostumes: hasMatch
            ? existing.map((costume) => (costume.id === item.id ? item : costume))
            : [...existing, item]
        };
      })
    );
  };

  const addManualEntries = async (entries: ManualEntryInput[]) => {
    const result = await parsingService.parseCompetitionFromManual(entries);
    return persistAndAppend(result.payload);
  };

  const importCompetitionFromLink = async (link: LinkImportInput) => {
    const result = await parsingService.startCompetitionParseFromLink(link);

    if ("metadata" in result) {
      const competitionId = await persistAndAppend(result.payload);
      return {
        competitionId,
        isMock: result.metadata.isMock
      };
    }

    setActiveParsingJob(result);
    return {
      isMock: false,
      parsingJob: result
    };
  };

  const importCompetitionFromAsset = async (
    sourceType: "pdf" | "screenshot",
    asset: ImportedScheduleAsset,
    targetDancerNames?: string[]
  ) => {
    const storedAsset = await storageService.uploadImportedAsset(asset);
    const result =
      sourceType === "pdf"
        ? await parsingService.startCompetitionParseFromPdf(storedAsset, targetDancerNames)
        : await parsingService.startCompetitionParseFromScreenshot(storedAsset, targetDancerNames);

    if ("metadata" in result) {
      const competitionId = await persistAndAppend(result.payload);
      return {
        competitionId,
        isMock: result.metadata.isMock
      };
    }

    setActiveParsingJob(result);
    return {
      isMock: false,
      parsingJob: result
    };
  };

  const refreshParsingJob = async (jobId: string) => {
    const job = await parsingService.getParsingJob(jobId);
    setActiveParsingJob(job.status === "completed" || job.status === "failed" ? null : job);

    if (job.status === "completed" && job.payload) {
      await persistAndAppend(job.payload);
    }

    return job;
  };

  return (
    <AppDataContext.Provider
      value={{
        competitions,
        loading,
        activeParsingJob,
        currentCompetitionId,
        selectedByCompetitionId,
        refresh,
        setCurrentCompetition: (competitionId) => setCurrentCompetitionId(competitionId),
        deleteCompetition: async (competitionId) => {
          await competitionService.deleteCompetition(competitionId);
          const remainingSnapshots = competitions.filter((snapshot) => snapshot.competition.id !== competitionId);
          setCompetitions(remainingSnapshots);
          setSelectedByCompetitionId((current) => {
            const next = { ...current };
            delete next[competitionId];
            return next;
          });
          setCurrentCompetitionId((current) =>
            current === competitionId ? remainingSnapshots[0]?.competition.id : current
          );
        },
        selectDancers: (competitionId, dancerIds) =>
          setSelectedByCompetitionId((current) => ({
            ...current,
            [competitionId]: dancerIds
          })),
        addManualEntries,
        importCompetitionFromLink,
        importCompetitionFromAsset,
        refreshParsingJob,
        clearParsingJob: () => setActiveParsingJob(null),
        updateChecklistItemStatus,
        updateChecklistItemsStatus,
        addChecklistItem,
        upsertChecklistItems,
        upsertRoutineCostume
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
