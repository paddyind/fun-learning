import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Server-only secrets. The `server-only` import makes any accidental
 * import of this file from client component code fail at build time
 * instead of silently shipping undefined/leaking secrets to the browser.
 */
export const serverEnv = {
  keycloak: {
    clientId: required("KEYCLOAK_CLIENT_ID", process.env.KEYCLOAK_CLIENT_ID),
    clientSecret: required("KEYCLOAK_CLIENT_SECRET", process.env.KEYCLOAK_CLIENT_SECRET),
    issuer: required("KEYCLOAK_ISSUER", process.env.KEYCLOAK_ISSUER),
  },
  nextAuth: {
    url: required("NEXTAUTH_URL", process.env.NEXTAUTH_URL),
    secret: required("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET),
  },
  firebaseAdmin: {
    projectId: required("FIREBASE_ADMIN_PROJECT_ID", process.env.FIREBASE_ADMIN_PROJECT_ID),
    clientEmail: required("FIREBASE_ADMIN_CLIENT_EMAIL", process.env.FIREBASE_ADMIN_CLIENT_EMAIL),
    privateKey: required("FIREBASE_ADMIN_PRIVATE_KEY", process.env.FIREBASE_ADMIN_PRIVATE_KEY).replace(
      /\\n/g,
      "\n"
    ),
  },
  gemini: {
    apiKey: required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
};
