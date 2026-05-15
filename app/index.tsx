import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuthSession } from "@/providers/AuthProvider";

export default function Index() {
  const { loading, session, isSupabaseEnabled } = useAuthSession();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8F7F4"
        }}
      >
        <ActivityIndicator size="large" color="#5BAA8B" />
      </View>
    );
  }

  if (isSupabaseEnabled && !session) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/schedule" />;
}
