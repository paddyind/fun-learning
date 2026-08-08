import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateQuizQuestions } from "@/lib/gemini";
import type { Grade } from "@/lib/db";

interface GenerateQuizBody {
  subject_id: string;
  profile_id: string;
  material_id?: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<GenerateQuizBody>;
  const { subject_id, profile_id, material_id } = body;
  if (!subject_id || !profile_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminDb = getAdminDb();
  const profileSnap = await adminDb.collection("profiles").doc(profile_id).get();
  if (!profileSnap.exists || profileSnap.data()?.parent_user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const grade = profileSnap.data()?.grade as Grade;

  const subjectSnap = await adminDb.collection("subjects").doc(subject_id).get();
  const subjectName = (subjectSnap.data()?.name as string) ?? "General";

  let studyContent: string | undefined;
  if (material_id) {
    const materialSnap = await adminDb.collection("study_materials").doc(material_id).get();
    if (materialSnap.exists && materialSnap.data()?.profile_id === profile_id) {
      studyContent = materialSnap.data()?.extracted_text as string;
    }
  } else {
    const recentSnap = await adminDb
      .collection("study_materials")
      .where("profile_id", "==", profile_id)
      .where("subject_id", "==", subject_id)
      .orderBy("created_at", "desc")
      .limit(1)
      .get();
    if (!recentSnap.empty) {
      studyContent = recentSnap.docs[0].data().extracted_text as string;
    }
  }

  const questions = await generateQuizQuestions({ grade, subjectName, studyContent });

  return NextResponse.json({ questions });
}
