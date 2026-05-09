import { Platform } from "react-native";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

// See firebase-auth.ts for context — Firebase JS SDK isn't initialized on
// web, so every Firestore entry point short-circuits to a benign no-op.
// Cloud sync is therefore unavailable on the web build; local AsyncStorage
// state remains the source of truth.
const FIREBASE_WEB_DISABLED = Platform.OS === "web";

// Cloud-side schema (kept intentionally narrow to limit churn). Iteration 1
// synced profile + badges. Iteration 2 adds stats. Daily logs, notifications,
// and per-day claimed challenges still land in subcollections in iteration 3.
export type CloudStats = {
  xp: number;
  streak: number;
  lifetimeSaved: number;
};

export type CloudUserData = {
  profile?: Record<string, unknown>;
  badges?: string[];
  stats?: CloudStats;
  updatedAt?: FirebaseFirestoreTypes.Timestamp;
};

const userDoc = (uid: string) => doc(getFirestore(), "users", uid);

export async function pullUserData(uid: string): Promise<CloudUserData | null> {
  if (FIREBASE_WEB_DISABLED) return null;
  const snap = await getDoc(userDoc(uid));
  return snap.exists() ? (snap.data() as CloudUserData) : null;
}

export async function pushUserData(
  uid: string,
  data: CloudUserData,
): Promise<void> {
  if (FIREBASE_WEB_DISABLED) return;
  await setDoc(
    userDoc(uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function subscribeUserData(
  uid: string,
  cb: (data: CloudUserData | null) => void,
): () => void {
  if (FIREBASE_WEB_DISABLED) {
    cb(null);
    return () => {};
  }
  return onSnapshot(userDoc(uid), (snap) => {
    cb(snap.exists() ? (snap.data() as CloudUserData) : null);
  });
}

// Daily log subcollection: one document per YYYY-MM-DD. Entry shape mirrors
// what LoggerScreen writes to AsyncStorage so callers don't need to remap.
export type LogEntry = {
  label: string;
  gallons: number;
  time: string;
  icon?: string;
};

export type CloudDayLog = {
  entries: LogEntry[];
  total: number;
};

const userLogColl = (uid: string) =>
  collection(getFirestore(), "users", uid, "log");

const userLogDoc = (uid: string, date: string) =>
  doc(getFirestore(), "users", uid, "log", date);

export async function pullAllLogs(
  uid: string,
): Promise<Record<string, CloudDayLog>> {
  if (FIREBASE_WEB_DISABLED) return {};
  const snap = await getDocs(userLogColl(uid));
  const out: Record<string, CloudDayLog> = {};
  snap.forEach((d) => {
    const data = d.data() as Partial<CloudDayLog>;
    out[d.id] = {
      entries: Array.isArray(data.entries) ? data.entries : [],
      total: typeof data.total === "number" ? data.total : 0,
    };
  });
  return out;
}

export async function pushDayLog(
  uid: string,
  date: string,
  data: CloudDayLog,
): Promise<void> {
  if (FIREBASE_WEB_DISABLED) return;
  await setDoc(userLogDoc(uid, date), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
