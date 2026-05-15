import { PropsWithChildren } from "react";
import { TamaguiProvider } from "tamagui";

import config from "@/tamagui.config";

export function ThemeProvider({ children }: PropsWithChildren) {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>;
}
