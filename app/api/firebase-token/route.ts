import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customToken = await getAdminAuth().createCustomToken(session.user.id);
    return NextResponse.json({ token: customToken });
  } catch (err) {
    // Almost always a placeholder/invalid FIREBASE_ADMIN_PRIVATE_KEY — log
    // the real cause server-side, but keep the client-facing message
    // pointed at the actual fix rather than leaking key material.
    console.error("Failed to mint Firebase custom token:", err);
    return NextResponse.json(
      {
        error:
          "Couldn't create a Firebase sign-in token. FIREBASE_ADMIN_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY in .env.local are likely still placeholders — see docs/setup-guide.md §1d.",
      },
      { status: 500 }
    );
  }
}
