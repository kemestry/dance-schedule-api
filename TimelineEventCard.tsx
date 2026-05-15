import { Text, XStack, YStack } from "tamagui";

import { TimelineEvent } from "@/types/models";

interface TimelineEventCardProps {
  event: TimelineEvent;
}

function getEventLabel(type: TimelineEvent["type"]) {
  switch (type) {
    case "prep":
      return "Prep";
    case "routine":
      return "Routine";
    case "food":
      return "Food";
    case "travel":
      return "Travel";
    case "competition":
      return "Competition";
    default:
      return "Assistant";
  }
}

function getEventTheme(type: TimelineEvent["type"]) {
  switch (type) {
    case "prep":
      return {
        railColor: "$shellDark" as const,
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$shellDark" as const,
      };
    case "routine":
      return {
        railColor: "$accent" as const,
        badgeBackground: "$accentSoft" as const,
        badgeColor: "$shellDark" as const,
      };
    case "food":
      return {
        railColor: "#D0A46C",
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$color" as const,
      };
    case "travel":
      return {
        railColor: "#7A97B8",
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$secondaryText" as const,
      };
    case "competition":
      return {
        railColor: "#B18D4D",
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$color" as const,
      };
    default:
      return {
        railColor: "$divider" as const,
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$secondaryText" as const,
      };
  }
}

function formatTime(datetime: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(datetime));
}

export function TimelineEventCard({ event }: TimelineEventCardProps) {
  const theme = getEventTheme(event.type);
  const label = event.type === "competition" && event.eventKind
    ? event.eventKind === "awards"
      ? "Awards"
      : event.eventKind === "judges-break"
        ? "Judges break"
        : event.eventKind === "break"
          ? "Break"
          : "Competition"
    : getEventLabel(event.type);

  return (
    <XStack gap="$2.5" alignItems="stretch">
      <YStack width={58} paddingTop="$1" gap="$1">
        <Text fontSize={13} fontWeight="700" color="$secondaryText" lineHeight={16}>
          {formatTime(event.datetime)}
        </Text>
      </YStack>

      <YStack width={4} borderRadius={999} style={{ backgroundColor: theme.railColor }} />

      <YStack
        flex={1}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$divider"
        borderRadius={22}
        padding="$3"
        gap="$1.5"
      >
        <XStack justifyContent="space-between" alignItems="center" gap="$3">
          <Text fontSize={16} fontWeight="800" color="$color" letterSpacing={-0.25} lineHeight={21} flex={1}>
            {event.title}
          </Text>
          <Text
            fontSize={11}
            fontWeight="700"
            color={theme.badgeColor}
            backgroundColor={theme.badgeBackground}
            paddingHorizontal="$2"
            paddingVertical={6}
            borderRadius={999}
            textTransform="uppercase"
            letterSpacing={0.7}
          >
            {label}
          </Text>
        </XStack>

        {event.subtitle ? (
          <Text fontSize={13} color="$secondaryText" lineHeight={20}>
            {event.subtitle}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
