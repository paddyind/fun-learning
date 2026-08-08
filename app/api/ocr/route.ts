import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { extractStudyMaterial } from "@/lib/gemini";
import type { Grade } from "@/lib/db";

interface OcrRequestBody {
  subject_id: string;
  profile_id: string;
  title: string;
  volume_tag: string;
  imageUrl: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<OcrRequestBody>;
  const { subject_id, profile_id, title, volume_tag, imageUrl } = body;
  if (!subject_id || !profile_id || !title || !volume_tag || !imageUrl) {
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

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    return NextResponse.json({ error: "Could not fetch uploaded image" }, { status: 502 });
  }
  const mimeType = imageRes.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await imageRes.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");

  const extractedText = await extractStudyMaterial({ base64Image, mimeType, grade, subjectName });

  const docRef = await adminDb.collection("study_materials").add({
    subject_id,
    profile_id,
    title,
    volume_tag,
    image_url: imageUrl,
    extracted_text: extractedText,
    created_at: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ study_material_id: docRef.id, extracted_text: extractedText });
}
