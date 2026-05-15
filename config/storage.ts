import { getSupabaseStorageConfig, hasSupabaseStorageConfig } from "@/config/supabase";

export { getSupabaseStorageConfig, hasSupabaseStorageConfig };

export const storageProvider = hasSupabaseStorageConfig ? "supabase" : "firebase";
