import { getApps, initializeApp, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { env } from "@/lib/env";

const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
// Auth stays real even in emulator mode — Auth alone doesn't require the
// Blaze plan, and the Keycloak/demo -> Firebase custom-token bridge
// (see FirebaseAuthBridge.tsx) needs real Auth to redeem custom tokens
// minted by the real service account against.
export const auth = getAuth(app);

// Local-testing-only: emulated Firestore/Storage instead of real Firebase
// (see Dockerfile.emulator and docs/setup-guide.md for why). The emulator
// container is reachable at a different hostname depending on where this
// code runs: server-side (inside the app's own Docker container) reaches
// it via the docker-compose service name, while client-side (the user's
// browser, outside any container) reaches it via the published localhost
// port — same split as the Keycloak dual-hostname problem this project
// already solved once for auth.
if (env.useFirebaseEmulators && !globalThis.__firebaseEmulatorsConnected) {
  const host = typeof window === "undefined" ? "firebase-emulator" : "localhost";
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  globalThis.__firebaseEmulatorsConnected = true;
}

declare global {
  // eslint-disable-next-line no-var
  var __firebaseEmulatorsConnected: boolean | undefined;
}
