import { useEffect } from "react";
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold
} from "@expo-google-fonts/manrope";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import { AppDataProvider } from "@/providers/AppDataProvider";
import { AuthProvider, useAuthSession } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold
  });

  if (!fontsLoaded) {
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

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function LoadingScreen() {
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

function NavigatorStack() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#F8F7F4"
          }
        }}
      />
    </>
  );
}

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { loading, session, isSupabaseEnabled } = useAuthSession();
  const isSignInRoute = segments[0] === "sign-in";

  useEffect(() => {
    if (loading || !isSupabaseEnabled) {
      return;
    }

    if (!session && !isSignInRoute) {
      router.replace("/sign-in");
      return;
    }

    if (session && isSignInRoute) {
      router.replace("/(tabs)/schedule");
    }
  }, [isSignInRoute, isSupabaseEnabled, loading, router, session]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (isSupabaseEnabled && !session) {
    return <NavigatorStack />;
  }

  return (
    <AppDataProvider>
      <NavigatorStack />
    </AppDataProvider>
  );
}
