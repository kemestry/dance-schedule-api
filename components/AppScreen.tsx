import { PropsWithChildren, Ref } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, Text, View, XStack, YStack } from "tamagui";

interface AppScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  scrollable?: boolean;
  eyebrow?: string;
  headerVariant?: "shell" | "plain";
  scrollViewRef?: Ref<any>;
}

export function AppScreen({
  children,
  title,
  subtitle,
  scrollable = true,
  eyebrow,
  headerVariant = "shell",
  scrollViewRef
}: AppScreenProps) {
  const content = (
    <YStack gap="$5" paddingHorizontal="$4" paddingTop="$4" paddingBottom="$8">
      {headerVariant === "shell" ? (
        <YStack
          backgroundColor="$shellDark"
          borderRadius={28}
          paddingHorizontal="$4"
          paddingVertical="$5"
          gap="$3"
        >
          <XStack alignItems="center" justifyContent="space-between" gap="$4">
            <YStack gap="$1">
              {eyebrow ? (
                <Text fontSize={12} fontWeight="700" color="$accent" textTransform="uppercase" letterSpacing={1.1}>
                  {eyebrow}
                </Text>
              ) : null}
              <Text fontSize={32} fontWeight="800" color="$shellTextOnDark" letterSpacing={-0.8}>
                {title}
              </Text>
            </YStack>
            <YStack
              width={54}
              height={54}
              borderRadius={999}
              backgroundColor="$shellDarkSoft"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={18} fontWeight="700" color="$accent">
                CC
              </Text>
            </YStack>
          </XStack>
          {subtitle ? (
            <Text fontSize={15} color="$shellTextOnDark" opacity={0.8} lineHeight={22}>
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      ) : (
        <YStack gap="$2">
          {eyebrow ? (
            <Text fontSize={12} fontWeight="700" color="$accent" textTransform="uppercase" letterSpacing={1.1}>
              {eyebrow}
            </Text>
          ) : null}
          <Text fontSize={30} fontWeight="700" color="$color" letterSpacing={-0.4}>
            {title}
          </Text>
          {subtitle ? (
            <Text fontSize={16} color="$secondaryText" lineHeight={24}>
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      )}
      {children}
    </YStack>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F6F3EA" }}>
      {scrollable ? (
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>{content}</ScrollView>
      ) : (
        <View flex={1}>{content}</View>
      )}
    </SafeAreaView>
  );
}
