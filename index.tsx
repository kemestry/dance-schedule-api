import { Redirect } from "expo-router";

import { useAuthSession } from "@/providers/AuthProvider";

export default function Index() {
  const { loading, session, isSupabaseEnabled } = useAuthSession();

  if (loading) {
    return null;
  }

  if (isSupabaseEnabled && !session) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/schedule" />;
}
