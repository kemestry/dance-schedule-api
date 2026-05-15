import { createTamagui, createTokens } from "tamagui";

import { palette } from "@/constants/colors";

const tokens = createTokens({
  color: {
    background: palette.background,
    surface: palette.surface,
    surfaceMuted: palette.surfaceMuted,
    textPrimary: palette.textPrimary,
    textSecondary: palette.textSecondary,
    accent: palette.accent,
    accentSoft: palette.accentSoft,
    divider: palette.divider,
    conflict: palette.conflict,
    conflictSoft: palette.conflictSoft,
    shadow: palette.shadow,
    shellDark: palette.shellDark,
    shellDarkSoft: palette.shellDarkSoft,
    shellTextOnDark: palette.shellTextOnDark
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    "true": 16
  },
  size: {
    0: 0,
    1: 28,
    2: 32,
    3: 36,
    4: 40,
    5: 44,
    6: 52,
    7: 60,
    8: 72,
    9: 84,
    "true": 40
  },
  radius: {
    0: 0,
    1: 10,
    2: 14,
    3: 18,
    4: 24
  },
  zIndex: {
    0: 0,
    1: 10,
    2: 20
  }
});

const themes = {
  light: {
    background: tokens.color.background,
    color: tokens.color.textPrimary,
    surface: tokens.color.surface,
    surfaceMuted: tokens.color.surfaceMuted,
    accent: tokens.color.accent,
    accentSoft: tokens.color.accentSoft,
    divider: tokens.color.divider,
    secondaryText: tokens.color.textSecondary,
    conflict: tokens.color.conflict,
    conflictSoft: tokens.color.conflictSoft,
    shadowColor: tokens.color.shadow,
    shellDark: tokens.color.shellDark,
    shellDarkSoft: tokens.color.shellDarkSoft,
    shellTextOnDark: tokens.color.shellTextOnDark
  }
};

const config = createTamagui({
  tokens,
  themes,
  defaultTheme: "light",
  settings: {
    allowedStyleValues: "somewhat-strict"
  }
});

export default config;
