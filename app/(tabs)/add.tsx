import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, TextInput } from "react-native";
import { Button, Label, Text, XStack, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SectionCard } from "@/components/SectionCard";
import { useAppData } from "@/providers/AppDataProvider";
import { ImportedScheduleAsset, ManualEntryInput, PerformanceType } from "@/types/models";

const defaultEntry = (): ManualEntryInput => ({
  competitionName: "",
  date: "2026-04-17",
  dancerName: "",
  time: "8:35 AM",
  routineName: "",
  category: "",
  performanceType: "Solo",
  notes: ""
});

const performanceTypes: PerformanceType[] = ["Solo", "Duo/Trio", "Group", "Line", "Production"];

const inputStyle = {
  borderWidth: 1,
  borderColor: "#DED8CA",
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  color: "#17211B"
} as const;

function formatImportError(message: string) {
  if (message.includes("BOOT_ERROR")) {
    return "The import service is waking up right now. Please try the upload again in a moment.";
  }

  if (message.includes("Missing or insufficient permissions")) {
    return "CompCoach hit a permission issue while finishing the import. Please try again.";
  }

  if (message.toLowerCase().includes("network request")) {
    return "CompCoach could not reach the import service. Please check your connection and try again.";
  }

  return message;
}

export default function AddScreen() {
  const { addManualEntries, activeParsingJob, clearParsingJob, importCompetitionFromAsset, importCompetitionFromLink, refreshParsingJob } =
    useAppData();
  const [linkValue, setLinkValue] = useState("");
  const [entries, setEntries] = useState<ManualEntryInput[]>([
    {
      competitionName: "Spark Dance Challenge",
      date: "2026-04-17",
      dancerName: "Kadence Athill",
      time: "8:35 AM",
      routineName: "We're Fabulous",
      category: "Jazz",
      performanceType: "Solo",
      notes: ""
    }
  ]);
  const [selectedNames, setSelectedNames] = useState<string[]>(["Kadence Athill"]);
  const [targetNamesInput, setTargetNamesInput] = useState("Kadence Athill");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [busy, setBusy] = useState<false | "link" | "screenshot" | "pdf" | "manual">(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null);

  const parsingStageLabel =
    activeParsingJob?.stage === "queued"
      ? "Queued for parsing..."
      : activeParsingJob?.stage === "extracting-pdf-text"
        ? "Extracting PDF text..."
        : activeParsingJob?.stage === "matching-dancer-names"
          ? "Matching dancer names..."
          : activeParsingJob?.stage === "building-schedule"
            ? "Building schedule..."
            : activeParsingJob?.stage === "processing-image"
              ? "Reading screenshot..."
              : activeParsingJob?.stage === "fetching-link"
                ? "Reading competition link..."
                : null;

  const importStateLabel = activeParsingJob?.status === "queued"
    ? "Queued for parsing..."
    : activeParsingJob?.status === "processing"
      ? parsingStageLabel || "Parsing schedule in the background..."
      : busy === "link"
        ? "Checking competition link..."
        : busy === "screenshot"
          ? "Uploading screenshot..."
          : busy === "pdf"
            ? "Uploading PDF..."
            : null;

  useEffect(() => {
    if (!activeParsingJob || activeParsingJob.status === "completed" || activeParsingJob.status === "failed") {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const job = await refreshParsingJob(activeParsingJob.id);

        if (job.status === "completed") {
          setLastImportSummary("Schedule parsed in the background and saved to CompCoach.");
          clearParsingJob();
          setBusy(false);
          router.replace("/(tabs)/schedule");
        }

        if (job.status === "failed") {
          setLastImportSummary(null);
          setErrorMessage(job.error || "Background parsing failed. Please try manual entry instead.");
          clearParsingJob();
          setBusy(false);
        }
      } catch (error) {
        setLastImportSummary(null);
        setErrorMessage(error instanceof Error ? error.message : "Unable to refresh parsing status.");
        clearParsingJob();
        setBusy(false);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [activeParsingJob, clearParsingJob, refreshParsingJob]);

  const updateEntry = (index: number, key: keyof ManualEntryInput, value: string) => {
    setEntries((current) =>
      current.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry))
    );
  };

  const detectedNames = [...new Set(entries.map((entry) => entry.dancerName.trim()).filter(Boolean))];
  const parsedTargetNames = [...new Set(targetNamesInput.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))];

  const removeTargetName = (nameToRemove: string) => {
    const nextNames = parsedTargetNames.filter((name) => name !== nameToRemove);
    setTargetNamesInput(nextNames.join(", "));
  };

  const handleBuildManualSchedule = async () => {
    setBusy("manual");
    setErrorMessage(null);
    try {
      const filteredEntries = entries.filter(
        (entry) =>
          entry.competitionName.trim() &&
          entry.dancerName.trim() &&
          entry.routineName.trim() &&
          selectedNames.includes(entry.dancerName.trim())
      );

      if (!filteredEntries.length) {
        throw new Error("Select at least one dancer with a complete routine entry before building the schedule.");
      }

      const competitionId = await addManualEntries(filteredEntries);
      router.replace("/(tabs)/schedule");
      setSelectedNames(detectedNames);
      return competitionId;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Manual entry failed. Please check the fields and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLinkImport = async () => {
    setBusy("link");
    setErrorMessage(null);
    setLastImportSummary(null);
    let keepBusy = false;
    try {
      if (!linkValue.trim()) {
        throw new Error("Paste a competition link first, or switch to manual entry.");
      }
      if (!parsedTargetNames.length) {
        throw new Error("Add at least one dancer name so CompCoach knows who to look for in the import.");
      }

      const result = await importCompetitionFromLink({
        url: linkValue.trim(),
        targetDancerNames: parsedTargetNames
      });
      if (result.parsingJob) {
        keepBusy = true;
        setBusy(false);
        setLastImportSummary("Link accepted. CompCoach is parsing it in the background now.");
      } else {
        setLastImportSummary(
          result.isMock
            ? "Link import saved, but the parser is still mocked because no remote parser endpoint is configured."
            : "Link imported with the remote parser."
        );
        router.replace("/(tabs)/schedule");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed. Please use manual entry instead.");
    } finally {
      if (!keepBusy) {
        setBusy(false);
      }
    }
  };

  const handleAssetImport = async (sourceType: "screenshot" | "pdf", asset: ImportedScheduleAsset) => {
    setBusy(sourceType);
    setErrorMessage(null);
    setLastImportSummary(null);
    let keepBusy = false;
    try {
      if (!parsedTargetNames.length) {
        throw new Error("Add at least one dancer name so CompCoach knows who to look for in the import.");
      }

      const result = await importCompetitionFromAsset(sourceType, asset, parsedTargetNames);
      if (result.parsingJob) {
        keepBusy = true;
        setBusy(false);
        setLastImportSummary(
          `${sourceType === "pdf" ? "PDF" : "Screenshot"} uploaded. CompCoach is parsing it in the background now.`
        );
      } else {
        setLastImportSummary(
          result.isMock
            ? `${sourceType === "pdf" ? "PDF" : "Screenshot"} uploaded successfully, but parsing is still mocked because no remote parser endpoint is configured.`
            : `${sourceType === "pdf" ? "PDF" : "Screenshot"} uploaded and parsed by the remote parser.`
        );
        router.replace("/(tabs)/schedule");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Import failed. Please use manual entry instead.");
    } finally {
      if (!keepBusy) {
        setBusy(false);
      }
    }
  };

  const handleScreenshotImport = async () => {
    const ImagePicker = await import("expo-image-picker");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    await handleAssetImport("screenshot", {
      uri: asset.uri,
      name: asset.fileName ?? `competition-screenshot-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize
    });
  };

  const handlePdfImport = async () => {
    const DocumentPicker = await import("expo-document-picker");
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    await handleAssetImport("pdf", {
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/pdf",
      size: asset.size
    });
  };

  return (
    <AppScreen
      title="Add Schedule"
      eyebrow="Import"
      subtitle="Start with the fastest clean source. Open manual entry only when you need more control."
    >
      <SectionCard>
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$4">
          <YStack gap="$1.5" flex={1}>
            <Text fontSize={13} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.9}>
              Fastest paths
            </Text>
            <Text fontSize={28} fontWeight="800" color="$color" letterSpacing={-0.8}>
              Link, screenshot, PDF, or manual
            </Text>
            <Text fontSize={15} color="$secondaryText" lineHeight={22}>
              Use a link, screenshot, or PDF when the source is clean. Use manual entry when you need total control.
            </Text>
          </YStack>
        </XStack>
      </SectionCard>

      <SectionCard title="Import options" subtitle="Tell CompCoach who matters, then choose the fastest import path.">
        <YStack gap="$3">
          <YStack
            gap="$2"
            padding="$3"
            borderWidth={1}
            borderColor="$divider"
            borderRadius={20}
            backgroundColor="$surfaceMuted"
          >
            <Text fontSize={12} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.9}>
              Who should CompCoach look for?
            </Text>
            <Label>Dancer names to look for</Label>
            <TextInput
              placeholder="Kadence Athill, Maya Athill"
              placeholderTextColor="#6B6B6E"
              value={targetNamesInput}
              onChangeText={setTargetNamesInput}
              autoCapitalize="words"
              autoCorrect={false}
              style={inputStyle}
            />
            {parsedTargetNames.length ? (
              <YStack gap="$2">
                <Text fontSize={12} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.7}>
                  Tap a name to remove it
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {parsedTargetNames.map((name) => (
                    <Button
                      key={name}
                      size="$2"
                      backgroundColor="$surface"
                      color="$color"
                      borderWidth={1}
                      borderColor="$divider"
                      borderRadius="$5"
                      paddingHorizontal="$2.5"
                      onPress={() => removeTargetName(name)}
                    >
                      {`${name} ×`}
                    </Button>
                  ))}
                </XStack>
              </YStack>
            ) : null}
            <Text fontSize={13} color="$secondaryText" lineHeight={20}>
              Add one or more dancer names. CompCoach will prioritize these dancers while still keeping competition-wide events.
            </Text>
          </YStack>
          <YStack gap="$2">
            <Label>Competition link</Label>
            <TextInput
              placeholder="https://..."
              placeholderTextColor="#6B6B6E"
              value={linkValue}
              onChangeText={setLinkValue}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </YStack>
          <Button
            backgroundColor="$accent"
            color="$shellDark"
            justifyContent="center"
            onPress={handleLinkImport}
            disabled={Boolean(busy)}
          >
            Paste Competition Link
          </Button>
          <Button
            backgroundColor="$surfaceMuted"
            color="$color"
            justifyContent="center"
            onPress={handleScreenshotImport}
            disabled={Boolean(busy)}
          >
            Upload Screenshot
          </Button>
          <Button
            backgroundColor="$surfaceMuted"
            color="$color"
            justifyContent="center"
            onPress={handlePdfImport}
            disabled={Boolean(busy)}
          >
            Upload PDF
          </Button>
        </YStack>
      </SectionCard>

      {errorMessage ? (
        <SectionCard title="Import fallback">
          <Text fontSize={15} color="$conflict" lineHeight={22}>
            {formatImportError(errorMessage)}
          </Text>
          <Text fontSize={14} color="$secondaryText" lineHeight={22}>
            Manual entry is still the safest fallback when an import is incomplete or times out.
          </Text>
        </SectionCard>
      ) : null}

      {!errorMessage && (lastImportSummary || importStateLabel) ? (
        <SectionCard title="Import status">
          <YStack gap="$3">
            {lastImportSummary ? (
              <Text fontSize={14} color="$secondaryText" lineHeight={22}>
                {lastImportSummary}
              </Text>
            ) : null}
            {importStateLabel ? (
              <XStack
                alignItems="center"
                gap="$3"
                padding="$3"
                borderRadius={18}
                backgroundColor="$surfaceMuted"
                borderWidth={1}
                borderColor="$divider"
              >
                <ActivityIndicator color="#184B36" />
                <YStack flex={1} gap="$1">
                  <Text fontSize={14} fontWeight="700" color="$color">
                    {importStateLabel}
                  </Text>
                  {activeParsingJob ? (
                    <Text fontSize={13} color="$secondaryText">
                      Job status: {activeParsingJob.status}
                      {activeParsingJob.targetDancerNames?.length
                        ? ` · Looking for ${activeParsingJob.targetDancerNames.join(", ")}`
                        : ""}
                    </Text>
                  ) : null}
                </YStack>
              </XStack>
            ) : null}
          </YStack>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Manual fallback"
        subtitle="Open this only if the source file is messy or you want to enter just a few routines by hand."
      >
        {!showManualEntry ? (
          <YStack gap="$3">
            <Text fontSize={14} color="$secondaryText" lineHeight={22}>
              Best for quick corrections, one-off routines, or when you only need the essentials in CompCoach right now.
            </Text>
            <Button
              alignSelf="flex-start"
              backgroundColor="$surfaceMuted"
              color="$color"
              onPress={() => setShowManualEntry(true)}
            >
              Open manual entry
            </Button>
          </YStack>
        ) : (
          <YStack gap="$4">
            {entries.map((entry, index) => (
              <YStack
                key={`entry-${index + 1}`}
                gap="$3"
                padding="$3"
                borderWidth={1}
                borderColor="$divider"
                borderRadius={20}
                backgroundColor="$surfaceMuted"
              >
                <Text fontSize={15} fontWeight="600" color="$secondaryText">
                  Entry {index + 1}
                </Text>
                <YStack gap="$2">
                  <Label>Competition name</Label>
                  <TextInput
                    value={entry.competitionName}
                    onChangeText={(value: string) => updateEntry(index, "competitionName", value)}
                    placeholderTextColor="#6B6B6E"
                    style={inputStyle}
                  />
                </YStack>
                <XStack gap="$3">
                  <YStack flex={1} gap="$2">
                    <Label>Date</Label>
                    <TextInput
                      value={entry.date}
                      onChangeText={(value: string) => updateEntry(index, "date", value)}
                      placeholderTextColor="#6B6B6E"
                      style={inputStyle}
                    />
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <Label>Time</Label>
                    <TextInput
                      value={entry.time}
                      onChangeText={(value: string) => updateEntry(index, "time", value)}
                      placeholderTextColor="#6B6B6E"
                      style={inputStyle}
                    />
                  </YStack>
                </XStack>
                <YStack gap="$2">
                  <Label>Dancer</Label>
                  <TextInput
                    value={entry.dancerName}
                    onChangeText={(value: string) => updateEntry(index, "dancerName", value)}
                    placeholderTextColor="#6B6B6E"
                    style={inputStyle}
                  />
                </YStack>
                <YStack gap="$2">
                  <Label>Routine name</Label>
                  <TextInput
                    value={entry.routineName}
                    onChangeText={(value: string) => updateEntry(index, "routineName", value)}
                    placeholderTextColor="#6B6B6E"
                    style={inputStyle}
                  />
                </YStack>
                <XStack gap="$3">
                  <YStack flex={1} gap="$2">
                    <Label>Category</Label>
                    <TextInput
                      value={entry.category}
                      onChangeText={(value: string) => updateEntry(index, "category", value)}
                      placeholderTextColor="#6B6B6E"
                      style={inputStyle}
                    />
                  </YStack>
                  <YStack flex={1} gap="$2">
                    <Label>Type</Label>
                    <TextInput
                      value={entry.performanceType}
                      onChangeText={(value: string) => updateEntry(index, "performanceType", value as PerformanceType)}
                      placeholder={performanceTypes.join(", ")}
                      placeholderTextColor="#6B6B6E"
                      style={inputStyle}
                    />
                  </YStack>
                </XStack>
                <YStack gap="$2">
                  <Label>Notes</Label>
                  <TextInput
                    value={entry.notes}
                    onChangeText={(value: string) => updateEntry(index, "notes", value)}
                    placeholderTextColor="#6B6B6E"
                    style={inputStyle}
                  />
                </YStack>
              </YStack>
            ))}

            {detectedNames.length ? (
              <YStack gap="$3">
                <Text fontSize={15} fontWeight="700" color="$color">
                  Selected dancers
                </Text>
                <XStack gap="$2" flexWrap="wrap">
                  {detectedNames.map((name) => {
                    const selected = selectedNames.includes(name);
                    return (
                      <Button
                        key={name}
                        size="$3"
                        backgroundColor={selected ? "$accentSoft" : "$surface"}
                        color={selected ? "$accent" : "$secondaryText"}
                        borderWidth={1}
                        borderColor={selected ? "$accent" : "$divider"}
                        borderRadius="$4"
                        paddingHorizontal="$2.5"
                        onPress={() =>
                          setSelectedNames((current) =>
                            current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
                          )
                        }
                      >
                        {selected ? `${name} ×` : name}
                      </Button>
                    );
                  })}
                </XStack>
                <Text fontSize={14} color="$secondaryText">
                  Tap a selected name to remove it from this build.
                </Text>
              </YStack>
            ) : null}

            <YStack gap="$2.5">
              <Button
                backgroundColor="$surfaceMuted"
                color="$color"
                onPress={() => setEntries((current) => [...current, { ...defaultEntry(), competitionName: current[0]?.competitionName ?? "" }])}
              >
                Add another routine
              </Button>
              <Button
                backgroundColor="$accent"
                color="$shellDark"
                onPress={handleBuildManualSchedule}
                disabled={busy === "manual" || !selectedNames.length}
              >
                Build My Schedule
              </Button>
            </YStack>
          </YStack>
        )}
      </SectionCard>
    </AppScreen>
  );
}
