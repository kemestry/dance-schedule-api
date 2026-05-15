import { Button, Text, YStack } from "tamagui";

import { AppScreen } from "@/components/AppScreen";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SectionCard } from "@/components/SectionCard";
import { useAppData } from "@/providers/AppDataProvider";
import { shareService } from "@/services/shareService";
import { useCompetitionStore } from "@/hooks/useCompetitionStore";

export default function ShareScreen() {
  const { currentCompetitionId } = useAppData();
  const store = useCompetitionStore(currentCompetitionId);

  if (!store) {
    return (
      <AppScreen title="Share" eyebrow="Send" subtitle="Generate a clean text version for family and friends.">
        <EmptyStateCard
          title="Nothing to share yet"
          body="Add a competition first. Once you do, CompCoach will generate a clean summary instantly."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Share"
      eyebrow="Send"
      subtitle="A clean text summary for grandparents, carpools, and anyone asking where they need to be."
    >
      <SectionCard title="Preview" subtitle="Copy it or send it natively. The format stays lightweight and readable.">
        <YStack gap="$4">
          <YStack backgroundColor="$surfaceMuted" borderRadius={20} padding="$4">
            <Text fontSize={15} lineHeight={23} color="$color">
              {store.shareText}
            </Text>
          </YStack>
          <Button backgroundColor="$accent" color="$shellDark" onPress={() => shareService.copy(store.shareText)}>
            Copy clean text
          </Button>
          <Button
            backgroundColor="$surface"
            color="$color"
            borderWidth={1}
            borderColor="$divider"
            onPress={() => shareService.share(store.shareText)}
          >
            Native share
          </Button>
        </YStack>
      </SectionCard>
    </AppScreen>
  );
}
