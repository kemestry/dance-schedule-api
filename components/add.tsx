import { useEffect, useState } from "react";
import { router } from "expo-router";
import { TextInput } from "react-native";
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
  const [busy, setBusy] = useState<false | "link" | "screenshot" | "pdf" | "manual">(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null);

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
          setErrorMessage(job.error || "Background parsing failed. Please try manual entry instead.");
          clearParsingJob();
          setBusy(false);
        }
      } catch (error) {
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

      const result = await importCompetitionFromLink({ url: linkValue.trim() });
      if (result.parsingJob) {
        keepBusy = true;
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
      const result = await importCompetitionFromAsset(sourceType, asset);
      if (result.parsingJob) {
        keepBusy = true;
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
      subtitle="Get a weekend into CompCoach fast. Smart imports when they work, manual entry when they matter."
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
              Imports now use real inputs. Manual entry still saves the day if parsing comes back messy.
            </Text>
          </YStack>
        </XStack>
      </SectionCard>

      <SectionCard title="Import options" subtitle="All flows normalize into one clean CompCoach schedule model.">
        <YStack gap="$3">
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
            justifyContent="flex-start"
            onPress={handleLinkImport}
            disabled={Boolean(busy)}
          >
            Paste Competition Link
          </Button>
          <Button
            backgroundColor="$surfaceMuted"
            color="$color"
            justifyContent="flex-start"
            onPress={handleScreenshotImport}
            disabled={Boolean(busy)}
          >
            Upload Screenshot
          </Button>
          <Button
            backgroundColor="$surfaceMuted"
            color="$color"
            justifyContent="flex-start"
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
            {errorMessage}
          </Text>
          <Text fontSize={14} color="$secondaryText" lineHeight={22}>
            Manual entry is the guaranteed path in the MVP and is designed to save the weekend when parsing breaks.
          </Text>
        </SectionCard>
      ) : null}

      {lastImportSummary ? (
        <SectionCard title="Import status">
          <Text fontSize={14} color="$secondaryText" lineHeight={22}>
            {lastImportSummary}
          </Text>
          {activeParsingJob ? (
            <Text fontSize={14} color="$color" lineHeight={22}>
              Current job: {activeParsingJob.status}
            </Text>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Manual entry" subtitle="Fast multi-entry flow for the moments when screenshots and PDFs fail you.">
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

          <XStack gap="$3">
            <Button
              flex={1}
              backgroundColor="$surfaceMuted"
              color="$color"
              onPress={() => setEntries((current) => [...current, { ...defaultEntry(), competitionName: current[0]?.competitionName ?? "" }])}
            >
              Add another routine
            </Button>
            <Button
              flex={1}
              backgroundColor="$accent"
              color="$shellDark"
              onPress={handleBuildManualSchedule}
              disabled={busy === "manual" || !selectedNames.length}
            >
              Build My Schedule
            </Button>
          </XStack>
        </YStack>
      </SectionCard>

      {detectedNames.length ? (
        <SectionCard title="Detected dancers" subtitle="These names will power the combined schedule and share view.">
          <YStack gap="$3">
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
                    onPress={() =>
                      setSelectedNames((current) =>
                        current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
                      )
                    }
                  >
                    {name}
                  </Button>
                );
              })}
            </XStack>
            <Text fontSize={14} color="$secondaryText">
              Build My Schedule uses only the selected dancers. Manual entry is fully implemented. Link, screenshot, and PDF imports now upload real inputs. They use a remote parser when `EXPO_PUBLIC_PARSER_API_URL` is configured, otherwise they fall back to seeded parsed data.
            </Text>
          </YStack>
        </SectionCard>
      ) : (
        <EmptyStateCard
          title="No dancers detected yet"
          body="Start typing dancers into manual entry and CompCoach will prepare the combined schedule build step."
        />
      )}
    </AppScreen>
  );
}
