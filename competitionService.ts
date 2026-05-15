import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { authService } from "@/services/authService";
import { firestore } from "@/services/firebaseClient";
import {
  mockAssistantCards,
  mockCompetition,
  mockCompetitionEvents,
  mockCostumeChecklistItems,
  mockDancers,
  mockEntries,
  mockFoodSuggestions,
  mockFoodWindows,
  mockLodgingPlans,
  mockRoutineCostumes,
  mockSelectedDancers,
} from "@/constants/mockData";
import {
  AssistantCard,
  Competition,
  CompetitionEvent,
  CostumeChecklistItem,
  Dancer,
  FoodSuggestion,
  FoodWindow,
  LodgingPlan,
  ParsedCompetitionPayload,
  RoutineCostume,
  ScheduleEntry,
  SelectedDancer,
  ChecklistStatus,
} from "@/types/models";

export interface CompetitionSnapshot extends ParsedCompetitionPayload {}

const competitionsCollection = firestore ? collection(firestore, "competitions") : null;
const LOCAL_COMPETITIONS_CACHE_KEY = "compcoach:competitions:v1";
const competitionScopedCollections = [
  "dancers",
  "scheduleEntries",
  "competitionEvents",
  "selectedDancers",
  "routineCostumes",
  "costumeChecklistItems",
  "foodWindows",
  "foodSuggestions",
  "lodgingPlans",
  "assistantCards",
] as const;

