import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateFlashcards } from "@/lib/gemini";
import type { Grade } from "@/lib/db";

interface GenerateFlashcardsBody {
  profile_id: string;
  subject_name: string;
  concepts: string[];
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<GenerateFlashcardsBody>;
  const { profile_id, subject_name, concepts } = body;
  if (!profile_id || !concepts || concepts.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminDb = getAdminDb();
  const profileSnap = await adminDb.collection("profiles").doc(profile_id).get();
  if (!profileSnap.exists || profileSnap.data()?.parent_user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const grade = profileSnap.data()?.grade as Grade;

  const flashcards = await generateFlashcards({ grade, subjectName: subject_name ?? "General", concepts });

  return NextResponse.json({ flashcards });
}
