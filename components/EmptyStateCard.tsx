import { Button, Text, YStack } from "tamagui";

interface EmptyStateCardProps {
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}

export function EmptyStateCard({ title, body, ctaLabel, onPress }: EmptyStateCardProps) {
  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$divider"
      borderRadius="$3"
      paddingHorizontal="$4"
      paddingVertical="$5"
      gap="$3"
      alignItems="flex-start"
    >
      <Text fontSize={18} fontWeight="600" color="$color">
        {title}
      </Text>
      <Text fontSize={15} color="$secondaryText" lineHeight={22}>
        {body}
      </Text>
      {ctaLabel && onPress ? (
        <Button backgroundColor="$accent" color="white" borderRadius="$4" onPress={onPress}>
          {ctaLabel}
        </Button>
      ) : null}
    </YStack>
  );
}
