import { PropsWithChildren } from "react";
import { Text, YStack } from "tamagui";

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
}

export function SectionCard({ children, title, subtitle }: SectionCardProps) {
  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$divider"
      borderRadius={22}
      paddingHorizontal="$4"
      paddingVertical="$3.5"
      gap="$3"
      shadowColor="$shadowColor"
      shadowOpacity={0.08}
      shadowRadius={24}
      shadowOffset={{ width: 0, height: 10 }}
    >
      {title ? (
        <YStack gap="$1">
          <Text fontSize={18} fontWeight="800" color="$color" letterSpacing={-0.2} lineHeight={22}>
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize={14} color="$secondaryText" lineHeight={20}>
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      ) : null}
      {children}
    </YStack>
  );
}
