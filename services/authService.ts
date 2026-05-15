import { signInAnonymously } from "firebase/auth";
import type { AuthOtpResponse, User } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/config/supabase";
import { auth } from "@/services/firebaseClient";
import { getSupabaseClient, getSupabaseSession, getSupabaseUser } from "@/services/supabaseClient";

export interface AuthSession {
  uid: string;
  isMock: boolean;
  provider: "supabase" | "firebase-anon" | "mock";
  email?: string | null;
}

export interface MagicLinkRequest {
  email: string;
  fullName?: string;
  redirectTo?: string;
}

export const authService = {
  async getSignedInUser(): Promise<User | null> {
    return getSupabaseUser();
  },

  async hasSupabaseSession(): Promise<boolean> {
    const session = await getSupabaseSession();
    return Boolean(session?.user);
  },

  async requestMagicLink(request: MagicLinkRequest): Promise<AuthOtpResponse> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error("Supabase Auth is not configured yet.");
    }

    return supabase.auth.signInWithOtp({
      email: request.email.trim().toLowerCase(),
      options: {
        emailRedirectTo: request.redirectTo,
        data: request.fullName ? { full_name: request.fullName } : undefined
      }
    });
  },

  async signOutSupabase(): Promise<void> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  },

  async ensureSignedIn(): Promise<AuthSession> {
    if (hasSupabaseConfig) {
      const session = await getSupabaseSession();

      if (session?.user) {
        return {
          uid: session.user.id,
          isMock: false,
          provider: "supabase",
          email: session.user.email ?? null
        };
      }
    }

    if (!auth) {
      return {
        uid: "mock-parent-user",
        isMock: true,
        provider: "mock",
        email: null
      };
    }

    if (auth.currentUser) {
      return {
        uid: auth.currentUser.uid,
        isMock: false,
        provider: "firebase-anon",
        email: auth.currentUser.email ?? null
      };
    }

    const credential = await signInAnonymously(auth);

    return {
      uid: credential.user.uid,
      isMock: false,
      provider: "firebase-anon",
      email: credential.user.email ?? null
    };
  }
};
