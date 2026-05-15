import { FirebaseConfig } from "@/types/firebase";

const firebaseConfig: Partial<FirebaseConfig> = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

export const getFirebaseConfig = (): FirebaseConfig => {
  if (!hasFirebaseConfig) {
    throw new Error("Firebase config is missing. Add EXPO_PUBLIC_FIREBASE_* variables to enable live data.");
  }

  return firebaseConfig as FirebaseConfig;
};
