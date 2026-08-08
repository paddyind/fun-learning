import "server-only";
import type { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import CredentialsProvider from "next-auth/providers/credentials";
import { serverEnv } from "@/lib/server-env";
import { DEMO_LOGIN } from "@/lib/demoLogin";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: serverEnv.keycloak.clientId,
      clientSecret: serverEnv.keycloak.clientSecret,
      issuer: serverEnv.keycloak.issuer,
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
