import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  getAuth,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";

const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "651494317419-3k9fb93vnbbic1ihgrfvv0f2gul70mtv.apps.googleusercontent.com";

// On web, @react-native-firebase falls back to the Firebase JS SDK which
// requires initializeApp(config) to be called first. This repo doesn't
// have a web Firebase config, so every auth call would crash with
// "No Firebase App '[DEFAULT]' has been created". The web build instead
// short-circuits every Firebase entry point — local email/password accounts
// and AsyncStorage continue to work, but Google sign-in and cloud sync
// are unavailable until web Firebase is properly initialized.
export const FIREBASE_WEB_DISABLED = Platform.OS === "web";

let configured = false;

export function initGoogleAuth() {
  if (FIREBASE_WEB_DISABLED) return;
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.User> {
  if (FIREBASE_WEB_DISABLED) {
    throw new Error("Google sign-in is not available on the web build.");
  }
  initGoogleAuth();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type === "cancelled") throw new Error("CANCELLED");
  const idToken = result.data?.idToken;
  if (!idToken) throw new Error("Google Sign-In did not return an ID token");
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(getAuth(), credential);
  return user;
}

export async function signOut(): Promise<void> {
  if (FIREBASE_WEB_DISABLED) return;
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn("[firebase-auth] GoogleSignin.signOut failed:", e);
  }
  await firebaseSignOut(getAuth());
}

export function onAuthChange(
  cb: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  if (FIREBASE_WEB_DISABLED) {
    // Emit a single null so consumers can settle their loading states.
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(getAuth(), cb);
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  if (FIREBASE_WEB_DISABLED) return null;
  return getAuth().currentUser;
}

export type AuthUser = FirebaseAuthTypes.User;
