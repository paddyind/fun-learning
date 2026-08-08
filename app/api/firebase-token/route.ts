import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customToken = await getAdminAuth().createCustomToken(session.user.id);

  return NextResponse.json({ token: customToken });
}
