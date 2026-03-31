import { FIREBASE_REALM_COLLECTION } from "../content/Config.js";
import { firebaseConfigured, ensureFirebaseAuth, getFirebaseUserId, loadFirebaseRuntime } from "./FirebaseConfig.js";

async function getFirestoreRuntime() {
  const runtime = await loadFirebaseRuntime();
  return {
    db: runtime.db,
    doc: runtime.firestoreModule.doc,
    getDoc: runtime.firestoreModule.getDoc,
    onSnapshot: runtime.firestoreModule.onSnapshot,
    setDoc: runtime.firestoreModule.setDoc
  };
}

async function getRealmRef(realmId) {
  const { db, doc } = await getFirestoreRuntime();
  return doc(db, FIREBASE_REALM_COLLECTION, String(realmId || "main").trim() || "main");
}

export function isFirebaseConfigured() {
  return firebaseConfigured;
}

export async function loadFirebaseRealmState(realmId) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  await ensureFirebaseAuth();
  const { getDoc } = await getFirestoreRuntime();
  const snapshot = await getDoc(await getRealmRef(realmId));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.data();
}

export async function saveFirebaseRealmState(realmId, state, sourceClientId, appVersion = null) {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  await ensureFirebaseAuth();
  const { setDoc } = await getFirestoreRuntime();
  await setDoc(await getRealmRef(realmId), {
    state,
    appVersion,
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
  const { onSnapshot } = await getFirestoreRuntime();
  return onSnapshot(await getRealmRef(realmId), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
}
