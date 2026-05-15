import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseStorageConfig, hasSupabaseStorageConfig } from "@/config/storage";

const supabase: SupabaseClient | null = hasSupabaseStorageConfig
  ? (() => {
      const config = getSupabaseStorageConfig();

      return createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    })()
  : null;

export { supabase };
