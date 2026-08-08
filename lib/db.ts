import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Grade = "Grade 3 CBSE" | "Grade 6 IGCSE";
export type SubjectName = "Math" | "Science" | "English" | "Social Studies";

export interface Profile {
  id: string;
  name: string;
  grade: Grade;
  xp_points: number;
  streak_days: number;
  parent_user_id: string;
  created_at: Timestamp;
}

export interface Subject {
  id: string;
  profile_id: string;
  name: SubjectName;
  icon: string;
}

export interface StudyMaterial {
  id: string;
  subject_id: string;
  profile_id: string;
  title: string;
  volume_tag: string;
  image_url: string;
  extracted_text: string;
  created_at: Timestamp;
}

export interface QuizResult {
  id: string;
  profile_id: string;
  subject_id: string;
  topic: string;
  score: number;
  total_questions: number;
  weak_concepts: string[];
  created_at: Timestamp;
}

// ---------- profiles ----------

export async function createProfile(input: {
  name: string;
  grade: Grade;
  parent_user_id: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "profiles"), {
    name: input.name,
    grade: input.grade,
    xp_points: 0,
    streak_days: 0,
    parent_user_id: input.parent_user_id,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "profiles", profileId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null;
}

export async function listProfiles(parentUserId: string): Promise<Profile[]> {
  const q = query(collection(db, "profiles"), where("parent_user_id", "==", parentUserId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile);
}

export async function addProfileXp(profileId: string, xpDelta: number): Promise<void> {
  await updateDoc(doc(db, "profiles", profileId), {
    xp_points: increment(xpDelta),
  });
}

export async function setProfileStreak(profileId: string, streakDays: number): Promise<void> {
  await updateDoc(doc(db, "profiles", profileId), {
    streak_days: streakDays,
  });
}

// ---------- subjects ----------

export async function createSubject(input: {
  profile_id: string;
  name: SubjectName;
  icon: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "subjects"), input);
  return ref.id;
}

export async function listSubjects(profileId: string): Promise<Subject[]> {
  const q = query(collection(db, "subjects"), where("profile_id", "==", profileId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject);
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await deleteDoc(doc(db, "subjects", subjectId));
}

export const DEFAULT_SUBJECTS: { name: SubjectName; icon: string }[] = [
  { name: "Math", icon: "Calculator" },
  { name: "Science", icon: "FlaskConical" },
  { name: "English", icon: "BookOpen" },
  { name: "Social Studies", icon: "Globe2" },
];

export async function seedDefaultSubjects(profileId: string): Promise<void> {
  await Promise.all(
    DEFAULT_SUBJECTS.map((subject) => createSubject({ profile_id: profileId, ...subject }))
  );
}

// ---------- study_materials ----------

export async function createStudyMaterial(input: {
  subject_id: string;
  profile_id: string;
  title: string;
  volume_tag: string;
  image_url: string;
  extracted_text: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "study_materials"), {
    ...input,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getStudyMaterial(materialId: string): Promise<StudyMaterial | null> {
  const snap = await getDoc(doc(db, "study_materials", materialId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as StudyMaterial) : null;
}

export async function listStudyMaterials(profileId: string, subjectId?: string): Promise<StudyMaterial[]> {
  const constraints = subjectId
    ? [where("profile_id", "==", profileId), where("subject_id", "==", subjectId)]
    : [where("profile_id", "==", profileId)];
  const q = query(collection(db, "study_materials"), ...constraints, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyMaterial);
}

// ---------- quiz_results ----------

export async function createQuizResult(input: {
  profile_id: string;
  subject_id: string;
  topic: string;
  score: number;
  total_questions: number;
  weak_concepts: string[];
}): Promise<string> {
  const ref = await addDoc(collection(db, "quiz_results"), {
    ...input,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function listQuizResults(profileId: string, subjectId?: string): Promise<QuizResult[]> {
  const constraints = subjectId
    ? [where("profile_id", "==", profileId), where("subject_id", "==", subjectId)]
    : [where("profile_id", "==", profileId)];
  const q = query(collection(db, "quiz_results"), ...constraints, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizResult);
}
