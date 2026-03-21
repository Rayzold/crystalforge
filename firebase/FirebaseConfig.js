import { FIREBASE_CONFIG } from "../content/Config.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function hasFirebaseConfig(config) {
  return Boolean(
    config?.apiKey &&
      config?.authDomain &&
      config?.projectId &&
      config?.appId
  );
}

export const firebaseConfigured = hasFirebaseConfig(FIREBASE_CONFIG);

export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(FIREBASE_CONFIG)
  : null;

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null;

export async function ensureFirebaseAuth() {
  if (!firebaseConfigured || !firebaseAuth) {
    throw new Error("Firebase is not configured.");
  }
  if (!firebaseAuth.currentUser) {
    await signInAnonymously(firebaseAuth);
  }
  return firebaseAuth.currentUser;
}

export function getFirebaseUserId() {
  return firebaseAuth?.currentUser?.uid ?? null;
}
