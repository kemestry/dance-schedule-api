const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  bucket: process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET,
  signedUrlTtlSeconds: Number(process.env.EXPO_PUBLIC_SUPABASE_SIGNED_URL_TTL_SECONDS ?? "3600")
};

export const hasSupabaseConfig = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const hasSupabaseStorageConfig = Boolean(
  supabaseConfig.url && supabaseConfig.anonKey && supabaseConfig.bucket
);

export const getSupabaseConfig = () => {
  if (!hasSupabaseConfig) {
    throw new Error("Supabase config is missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return {
    url: supabaseConfig.url as string,
    anonKey: supabaseConfig.anonKey as string
  };
};

export const getSupabaseStorageConfig = () => {
  if (!hasSupabaseStorageConfig) {
    throw new Error("Supabase storage config is missing. Add EXPO_PUBLIC_SUPABASE_* variables.");
  }

  return {
    url: supabaseConfig.url as string,
    anonKey: supabaseConfig.anonKey as string,
    bucket: supabaseConfig.bucket as string,
    signedUrlTtlSeconds: Number.isFinite(supabaseConfig.signedUrlTtlSeconds)
      ? supabaseConfig.signedUrlTtlSeconds
      : 3600
  };
};
