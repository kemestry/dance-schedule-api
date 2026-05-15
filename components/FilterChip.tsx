import { Button } from "tamagui";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Button
      size="$3"
      borderRadius={999}
      borderWidth={1}
      borderColor={active ? "$accent" : "$divider"}
      backgroundColor={active ? "$accent" : "$surface"}
      color={active ? "$shellDark" : "$secondaryText"}
      fontWeight="700"
      paddingHorizontal="$3"
      pressStyle={{ opacity: 0.9 }}
      onPress={onPress}
    >
      {label}
    </Button>
  );
}
