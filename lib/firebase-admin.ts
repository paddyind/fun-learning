import "server-only";
import { getApps, initializeApp, cert, getApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { serverEnv } from "@/lib/server-env";

let cachedApp: App | null = null;

// Lazy on purpose: Next.js imports every route handler module during
// `next build`'s page-data collection, even though nothing is invoked. Eager
// initialization here would parse the service-account private key at build
// time and crash the build whenever a real key isn't available yet (e.g. a
// fresh checkout or a Docker image built before secrets are provisioned).
function getAdminApp(): App {
  if (!cachedApp) {
    cachedApp = getApps().length
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId: serverEnv.firebaseAdmin.projectId,
            clientEmail: serverEnv.firebaseAdmin.clientEmail,
            privateKey: serverEnv.firebaseAdmin.privateKey,
          }),
        });
  }
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// Bypasses Firestore Security Rules — only use for server-side writes that
// have already been authorized in code (see route handlers under app/api/).
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
