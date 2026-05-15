import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabaseConfig, hasSupabaseConfig } from "@/config/supabase";

type SupabaseModule = typeof import("@supabase/supabase-js");

let cachedSupabaseClient: SupabaseClient | null | undefined;

function createSupabaseClient(module: SupabaseModule): SupabaseClient {
  const config = getSupabaseConfig();

  return module.createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage as unknown as {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<void>;
        removeItem: (key: string) => Promise<void>;
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig) {
    return null;
  }

  if (cachedSupabaseClient !== undefined) {
    return cachedSupabaseClient;
  }

  try {
    const supabaseModule = require("@supabase/supabase-js") as SupabaseModule;
    cachedSupabaseClient = createSupabaseClient(supabaseModule);
  } catch (error) {
    console.warn("Supabase client failed to initialize", error);
    cachedSupabaseClient = null;
  }

  return cachedSupabaseClient;
}

export async function getSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session ?? null;
}

export async function getSupabaseUser(): Promise<User | null> {
  const session = await getSupabaseSession();
  return session?.user ?? null;
}
