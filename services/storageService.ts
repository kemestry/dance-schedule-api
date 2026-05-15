import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { getSupabaseStorageConfig, hasSupabaseStorageConfig } from "@/config/storage";
import { authService } from "@/services/authService";
import { storage } from "@/services/firebaseClient";
import { getSupabaseClient } from "@/services/supabaseClient";
import { ImportedScheduleAsset, StoredScheduleAsset } from "@/types/models";

type FirebaseStorageErrorLike = {
  code?: string;
  message?: string;
  serverResponse?: string;
  customData?: Record<string, unknown>;
};

type SupabaseStorageErrorLike = {
  message?: string;
  statusCode?: string;
  error?: string;
};

export const storageService = {
  async uploadScheduleAsset(path: string, blob: Blob): Promise<string> {
    if (!storage) {
      return `mock://storage/${path}`;
    }

    const storageRef = ref(storage, path);
    try {
      await uploadBytes(storageRef, blob);
    } catch (error) {
      const storageError = error as FirebaseStorageErrorLike;
      const detail = storageError.serverResponse || storageError.message || String(error);
      throw new Error(
        [
          storageError.code || "storage/unknown",
          detail,
          storageError.customData ? JSON.stringify(storageError.customData) : null
        ]
          .filter(Boolean)
          .join(" :: ")
      );
    }
    return getDownloadURL(storageRef);
  },

  async uploadImportedAsset(asset: ImportedScheduleAsset): Promise<StoredScheduleAsset> {
    const session = await authService.ensureSignedIn();
    const extension = asset.name.includes(".") ? asset.name.split(".").pop() : asset.mimeType.split("/").pop() || "bin";
    const safeName = asset.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const objectPath = `users/${session.uid}/schedule-assets/${Date.now()}-${safeName}.${extension}`;

    const supabase = getSupabaseClient();

    if (hasSupabaseStorageConfig && supabase) {
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const { bucket, signedUrlTtlSeconds } = getSupabaseStorageConfig();
      const uploadResult = await supabase.storage.from(bucket).upload(objectPath, arrayBuffer, {
        contentType: asset.mimeType,
        upsert: false
      });

      if (uploadResult.error) {
        const error = uploadResult.error as SupabaseStorageErrorLike;
        throw new Error(
          [error.error || "supabase-storage/upload", error.message, error.statusCode].filter(Boolean).join(" :: ")
        );
      }

      return {
        ...asset,
        storagePath: `${bucket}/${objectPath}`
      };
    }

    if (!storage) {
      return {
        ...asset,
        storagePath: objectPath,
        downloadUrl: `mock://storage/${objectPath}`
      };
    }

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const downloadUrl = await this.uploadScheduleAsset(objectPath, blob);

    return {
      ...asset,
      storagePath: objectPath,
      downloadUrl
    };
  }
};
