// Intentionally not secret — shown to users on the Help page as a stand-in
// login until a real Keycloak realm is configured. Not gated behind
// NODE_ENV since it also needs to work in the Docker production build used
// for local testing. Remove the "demo" provider in lib/auth.ts (and this
// file) before deploying anywhere reachable beyond your own machine.
export const DEMO_LOGIN = {
  email: "demo@funlearning.app",
  password: "funlearning123",
};
