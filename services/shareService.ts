import { Share } from "react-native";

export const shareService = {
  async copy(text: string) {
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
  },

  async share(text: string) {
    await Share.share({
      message: text
    });
    return { method: "native" as const };
  }
};