async function readLocalCompetitionCache(): Promise<CompetitionSnapshot[]> {
  const raw = await AsyncStorage.getItem(LOCAL_COMPETITIONS_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CompetitionSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalCompetitionCache(snapshots: CompetitionSnapshot[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_COMPETITIONS_CACHE_KEY, JSON.stringify(snapshots));
}

async function updateLocalCompetitionCache(
  updater: (current: CompetitionSnapshot[]) => CompetitionSnapshot[]
): Promise<CompetitionSnapshot[]> {
  const current = await readLocalCompetitionCache();
  const next = updater(current);
  await writeLocalCompetitionCache(next);
  return next;
}

async function loadCompetitionScopedCollection<T extends { competitionId: string }>(
  collectionName:
    | "dancers"
    | "scheduleEntries"
    | "competitionEvents"
    | "selectedDancers"
    | "routineCostumes"
    | "costumeChecklistItems"
    | "foodWindows"
    | "foodSuggestions"
    | "lodgingPlans"
    | "assistantCards",
  competitionId: string
): Promise<T[]> {
  if (!firestore) {
    return [];
  }

  const snapshot = await getDocs(query(collection(firestore, collectionName), where("competitionId", "==", competitionId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<T, "id">) } as unknown as T));
}

async function loadFirestoreData(sessionUid: string): Promise<CompetitionSnapshot[]> {
  if (!firestore || !competitionsCollection) {
    return [];
  }

  const competitionDocs = await getDocs(query(competitionsCollection, where("ownerId", "==", sessionUid)));
  const snapshots: CompetitionSnapshot[] = [];

  for (const competitionDoc of competitionDocs.docs) {
    const competitionId = competitionDoc.id;
    const dancers = await loadCompetitionScopedCollection<Dancer>("dancers", competitionId);
    const entries = await loadCompetitionScopedCollection<ScheduleEntry>("scheduleEntries", competitionId);
    const competitionEvents = await loadCompetitionScopedCollection<CompetitionEvent>("competitionEvents", competitionId);
    const selectedDancers = await loadCompetitionScopedCollection<SelectedDancer>("selectedDancers", competitionId);
    const routineCostumes = await loadCompetitionScopedCollection<RoutineCostume>("routineCostumes", competitionId);
    const costumeChecklistItems = await loadCompetitionScopedCollection<CostumeChecklistItem>(
      "costumeChecklistItems",
      competitionId
    );
    const foodWindows = await loadCompetitionScopedCollection<FoodWindow>("foodWindows", competitionId);
    const foodSuggestions = await loadCompetitionScopedCollection<FoodSuggestion>("foodSuggestions", competitionId);
    const lodgingPlans = await loadCompetitionScopedCollection<LodgingPlan>("lodgingPlans", competitionId);
    const assistantCards = await loadCompetitionScopedCollection<AssistantCard>("assistantCards", competitionId);

    snapshots.push({
      competition: {
        id: competitionId,
        ...(competitionDoc.data() as Omit<Competition, "id">)
      },
      dancers,
      entries,
      competitionEvents,
      selectedDancers,
      routineCostumes,
      costumeChecklistItems,
      foodWindows,
      foodSuggestions,
      lodgingPlans,
      assistantCards,
    });
  }

  return snapshots.sort((left, right) => left.competition.startDate.localeCompare(right.competition.startDate));
}

export const competitionService = {
  async listCompetitions(): Promise<CompetitionSnapshot[]> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase") {
      const snapshots = await readLocalCompetitionCache();
      return snapshots.sort((left, right) => left.competition.startDate.localeCompare(right.competition.startDate));
    }

    if (!firestore) {
      return [
        {
            competition: mockCompetition,
            dancers: mockDancers,
            entries: mockEntries,
            competitionEvents: mockCompetitionEvents,
            selectedDancers: mockSelectedDancers,
            routineCostumes: mockRoutineCostumes,
            costumeChecklistItems: mockCostumeChecklistItems,
            foodWindows: mockFoodWindows,
            foodSuggestions: mockFoodSuggestions,
            lodgingPlans: mockLodgingPlans,
            assistantCards: mockAssistantCards,
          }
      ];
    }

    const snapshots = await loadFirestoreData(session.uid);
    return snapshots.length
      ? snapshots
      : [
          {
            competition: mockCompetition,
            dancers: mockDancers,
            entries: mockEntries,
            competitionEvents: mockCompetitionEvents,
            selectedDancers: mockSelectedDancers,
            routineCostumes: mockRoutineCostumes,
            costumeChecklistItems: mockCostumeChecklistItems,
            foodWindows: mockFoodWindows,
            foodSuggestions: mockFoodSuggestions,
            lodgingPlans: mockLodgingPlans,
            assistantCards: mockAssistantCards,
          }
        ];
  },

  async saveParsedCompetition(payload: ParsedCompetitionPayload): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) => {
        const snapshot = payload as CompetitionSnapshot;
        const existingIndex = current.findIndex((item) => item.competition.id === payload.competition.id);

        if (existingIndex === -1) {
          return [...current, snapshot];
        }

        return current.map((item) => (item.competition.id === payload.competition.id ? snapshot : item));
      });
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;
    const competitionRef = doc(db, "competitions", payload.competition.id);
    await setDoc(competitionRef, {
      ...payload.competition,
      createdAt: payload.competition.createdAt ?? serverTimestamp()
    });

    for (const dancer of payload.dancers) {
      await setDoc(doc(db, "dancers", dancer.id), dancer);
    }

    for (const entry of payload.entries) {
      await setDoc(doc(db, "scheduleEntries", entry.id), entry);
    }

    for (const event of payload.competitionEvents ?? []) {
      await setDoc(doc(db, "competitionEvents", event.id), event);
    }

    for (const selected of payload.selectedDancers ?? []) {
      await setDoc(doc(db, "selectedDancers", selected.id), selected);
    }

    for (const item of payload.routineCostumes ?? []) {
      await setDoc(doc(db, "routineCostumes", item.id), item);
    }

    for (const item of payload.costumeChecklistItems ?? []) {
      await setDoc(doc(db, "costumeChecklistItems", item.id), item);
    }

    for (const item of payload.foodWindows ?? []) {
      await setDoc(doc(db, "foodWindows", item.id), item);
    }

    for (const item of payload.foodSuggestions ?? []) {
      await setDoc(doc(db, "foodSuggestions", item.id), item);
    }

    for (const item of payload.lodgingPlans ?? []) {
      await setDoc(doc(db, "lodgingPlans", item.id), item);
    }

    for (const item of payload.assistantCards ?? []) {
      await setDoc(doc(db, "assistantCards", item.id), item);
    }
  },

  async createCompetition(competition: Omit<Competition, "id" | "createdAt">): Promise<string> {
    if (!firestore || !competitionsCollection) {
      return "mock-created-competition";
    }

    const session = await authService.ensureSignedIn();
    const docRef = await addDoc(competitionsCollection, {
      ...competition,
      ownerId: session.uid,
      createdAt: serverTimestamp()
    });

    return docRef.id;
  },

  async deleteCompetition(competitionId: string): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) =>
        current.filter((snapshot) => snapshot.competition.id !== competitionId)
      );
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;

    await Promise.all(
      competitionScopedCollections.map(async (collectionName) => {
        const snapshot = await getDocs(query(collection(db, collectionName), where("competitionId", "==", competitionId)));
        await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
      })
    );

    await deleteDoc(doc(db, "competitions", competitionId));
  },

  async updateChecklistItemStatus(itemId: string, status: ChecklistStatus): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) =>
        current.map((snapshot) => ({
          ...snapshot,
          costumeChecklistItems: (snapshot.costumeChecklistItems ?? []).map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status
                }
              : item
          )
        }))
      );
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;
    await setDoc(
      doc(db, "costumeChecklistItems", itemId),
      {
        status,
      },
      { merge: true }
    );
  },

  async addChecklistItem(item: CostumeChecklistItem): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) =>
        current.map((snapshot) =>
          snapshot.competition.id === item.competitionId
            ? {
                ...snapshot,
                costumeChecklistItems: [...(snapshot.costumeChecklistItems ?? []), item]
              }
            : snapshot
        )
      );
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;
    await setDoc(doc(db, "costumeChecklistItems", item.id), item);
  },

  async upsertChecklistItems(items: CostumeChecklistItem[]): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) =>
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
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;
    await Promise.all(
      items.map((item) => setDoc(doc(db, "costumeChecklistItems", item.id), item, { merge: true }))
    );
  },

  async upsertRoutineCostume(item: RoutineCostume): Promise<void> {
    const session = await authService.ensureSignedIn();

    if (session.provider === "supabase" || !firestore) {
      await updateLocalCompetitionCache((current) =>
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
      return;
    }

    if (!firestore) {
      return;
    }

    const db = firestore;
    await setDoc(doc(db, "routineCostumes", item.id), item, { merge: true });
  }
};
