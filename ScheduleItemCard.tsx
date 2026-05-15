import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";

import { ScheduleEntry } from "@/types/models";

interface ScheduleItemCardProps {
  entry: ScheduleEntry & { dancerName: string; dancerColor: string };
  onPress: () => void;
  costumeName?: string;
  checklistSummary?: string;
  checklistTone?: "default" | "warning" | "ready";
}

export function ScheduleItemCard({
  entry,
  onPress,
  costumeName,
  checklistSummary,
  checklistTone = "default",
}: ScheduleItemCardProps) {
  const checklistBackground =
    checklistTone === "warning" ? "$conflictSoft" : checklistTone === "ready" ? "$accentSoft" : "$surfaceMuted";
  const checklistColor =
    checklistTone === "warning" ? "$conflict" : checklistTone === "ready" ? "$shellDark" : "$secondaryText";

  return (
    <Pressable onPress={onPress}>
      <XStack
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$divider"
        borderRadius={22}
        paddingHorizontal="$4"
        paddingVertical="$3.5"
        gap="$3.5"
        alignItems="center"
      >
        <YStack width={76} gap="$0.5">
          <Text fontSize={18} fontWeight="800" color="$color" letterSpacing={-0.35}>
            {entry.eventTime}
          </Text>
          <Text fontSize={12} color="$secondaryText" textTransform="uppercase" letterSpacing={0.5}>
            {entry.performanceType}
          </Text>
        </YStack>
        <YStack width={8} alignSelf="stretch" borderRadius={999} style={{ backgroundColor: entry.dancerColor }} />
        <YStack flex={1} gap="$1.5">
          <Text fontSize={17} fontWeight="700" color="$color" letterSpacing={-0.15} lineHeight={22}>
            {entry.title}
          </Text>
          {costumeName || checklistSummary ? (
            <YStack gap="$1">
              {costumeName ? (
                <Text fontSize={13} fontWeight="600" color="$secondaryText">
                  Costume: {costumeName}
                </Text>
              ) : null}
              {checklistSummary ? (
                <Text
                  fontSize={12}
                  fontWeight="700"
                  color={checklistColor}
                  backgroundColor={checklistBackground}
                  paddingHorizontal="$2"
                  paddingVertical={6}
                  borderRadius={999}
                  alignSelf="flex-start"
                >
                  {checklistSummary}
                </Text>
              ) : null}
            </YStack>
          ) : null}
          <XStack gap="$2" flexWrap="wrap">
            <Text
              fontSize={12}
              fontWeight="700"
              color="$color"
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2"
              paddingVertical={6}
              borderRadius={999}
            >
              {entry.dancerName}
            </Text>
            <Text
              fontSize={12}
              fontWeight="600"
              color="$secondaryText"
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2"
              paddingVertical={6}
              borderRadius={999}
            >
              {entry.category}
            </Text>
          </XStack>
        </YStack>
        <Text fontSize={22} color="$secondaryText">
          ›
        </Text>
      </XStack>
    </Pressable>
  );
}
