import { Button, Text, XStack, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { SectionCard } from "@/components/SectionCard";
import { hasFirebaseConfig } from "@/config/firebase";
import { useAppData } from "@/providers/AppDataProvider";

export default function SettingsScreen() {
  const { refresh, competitions } = useAppData();

  return (
    <AppScreen title="Settings" eyebrow="Control" subtitle="Operational details, parser state, and environment checks.">
      <SectionCard>
        <XStack justifyContent="space-between" alignItems="flex-start" gap="$4">
          <YStack gap="$1.5" flex={1}>
            <Text fontSize={13} fontWeight="700" color="$secondaryText" textTransform="uppercase" letterSpacing={0.9}>
              Status
            </Text>
            <Text fontSize={28} fontWeight="800" color="$color" letterSpacing={-0.8}>
              {competitions.length} loaded
            </Text>
            <Text fontSize={15} color="$secondaryText" lineHeight={22}>
              Quick operational visibility for the current MVP environment.
            </Text>
          </YStack>
        </XStack>
      </SectionCard>
      <SectionCard title="Data mode">
        <YStack gap="$2">
          <Text fontSize={15} color="$color">
            {hasFirebaseConfig ? "Live Firebase mode" : "Seeded offline mode"}
          </Text>
          <Text fontSize={14} color="$secondaryText" lineHeight={21}>
            {hasFirebaseConfig
              ? "Firestore and Storage services are available. Auth uses anonymous sign-in."
              : "Firebase env vars are missing, so the app falls back to seeded competition data and mock parsing."}
          </Text>
        </YStack>
      </SectionCard>
      <SectionCard title="Weekend inventory">
        <Text fontSize={15} color="$secondaryText">
          {competitions.length} competition{competitions.length === 1 ? "" : "s"} currently available in the app.
        </Text>
      </SectionCard>
      <SectionCard title="Product direction">
        <YStack gap="$2.5">
          <Text fontSize={15} color="$color">
            CompCoach stays the active name and the schedule stays the source of truth.
          </Text>
          <Text fontSize={14} color="$secondaryText" lineHeight={21}>
            Next layers are schedule-linked costumes, food windows, lodging guidance, and a real-time weekend assistant.
          </Text>
        </YStack>
      </SectionCard>
      <SectionCard title="Security posture">
        <YStack gap="$2.5">
          <Text fontSize={15} color="$color">
            Least-privilege access and owner-scoped data are the default direction.
          </Text>
          <Text fontSize={14} color="$secondaryText" lineHeight={21}>
            Firestore and Storage rules are scaffolded so competitions, uploads, and future assistant layers stay user-scoped.
          </Text>
        </YStack>
      </SectionCard>
      <SectionCard title="Refresh">
        <Button backgroundColor="$accent" color="$shellDark" onPress={refresh}>
          Reload data
        </Button>
      </SectionCard>
    </AppScreen>
  );
}
