import { FIREBASE_CONFIG } from "../content/Config.js";

const FIREBASE_SDK_VERSION = "12.10.0";

function hasFirebaseConfig(config) {
  return Boolean(
    config?.apiKey &&
      config?.authDomain &&
      config?.projectId &&
      config?.appId
  );
}

export const firebaseConfigured = hasFirebaseConfig(FIREBASE_CONFIG);
let firebaseRuntimePromise = null;
let cachedFirebaseRuntime = null;

function buildFirebaseSdkError(error) {
  const message = error?.message ? String(error.message) : String(error ?? "Unknown Firebase SDK error.");
  return new Error(`Firebase SDK failed to load. ${message}`);
}

export async function loadFirebaseRuntime() {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  if (cachedFirebaseRuntime) {
    return cachedFirebaseRuntime;
  }

  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ])
      .then(([firebaseAppModule, firebaseAuthModule, firebaseFirestoreModule]) => {
        const app = firebaseAppModule.getApps().length
          ? firebaseAppModule.getApp()
          : firebaseAppModule.initializeApp(FIREBASE_CONFIG);
        cachedFirebaseRuntime = {
          app,
          auth: firebaseAuthModule.getAuth(app),
          db: firebaseFirestoreModule.getFirestore(app),
          signInAnonymously: firebaseAuthModule.signInAnonymously,
          firestoreModule: firebaseFirestoreModule
        };
        return cachedFirebaseRuntime;
      })
      .catch((error) => {
        firebaseRuntimePromise = null;
        throw buildFirebaseSdkError(error);
      });
  }

  return firebaseRuntimePromise;
}

export async function ensureFirebaseAuth() {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  const runtime = await loadFirebaseRuntime();
  if (!runtime.auth.currentUser) {
    await runtime.signInAnonymously(runtime.auth);
  }
  return runtime.auth.currentUser;
}

export function getFirebaseUserId() {
  return cachedFirebaseRuntime?.auth?.currentUser?.uid ?? null;
}
