const supabaseStorageConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  bucket: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET,
  signedUrlTtlSeconds: Number(process.env.EXPO_PUBLIC_SUPABASE_SIGNED_URL_TTL_SECONDS ?? "3600")
};

export const hasSupabaseStorageConfig = Boolean(
  supabaseStorageConfig.url && supabaseStorageConfig.anonKey && supabaseStorageConfig.bucket
);

export const storageProvider = hasSupabaseStorageConfig ? "supabase" : "firebase";

export const getSupabaseStorageConfig = () => {
  if (!hasSupabaseStorageConfig) {
    throw new Error("Supabase storage config is missing. Add EXPO_PUBLIC_SUPABASE_* variables.");
  }

  return {
    url: supabaseStorageConfig.url as string,
    anonKey: supabaseStorageConfig.anonKey as string,
    bucket: supabaseStorageConfig.bucket as string,
    signedUrlTtlSeconds: Number.isFinite(supabaseStorageConfig.signedUrlTtlSeconds)
      ? supabaseStorageConfig.signedUrlTtlSeconds
      : 3600
  };
};
