import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { Session, User } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { hasSupabaseConfig } from "@/config/supabase";
import { authService, MagicLinkRequest } from "@/services/authService";
import { getSupabaseClient, getSupabaseSession, getSupabaseUser } from "@/services/supabaseClient";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  isSupabaseEnabled: boolean;
  magicLinkRequestedFor: string | null;
  requestMagicLink: (request: MagicLinkRequest) => Promise<void>;
  clearMagicLinkRequest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractAuthParams(url: string) {
  const queryString = url.includes("#") ? url.split("#")[1] : url.split("?")[1] ?? "";
  const params = new URLSearchParams(queryString);

  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    code: params.get("code")
  };
}

function getAuthRedirectUrl() {
  return Linking.createURL("sign-in", { scheme: "compcoach" });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [magicLinkRequestedFor, setMagicLinkRequestedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    const syncFromUrl = async (url: string) => {
      const { accessToken, refreshToken, code } = extractAuthParams(url);

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (!error && mounted) {
          setSession(data.session);
          setUser(data.user);
          setMagicLinkRequestedFor(null);
        }

        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && mounted) {
          setSession(data.session);
          setUser(data.user);
          setMagicLinkRequestedFor(null);
        }
      }
    };

    const syncStoredSession = async () => {
      const existingSession = await getSupabaseSession();
      const existingUser = await getSupabaseUser();

      if (!mounted) {
        return;
      }

      setSession(existingSession);
      setUser(existingUser);
    };

    const bootstrap = async () => {
      try {
        await syncStoredSession();

        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await syncFromUrl(initialUrl);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    const urlSubscription = Linking.addEventListener("url", ({ url }) => {
      void syncFromUrl(url);
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void (async () => {
        await syncStoredSession();

        const resumeUrl = await Linking.getInitialURL();
        if (resumeUrl) {
          await syncFromUrl(resumeUrl);
        }
      })();
    });

    void bootstrap();

    return () => {
      mounted = false;
      subscription.data.subscription.unsubscribe();
      urlSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      isSupabaseEnabled: hasSupabaseConfig,
      magicLinkRequestedFor,
      requestMagicLink: async (request) => {
        const redirectTo = request.redirectTo ?? getAuthRedirectUrl();
        await authService.requestMagicLink({
          ...request,
          redirectTo
        });
        setMagicLinkRequestedFor(request.email);
      },
      clearMagicLinkRequest: () => setMagicLinkRequestedFor(null),
      signOut: async () => {
        await authService.signOutSupabase();
        setSession(null);
        setUser(null);
      }
    }),
    [loading, magicLinkRequestedFor, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuthSession must be used within an AuthProvider");
  }

  return value;
}
