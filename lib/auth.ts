import "server-only";
import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import CredentialsProvider from "next-auth/providers/credentials";
import { serverEnv } from "@/lib/server-env";
import { DEMO_LOGIN } from "@/lib/demoLogin";

// Keycloak is owned by the sibling identity-platform repo, not this app —
// see docs/setup-guide.md §3 and identity-platform's docs/ONBOARDING.md.
// The browser reaches it via KEYCLOAK_ISSUER (public, e.g.
// http://localhost:3510/realms/fun-learning); this app's own server needs
// a DIFFERENT URL for the same Keycloak (KEYCLOAK_INTERNAL_ISSUER —
// http://host.docker.internal:3510/... when Dockerized, since `localhost`
// inside that container means the container itself).
//
// KeycloakProvider defaults to a single well-known-discovery URL derived
// from `issuer`, which would make the SERVER-side discovery fetch target
// the public (browser-only-reachable) host and fail inside Docker.
// Disabling `wellKnown` and setting the four endpoints explicitly routes
// each one to whichever host can actually reach it, while `issuer` stays
// pinned to the public URL for `iss` claim validation (Keycloak always
// stamps tokens with the public issuer, regardless of which URL a request
// used to reach it — see identity-platform's KC_HOSTNAME config).
const KEYCLOAK_PUBLIC_ISSUER = serverEnv.keycloak.issuer;
const KEYCLOAK_INTERNAL_ISSUER = serverEnv.keycloak.internalIssuer;

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: serverEnv.keycloak.clientId,
      clientSecret: serverEnv.keycloak.clientSecret,
      issuer: KEYCLOAK_PUBLIC_ISSUER,
      wellKnown: undefined,
      authorization: `${KEYCLOAK_PUBLIC_ISSUER}/protocol/openid-connect/auth`,
      token: `${KEYCLOAK_INTERNAL_ISSUER}/protocol/openid-connect/token`,
      userinfo: `${KEYCLOAK_INTERNAL_ISSUER}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${KEYCLOAK_INTERNAL_ISSUER}/protocol/openid-connect/certs`,
    }),
    CredentialsProvider({
      id: "demo",
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.email === DEMO_LOGIN.email && credentials?.password === DEMO_LOGIN.password) {
          return { id: "dev-parent-demo", name: "Demo Parent", email: DEMO_LOGIN.email };
        }
        return null;
      },
    }),
  ],
  secret: serverEnv.nextAuth.secret,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = (profile as { sub?: string }).sub ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
