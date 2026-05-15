import { Text, XStack, YStack } from "tamagui";

import { ScheduleConflict } from "@/types/models";

interface ConflictCardProps {
  conflict: ScheduleConflict;
}

export function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <XStack
      backgroundColor="$conflictSoft"
      borderRadius={22}
      borderWidth={1}
      borderColor="$conflict"
      paddingHorizontal="$4"
      paddingVertical="$4"
      gap="$3"
      alignItems="flex-start"
    >
      <Text fontSize={18} color="$conflict">
        !
      </Text>
      <YStack flex={1} gap="$1">
        <Text fontSize={16} fontWeight="600" color="$color">
          {conflict.title}
        </Text>
        <Text fontSize={14} color="$secondaryText" lineHeight={20}>
          {conflict.description}
        </Text>
      </YStack>
    </XStack>
  );
}
