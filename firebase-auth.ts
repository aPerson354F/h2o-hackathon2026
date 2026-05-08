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

let configured = false;

export function initGoogleAuth() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.User> {
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
  return onAuthStateChanged(getAuth(), cb);
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return getAuth().currentUser;
}

export type AuthUser = FirebaseAuthTypes.User;
