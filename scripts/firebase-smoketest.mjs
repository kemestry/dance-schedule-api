import { initializeApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const requiredEnvKeys = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredEnvKeys.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing Firebase env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const testId = `smoketest-${Date.now()}`;
const testRef = doc(collection(firestore, "competitions"), testId);

const payload = {
  name: "Firebase smoke test",
  sourceType: "manual",
  startDate: "2026-04-13",
  endDate: "2026-04-13",
  createdAt: serverTimestamp(),
  testMarker: true,
};

try {
  await setDoc(testRef, payload);
  const snapshot = await getDoc(testRef);

  console.log(
    JSON.stringify(
      {
        success: snapshot.exists(),
        path: testRef.path,
        id: testRef.id,
        data: snapshot.data(),
      },
      null,
      2
    )
  );
} finally {
  try {
    await deleteDoc(testRef);
  } catch (error) {
    console.error(`Cleanup failed for ${testRef.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
