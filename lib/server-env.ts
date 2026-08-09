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
export const serverEnv = (() => {
  // Public, browser-reachable issuer — also what Keycloak puts in every
  // token's `iss` claim (see identity-platform's KC_HOSTNAME). Used for
  // the authorization redirect and for `iss` validation.
  const keycloakIssuer = required("KEYCLOAK_ISSUER", process.env.KEYCLOAK_ISSUER);

  return {
    keycloak: {
      clientId: required("KEYCLOAK_CLIENT_ID", process.env.KEYCLOAK_CLIENT_ID),
      clientSecret: required("KEYCLOAK_CLIENT_SECRET", process.env.KEYCLOAK_CLIENT_SECRET),
      issuer: keycloakIssuer,
      // Where THIS app's own server reaches the same Keycloak for
      // token/userinfo/JWKS calls. Defaults to `issuer` (correct for
      // `npm run dev`, no Docker boundary); the Docker Compose `web`
      // service overrides this to `http://host.docker.internal:3510/...`
      // since `localhost` inside that container means the container
      // itself. Never used for `iss` validation — see lib/auth.ts and
      // identity-platform's docs/ONBOARDING.md "public issuer vs Docker
      // JWKS URL" for why mixing these up breaks token validation.
      internalIssuer: process.env.KEYCLOAK_INTERNAL_ISSUER || keycloakIssuer,
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
})();
