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

function getEventTheme(event: TimelineEvent) {
  switch (event.type) {
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
      if (event.eventKind === "awards") {
        return {
          railColor: "#B18D4D",
          badgeBackground: "$accentSoft" as const,
          badgeColor: "$shellDark" as const,
        };
      }

      if (event.eventKind === "judges-break") {
        return {
          railColor: "#7A97B8",
          badgeBackground: "$surfaceMuted" as const,
          badgeColor: "$secondaryText" as const,
        };
      }

      return {
        railColor: "$divider" as const,
        badgeBackground: "$surfaceMuted" as const,
        badgeColor: "$secondaryText" as const,
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
  const theme = getEventTheme(event);

  return (
    <XStack gap="$3" alignItems="stretch">
      <YStack width={52} paddingTop="$1" gap="$1.5">
        <Text fontSize={14} fontWeight="700" color="$secondaryText">
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
        padding="$3.5"
        gap="$2"
      >
        <XStack justifyContent="space-between" alignItems="center" gap="$3">
          <Text fontSize={18} fontWeight="700" color="$color" letterSpacing={-0.3} flex={1}>
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
            {getEventLabel(event.type)}
          </Text>
        </XStack>

        {event.subtitle ? (
          <Text fontSize={14} color="$secondaryText" lineHeight={21}>
            {event.subtitle}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
