import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, TextInput } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { SectionCard } from "@/components/SectionCard";
import { useCompetitionStore } from "@/hooks/useCompetitionStore";
import { useAppData } from "@/providers/AppDataProvider";
import { costumeService } from "@/services/costumeService";
import { ChecklistStatus, RoutineCostume } from "@/types/models";
import { formatDayLabel, formatTime } from "@/utils/date";

function getChecklistTone(status: ChecklistStatus) {
  if (status === "missing") {
    return {
      color: "$conflict" as const,
      backgroundColor: "$conflictSoft" as const,
    };
  }

  if (status === "packed") {
    return {
      color: "$shellDark" as const,
      backgroundColor: "$accentSoft" as const,
    };
  }

  return {
    color: "$secondaryText" as const,
    backgroundColor: "$surfaceMuted" as const,
  };
}

function parseListDraft(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EntryDetailScreen() {
  const { competitionId, entryId, focus } = useLocalSearchParams<{
    competitionId: string;
    entryId: string;
    focus?: string;
  }>();
  const { competitions, updateChecklistItemStatus, updateChecklistItemsStatus, addChecklistItem, upsertChecklistItems, upsertRoutineCostume } = useAppData();
  const store = useCompetitionStore(competitionId);
  const scrollViewRef = useRef<any>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [savingAllPacked, setSavingAllPacked] = useState(false);
  const [savingCostume, setSavingCostume] = useState(false);
  const [addingChecklistItem, setAddingChecklistItem] = useState(false);
  const [generatingChecklist, setGeneratingChecklist] = useState(false);
  const [checklistSectionY, setChecklistSectionY] = useState<number | null>(null);
  const snapshot = competitions.find((item) => item.competition.id === competitionId) ?? competitions[0];
  const entry = snapshot?.entries.find((item) => item.id === entryId);
  const dancer = snapshot?.dancers.find((item) => item.id === entry?.dancerId);
  const costume = entry && store ? store.routineCostumeByEntryId.get(entry.id) : undefined;
  const checklist = entry && store ? store.checklistItemsByEntryId[entry.id] ?? [] : [];
  const [costumeNameDraft, setCostumeNameDraft] = useState(costume?.costumeName ?? "");
  const [shoesDraft, setShoesDraft] = useState((costume?.shoes ?? []).join(", "));
  const [accessoriesDraft, setAccessoriesDraft] = useState((costume?.accessories ?? []).join(", "));
  const [hairNotesDraft, setHairNotesDraft] = useState(costume?.hairNotes ?? "");
  const [makeupNotesDraft, setMakeupNotesDraft] = useState(costume?.makeupNotes ?? "");
  const [newChecklistLabel, setNewChecklistLabel] = useState("");
  const [newChecklistCategory, setNewChecklistCategory] = useState<
    "costume" | "shoes" | "accessory" | "hair" | "makeup" | "other"
  >("other");
  const dayFoodWindows = entry
    ? snapshot?.foodWindows?.filter((item) => item.dayKey === entry.eventDate) ?? []
    : [];
  const dayLodgingPlan = entry
    ? snapshot?.lodgingPlans?.find((item) => item.dayKey === entry.eventDate)
    : undefined;
  const checklistFocusRequested = focus === "checklist";

  useEffect(() => {
    if (!snapshot || !entry || !checklistFocusRequested || checklistSectionY == null) {
      return;
    }

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo?.({
        y: Math.max(0, checklistSectionY - 16),
        animated: true
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [checklistFocusRequested, checklistSectionY, entry, snapshot]);

  useEffect(() => {
    setCostumeNameDraft(costume?.costumeName ?? "");
    setShoesDraft((costume?.shoes ?? []).join(", "));
    setAccessoriesDraft((costume?.accessories ?? []).join(", "));
    setHairNotesDraft(costume?.hairNotes ?? "");
    setMakeupNotesDraft(costume?.makeupNotes ?? "");
  }, [costume?.id, costume?.costumeName, costume?.hairNotes, costume?.makeupNotes, costume?.shoes, costume?.accessories]);

  if (!snapshot || !entry) {
    return <AppScreen title="Routine detail" subtitle="This routine could not be found." />;
  }

  const handleChecklistStatusChange = async (itemId: string, status: ChecklistStatus) => {
    setSavingItemId(itemId);

    try {
      await updateChecklistItemStatus(itemId, status);
    } finally {
      setSavingItemId(null);
    }
  };

  const handleMarkAllPacked = async () => {
    if (!checklist.length) {
      return;
    }

    setSavingAllPacked(true);

    try {
      await updateChecklistItemsStatus(
        checklist
          .filter((item) => item.status !== "packed")
          .map((item) => item.id),
        "packed"
      );
    } finally {
      setSavingAllPacked(false);
    }
  };

  const handleCostumeSave = async () => {
    if (!entry) {
      return;
    }

    setSavingCostume(true);

    try {
      await upsertRoutineCostume({
        id: costume?.id ?? `costume-${entry.id}`,
        competitionId: entry.competitionId,
        dancerId: entry.dancerId,
        scheduleEntryId: entry.id,
        costumeName: costumeNameDraft.trim() || "Routine costume",
        shoes: parseListDraft(shoesDraft),
        accessories: parseListDraft(accessoriesDraft),
        hairNotes: hairNotesDraft.trim(),
        makeupNotes: makeupNotesDraft.trim(),
        source: costume?.source ?? "manual"
      });
    } finally {
      setSavingCostume(false);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!entry || !newChecklistLabel.trim()) {
      return;
    }

    setAddingChecklistItem(true);

    try {
      await addChecklistItem({
        id: `checklist-${entry.id}-${Date.now()}`,
        competitionId: entry.competitionId,
        dancerId: entry.dancerId,
        scheduleEntryId: entry.id,
        routineCostumeId: costume?.id,
        label: newChecklistLabel.trim(),
        category: newChecklistCategory,
        status: "todo"
      });
      setNewChecklistLabel("");
      setNewChecklistCategory("other");
    } finally {
      setAddingChecklistItem(false);
    }
  };

  const handleGenerateChecklistFromCostume = async () => {
    if (!entry) {
      return;
    }

    setGeneratingChecklist(true);

    try {
      const baseCostume: RoutineCostume = {
        id: costume?.id ?? `costume-${entry.id}`,
        competitionId: entry.competitionId,
        dancerId: entry.dancerId,
        scheduleEntryId: entry.id,
        costumeName: costumeNameDraft.trim() || costume?.costumeName || `${entry.category} ${entry.performanceType} set`,
        shoes: parseListDraft(shoesDraft),
        accessories: parseListDraft(accessoriesDraft),
        hairNotes: hairNotesDraft.trim(),
        makeupNotes: makeupNotesDraft.trim(),
        source: costume?.source ?? "manual"
      };

      await upsertRoutineCostume(baseCostume);
      await upsertChecklistItems(costumeService.buildChecklistFromRoutineCostume(baseCostume));
    } finally {
      setGeneratingChecklist(false);
    }
  };

  const handleChecklistSectionLayout = (event: LayoutChangeEvent) => {
    setChecklistSectionY(event.nativeEvent.layout.y);
  };

  return (
    <AppScreen
      title={entry.title}
      subtitle={`${dancer?.name} · ${entry.category} ${entry.performanceType}`}
      scrollViewRef={scrollViewRef}
    >
      <SectionCard title="Timing">
        <YStack gap="$2">
          <Text fontSize={16} color="$color">
            {formatDayLabel(entry.eventDate)}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            {entry.eventTime}
          </Text>
          <XStack gap="$3" flexWrap="wrap">
            <Text
              fontSize={12}
              fontWeight="700"
              color="$shellDark"
              backgroundColor="$accentSoft"
              paddingHorizontal="$2"
              paddingVertical={6}
              borderRadius={999}
            >
              Prep by {formatTime(new Date(new Date(entry.datetimeStart).getTime() - (entry.prepMinutes ?? 75) * 60000).toISOString())}
            </Text>
            <Text
              fontSize={12}
              fontWeight="700"
              color="$secondaryText"
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2"
              paddingVertical={6}
              borderRadius={999}
            >
              Est. {entry.estDurationMinutes ?? 8} min
            </Text>
          </XStack>
        </YStack>
      </SectionCard>
      <SectionCard title="Performance details">
        <YStack gap="$2">
          <Text fontSize={15} color="$secondaryText">
            Competition: {snapshot.competition.name}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            Dancer: {dancer?.name}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            Category: {entry.category}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            Type: {entry.performanceType}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            Venue: {snapshot.competition.venueName ?? "Venue not added yet"}
          </Text>
          <Text fontSize={15} color="$secondaryText">
            Notes: {entry.notes || "No notes yet"}
          </Text>
        </YStack>
      </SectionCard>
      <YStack onLayout={handleChecklistSectionLayout}>
        <SectionCard
          title="Costume + checklist"
          subtitle={
            checklistFocusRequested
              ? "Checklist shortcut opened. You are right where the missing item can be resolved."
              : "Readiness should be visible before the day gets rushed."
          }
        >
          <YStack gap="$3">
            <YStack gap="$1">
              <Text fontSize={16} fontWeight="700" color="$color">
                {costume?.costumeName ?? "No costume assigned yet"}
              </Text>
              <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                {costume
                  ? [costume.hairNotes, costume.makeupNotes].filter(Boolean).join(" · ") || "Hair and makeup notes will appear here."
                  : "Add costume details to turn this routine into a true ready-to-go checklist."}
              </Text>
            </YStack>

            {costume?.shoes?.length || costume?.accessories?.length ? (
              <YStack gap="$1.5">
                {costume.shoes?.length ? (
                  <Text fontSize={14} color="$secondaryText">
                    Shoes: {costume.shoes.join(", ")}
                  </Text>
                ) : null}
                {costume.accessories?.length ? (
                  <Text fontSize={14} color="$secondaryText">
                    Accessories: {costume.accessories.join(", ")}
                  </Text>
                ) : null}
              </YStack>
            ) : null}

            <YStack gap="$2">
              <Text fontSize={14} fontWeight="700" color="$color">
                Edit costume details
              </Text>
              <TextInput
                value={costumeNameDraft}
                onChangeText={setCostumeNameDraft}
                placeholder="Costume name"
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <TextInput
                value={shoesDraft}
                onChangeText={setShoesDraft}
                placeholder="Shoes (comma separated)"
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <TextInput
                value={accessoriesDraft}
                onChangeText={setAccessoriesDraft}
                placeholder="Accessories (comma separated)"
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <TextInput
                value={hairNotesDraft}
                onChangeText={setHairNotesDraft}
                placeholder="Hair notes"
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <TextInput
                value={makeupNotesDraft}
                onChangeText={setMakeupNotesDraft}
                placeholder="Makeup notes"
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <Button
                backgroundColor="$accent"
                color="$shellDark"
                onPress={handleCostumeSave}
                disabled={savingCostume}
              >
                {savingCostume ? "Saving costume..." : "Save costume details"}
              </Button>
              <Button
                backgroundColor="$surface"
                color="$color"
                borderWidth={1}
                borderColor="$divider"
                onPress={handleGenerateChecklistFromCostume}
                disabled={generatingChecklist}
              >
                {generatingChecklist ? "Generating..." : "Generate checklist from costume"}
              </Button>
            </YStack>

            {checklist.length ? (
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center" gap="$3">
                  <Text fontSize={14} fontWeight="700" color="$color">
                    Routine checklist
                  </Text>
                  <Button
                    size="$3"
                    backgroundColor="$accent"
                    color="$shellDark"
                    onPress={handleMarkAllPacked}
                    disabled={savingAllPacked || checklist.every((item) => item.status === "packed")}
                  >
                    {savingAllPacked ? "Saving..." : "Mark all packed"}
                  </Button>
                </XStack>
                {checklist.map((item) => {
                  const tone = getChecklistTone(item.status);
                  const saving = savingAllPacked || savingItemId === item.id;

                  return (
                    <YStack
                      key={item.id}
                      backgroundColor="$background"
                      borderRadius={16}
                      padding="$3"
                      gap="$2.5"
                    >
                      <XStack justifyContent="space-between" alignItems="center" gap="$3">
                        <YStack flex={1} gap="$1">
                          <Text fontSize={15} fontWeight="600" color="$color">
                            {item.label}
                          </Text>
                          <Text fontSize={12} color="$secondaryText" textTransform="uppercase" letterSpacing={0.6}>
                            {item.category}
                          </Text>
                        </YStack>
                        <Text
                          fontSize={12}
                          fontWeight="700"
                          color={tone.color}
                          backgroundColor={tone.backgroundColor}
                          paddingHorizontal="$2"
                          paddingVertical={6}
                          borderRadius={999}
                        >
                          {saving ? "saving..." : item.status}
                        </Text>
                      </XStack>

                      <XStack gap="$2" flexWrap="wrap">
                        {(["todo", "packed", "missing"] as ChecklistStatus[]).map((status) => {
                          const selected = item.status === status;

                          return (
                            <Text
                              key={status}
                              fontSize={12}
                              fontWeight="700"
                              color={selected ? "$shellDark" : "$secondaryText"}
                              backgroundColor={selected ? "$accent" : "$surface"}
                              borderWidth={1}
                              borderColor={selected ? "$accent" : "$divider"}
                              paddingHorizontal="$2"
                              paddingVertical={6}
                              borderRadius={999}
                              onPress={() => {
                                if (!saving && item.status !== status) {
                                  handleChecklistStatusChange(item.id, status);
                                }
                              }}
                            >
                              Mark {status}
                            </Text>
                          );
                        })}
                      </XStack>
                    </YStack>
                  );
                })}
              </YStack>
            ) : (
              <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                No checklist items yet. This is where CompCoach can surface what still needs to be packed.
              </Text>
            )}

            <YStack gap="$2">
              <Text fontSize={14} fontWeight="700" color="$color">
                Add checklist item
              </Text>
              <TextInput
                value={newChecklistLabel}
                onChangeText={setNewChecklistLabel}
                placeholder="Pack lipstick, steam costume, etc."
                placeholderTextColor="#667068"
                style={{
                  borderWidth: 1,
                  borderColor: "#DED8CA",
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#17211B"
                }}
              />
              <XStack gap="$2" flexWrap="wrap">
                {(["costume", "shoes", "accessory", "hair", "makeup", "other"] as const).map((category) => (
                  <Text
                    key={category}
                    fontSize={12}
                    fontWeight="700"
                    color={newChecklistCategory === category ? "$shellDark" : "$secondaryText"}
                    backgroundColor={newChecklistCategory === category ? "$accent" : "$surface"}
                    borderWidth={1}
                    borderColor={newChecklistCategory === category ? "$accent" : "$divider"}
                    paddingHorizontal="$2"
                    paddingVertical={6}
                    borderRadius={999}
                    onPress={() => setNewChecklistCategory(category)}
                  >
                    {category}
                  </Text>
                ))}
              </XStack>
              <Button
                backgroundColor="$surface"
                color="$color"
                borderWidth={1}
                borderColor="$divider"
                onPress={handleAddChecklistItem}
                disabled={addingChecklistItem || !newChecklistLabel.trim()}
              >
                {addingChecklistItem ? "Adding..." : "Add checklist item"}
              </Button>
            </YStack>
          </YStack>
        </SectionCard>
      </YStack>
      {(dayFoodWindows.length || dayLodgingPlan) ? (
        <SectionCard title="Day support" subtitle="The broader day context around this routine.">
          <YStack gap="$3">
            {dayFoodWindows.length ? (
              <YStack gap="$2">
                <Text fontSize={15} fontWeight="700" color="$color">
                  Food windows
                </Text>
                {dayFoodWindows.map((window) => (
                  <YStack key={window.id} backgroundColor="$background" borderRadius={16} padding="$3" gap="$1">
                    <Text fontSize={14} fontWeight="700" color="$color">
                      {window.type[0].toUpperCase() + window.type.slice(1)} window · {window.minutesAvailable} min
                    </Text>
                    <Text fontSize={13} color="$secondaryText" lineHeight={20}>
                      {formatTime(window.startTime)} to {formatTime(window.endTime)} · {window.guidance}
                    </Text>
                  </YStack>
                ))}
              </YStack>
            ) : null}

            {dayLodgingPlan ? (
              <YStack gap="$1.5">
                <Text fontSize={15} fontWeight="700" color="$color">
                  Departure plan
                </Text>
                <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                  Leave by {formatTime(dayLodgingPlan.recommendedDepartureTime)} · {dayLodgingPlan.estimatedTravelMinutes} minute {dayLodgingPlan.travelMode}
                </Text>
                {dayLodgingPlan.endOfDaySuggestion ? (
                  <Text fontSize={14} color="$secondaryText" lineHeight={21}>
                    {dayLodgingPlan.endOfDaySuggestion}
                  </Text>
                ) : null}
              </YStack>
            ) : null}
          </YStack>
        </SectionCard>
      ) : null}
      <SectionCard title="Extensibility">
        <Text fontSize={15} color="$secondaryText" lineHeight={22}>
          This screen is ready for studio, room, costume, award, and adjudication fields when the parsing layer expands.
        </Text>
      </SectionCard>
    </AppScreen>
  );
}
