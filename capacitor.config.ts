import type { CapacitorConfig } from "@capacitor/cli";

// Fun Learning is a server-rendered Next.js app (API routes, middleware,
// NextAuth sessions) — it can't be exported as static files the way a
// typical Capacitor app is. Instead the native shell points its WebView at
// a real deployed instance of the app (thin-wrapper mode), configured via
// CAPACITOR_SERVER_URL. This is what the original spec meant by
// "structured for future Capacitor mobile compilation": the code is kept
// clean of anything that would block this (no server-only logic leaking
// into shared UI), not that a static bundle is produced.
//
// Local default points at the Dockerized dev server; override with a real
// HTTPS URL before building for a device/store release.
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? "http://localhost:3000";

const config: CapacitorConfig = {
  appId: "app.funlearning.mobile",
  appName: "Fun Learning",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
};

export default config;
