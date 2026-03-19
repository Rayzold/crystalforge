import { FIREBASE_REALM_COLLECTION } from "../content/Config.js";
import { firebaseConfigured, firebaseDb, ensureFirebaseAuth, getFirebaseUserId } from "./FirebaseConfig.js";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function getRealmRef(realmId) {
  return doc(firebaseDb, FIREBASE_REALM_COLLECTION, String(realmId || "main").trim() || "main");
}

export function isFirebaseConfigured() {
  return firebaseConfigured;
}

export async function loadFirebaseRealmState(realmId) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  await ensureFirebaseAuth();
  const snapshot = await getDoc(getRealmRef(realmId));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data();
}

export async function saveFirebaseRealmState(realmId, state, sourceClientId) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  await ensureFirebaseAuth();
  await setDoc(getRealmRef(realmId), {
    state,
    sourceClientId: sourceClientId ?? null,
    updatedAtMs: Date.now(),
    updatedBy: getFirebaseUserId()
  });
}

export async function subscribeFirebaseRealmState(realmId, callback) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  await ensureFirebaseAuth();
  return onSnapshot(getRealmRef(realmId), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
}
