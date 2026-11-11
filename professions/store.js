// Scarred Lands Professions — Firestore reads and writes.
// Reuses the Crystal Forge Firebase runtime (same project, anonymous auth).
// Document shapes come from model.js; security is in firestore.rules.

import { loadFirebaseRuntime } from "../firebase/FirebaseConfig.js?v=v1.7.24-20260907120000";
import { approveEntry, createProject, createRollEntry, normalizeCharacter, rejectEntry } from "./model.js";

const REALM = "main";

// Waits for the persisted session before signing in, so a reload keeps the same
// anonymous uid (and with it the claimed character). ensureFirebaseAuth() in
// FirebaseConfig.js checks currentUser too early and would mint a new uid.
async function runtime() {
  const rt = await loadFirebaseRuntime();
  if (typeof rt.auth.authStateReady === "function") await rt.auth.authStateReady();
  if (!rt.auth.currentUser) await rt.signInAnonymously(rt.auth);
  return { ...rt, fs: rt.firestoreModule, uid: rt.auth.currentUser?.uid ?? null };
}

/** Current anonymous uid (signs in if needed). */
export async function currentUid() {
  return (await runtime()).uid;
}

function realmRef(fs, db) {
  return fs.doc(db, "crafting", REALM);
}

function sub(fs, db, name, id) {
  return id ? fs.doc(db, "crafting", REALM, name, id) : fs.collection(db, "crafting", REALM, name);
}

function withId(snap) {
  return { id: snap.id, ...snap.data() };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function loadRealm() {
  const { fs, db } = await runtime();
  const snap = await fs.getDoc(realmRef(fs, db));
  return snap.exists() ? snap.data() : { downtime: { id: null, open: false, weeks: 0 }, regionLevels: {} };
}

export async function loadAll() {
  const { fs, db } = await runtime();
  const [realm, characters, projects, log] = await Promise.all([
    fs.getDoc(realmRef(fs, db)),
    fs.getDocs(sub(fs, db, "characters")),
    fs.getDocs(sub(fs, db, "projects")),
    fs.getDocs(fs.query(sub(fs, db, "log"), fs.orderBy("createdAt", "desc")))
  ]);
  return {
    realm: realm.exists() ? realm.data() : { downtime: { id: null, open: false, weeks: 0 }, regionLevels: {} },
    characters: characters.docs.map(withId),
    projects: projects.docs.map(withId),
    log: log.docs.map(withId)
  };
}

/** Live updates for the whole crafting realm. Returns an unsubscribe function. */
export async function subscribeAll(callback) {
  const { fs, db } = await runtime();
  const state = { realm: null, characters: [], projects: [], log: [] };
  const emit = () => callback({ ...state });
  const unsubs = [
    fs.onSnapshot(realmRef(fs, db), (s) => { state.realm = s.exists() ? s.data() : null; emit(); }),
    fs.onSnapshot(sub(fs, db, "characters"), (s) => { state.characters = s.docs.map(withId); emit(); }),
    fs.onSnapshot(sub(fs, db, "projects"), (s) => { state.projects = s.docs.map(withId); emit(); }),
    fs.onSnapshot(fs.query(sub(fs, db, "log"), fs.orderBy("createdAt", "desc")), (s) => { state.log = s.docs.map(withId); emit(); })
  ];
  return () => unsubs.forEach((u) => u());
}

/** The character this browser has claimed, or null. */
export async function loadMyMembership() {
  const { fs, db, uid } = await runtime();
  const snap = await fs.getDoc(sub(fs, db, "members", uid));
  return snap.exists() ? snap.data() : null;
}

// ─── Player writes ───────────────────────────────────────────────────────────

/** Claims a character with the code from the GM. */
export async function claimCharacter(code) {
  const { fs, db, uid } = await runtime();
  const clean = String(code ?? "").trim().toUpperCase();
  const claim = await fs.getDoc(sub(fs, db, "claims", clean));
  if (!claim.exists()) throw new Error("Ο κωδικός δεν υπάρχει.");
  const { charId } = claim.data();
  await fs.setDoc(sub(fs, db, "members", uid), { charId, code: clean });
  return charId;
}

export async function proposeProject({ charId, recipeId, facility, crafters }) {
  const { fs, db } = await runtime();
  const data = createProject({ charId, recipeId, facility, crafters });
  const ref = await fs.addDoc(sub(fs, db, "projects"), { ...data, createdAt: fs.serverTimestamp() });
  return ref.id;
}

export async function submitRoll({ character, charId, project, downtimeId, source, dice }) {
  const { fs, db, uid } = await runtime();
  const entry = createRollEntry({ character, charId, project, downtimeId, source, dice, uid });
  const ref = await fs.addDoc(sub(fs, db, "log"), { ...entry, createdAt: fs.serverTimestamp() });
  return { id: ref.id, ...entry };
}

// ─── GM writes ───────────────────────────────────────────────────────────────

export async function saveCharacter(charId, raw) {
  const { fs, db } = await runtime();
  const data = normalizeCharacter(raw);
  if (charId) {
    await fs.setDoc(sub(fs, db, "characters", charId), data);
    return charId;
  }
  const ref = await fs.addDoc(sub(fs, db, "characters"), data);
  return ref.id;
}

export async function createClaim(code, charId) {
  const { fs, db } = await runtime();
  await fs.setDoc(sub(fs, db, "claims", code), { charId });
}

export async function openDowntime(weeks) {
  const { fs, db } = await runtime();
  const id = `dt-${Date.now()}`;
  await fs.setDoc(realmRef(fs, db), { downtime: { id, open: true, weeks } }, { merge: true });
  return id;
}

export async function closeDowntime() {
  const { fs, db } = await runtime();
  await fs.setDoc(realmRef(fs, db), { downtime: { open: false } }, { merge: true });
}

export async function setProjectStatus(projectId, status) {
  const { fs, db } = await runtime();
  await fs.updateDoc(sub(fs, db, "projects", projectId), { status });
}

/** Adds a helper (PC or NPC) to a project. */
export async function addCrafter(projectId, charId) {
  const { fs, db } = await runtime();
  await fs.updateDoc(sub(fs, db, "projects", projectId), { crafters: fs.arrayUnion(charId) });
}

/** Approves a pending roll and advances its project, atomically. */
export async function approveRoll(entryId) {
  const { fs, db } = await runtime();
  await fs.runTransaction(db, async (tx) => {
    const entryRef = sub(fs, db, "log", entryId);
    const entrySnap = await tx.get(entryRef);
    if (!entrySnap.exists()) throw new Error("Το roll δεν υπάρχει.");
    const entry = entrySnap.data();
    const projectRef = sub(fs, db, "projects", entry.projectId);
    const projectSnap = await tx.get(projectRef);
    if (!projectSnap.exists()) throw new Error("Το project δεν υπάρχει.");
    const result = approveEntry(projectSnap.data(), entry);
    tx.update(entryRef, { status: result.entry.status });
    tx.update(projectRef, {
      weeksDone: result.project.weeksDone,
      complications: result.project.complications,
      status: result.project.status
    });
  });
}

export async function rejectRoll(entryId) {
  const { fs, db } = await runtime();
  const ref = sub(fs, db, "log", entryId);
  const snap = await fs.getDoc(ref);
  if (!snap.exists()) throw new Error("Το roll δεν υπάρχει.");
  await fs.updateDoc(ref, { status: rejectEntry(snap.data()).status });
}
