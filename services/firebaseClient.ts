import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, type FirebaseApp } from "firebase/app";
import type { Auth, Persistence } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

type ReactNativeAuthModule = typeof import("firebase/auth") & {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

const reactNativeAuth = require("../node_modules/firebase/node_modules/@firebase/auth/dist/rn/index.js") as ReactNativeAuthModule;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const app: FirebaseApp | null = hasFirebaseConfig
  ? initializeApp(firebaseConfig as {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
    })
  : null;

const auth: Auth | null = app
  ? (() => {
      try {
        return reactNativeAuth.initializeAuth(app, {
          persistence: reactNativeAuth.getReactNativePersistence(AsyncStorage)
        });
      } catch {
        return reactNativeAuth.getAuth(app);
      }
    })()
  : null;

const firestore: Firestore | null = app ? getFirestore(app) : null;
const storageBucket = firebaseConfig.storageBucket;
const storage: FirebaseStorage | null =
  app && storageBucket ? getStorage(app, `gs://${storageBucket}`) : null;

export { app, auth, firestore, hasFirebaseConfig, storage };
