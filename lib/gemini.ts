import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { serverEnv } from "@/lib/server-env";
import type { Grade } from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: serverEnv.gemini.apiKey });

export interface QuizQuestion {
  question: string;
  type: "mcq" | "short_answer";
  options: string[];
  correctAnswer: string;
  acceptableKeywords: string[];
  explanation: string;
  topic: string;
}

const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["mcq", "short_answer"] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          acceptableKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
        },
        required: ["question", "type", "options", "correctAnswer", "acceptableKeywords", "explanation", "topic"],
      },
    },
  },
  required: ["questions"],
};

export async function extractStudyMaterial(input: {
  base64Image: string;
  mimeType: string;
  grade: Grade;
  subjectName: string;
}): Promise<string> {
  const response = await ai.models.generateContent({
    model: serverEnv.gemini.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: input.base64Image, mimeType: input.mimeType } },
          {
            text: `You are helping extract study content from a photo of a ${input.subjectName} textbook/workbook page for a ${input.grade} student.
Transcribe the page into clean, well-structured markdown:
- Correct the text (fix obvious OCR/handwriting artifacts) but keep the original meaning.
- Use headings for topics, bullet lists for key concepts, and a "**Formulas**" section if any formulas are present.
- Add a short "**Vocabulary**" section defining any important terms.
Keep it concise and focused on what a student would need to revise from this page. Return only the markdown, no commentary.`,
          },
        ],
      },
    ],
  });

  return response.text ?? "";
}

export async function generateQuizQuestions(input: {
  grade: Grade;
  subjectName: string;
  studyContent?: string;
}): Promise<QuizQuestion[]> {
  const gradeInstructions =
    input.grade === "Grade 3 CBSE"
      ? `Write for an 8-year-old CBSE Grade 3 student. Use very simple words and short sentences. All 5 questions must be type "mcq" with exactly 4 fun, clear options. Keep tone playful and encouraging.`
      : `Write for an 11-year-old IGCSE Grade 6 student. Favor conceptual reasoning and short scenario-based questions. Use a mix of "mcq" (4 options, can be scenario-based) and "short_answer" (provide 2-4 acceptableKeywords for lenient grading) question types across the 5 questions. Tone should be matter-of-fact and encourage deeper thinking.`;

  const contentBlock = input.studyContent
    ? `Base the questions on this study material:\n\n${input.studyContent.slice(0, 8000)}`
    : `No specific study material was provided — write general ${input.subjectName} questions appropriate for this grade and curriculum.`;

  const response = await ai.models.generateContent({
    model: serverEnv.gemini.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate exactly 5 ${input.subjectName} quiz questions.
${gradeInstructions}
${contentBlock}

For every question, also include:
- "correctAnswer": the exact correct option text (for mcq) or the ideal short answer (for short_answer).
- "explanation": a short, encouraging explanation of why the answer is correct, written for this grade level.
- "topic": a short 2-4 word topic label used later for tracking strong/weak topics (e.g. "Fractions", "Photosynthesis").
For "mcq" questions, "options" must have exactly 4 entries including the correct one, in random order.
For "short_answer" questions, "options" must be an empty array.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: QUIZ_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as { questions?: QuizQuestion[] };
  return parsed.questions ?? [];
}

export interface Flashcard {
  front: string;
  back: string;
}

const FLASHCARD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING },
        },
        required: ["front", "back"],
      },
    },
  },
  required: ["flashcards"],
};

export async function generateFlashcards(input: {
  grade: Grade;
  subjectName: string;
  concepts: string[];
}): Promise<Flashcard[]> {
  if (input.concepts.length === 0) return [];

  const response = await ai.models.generateContent({
    model: serverEnv.gemini.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Create quick revision flashcards for a ${input.grade} student studying ${input.subjectName}.
Make one flashcard for each of these topics they've struggled with: ${input.concepts.join(", ")}.
Each flashcard "front" should be a short question or prompt about the topic, and "back" should be a short,
encouraging, easy-to-understand explanation or answer (2-3 sentences max) appropriate for this grade level.
Keep it snappy — this is a 5-minute revision session.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: FLASHCARD_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? "{}") as { flashcards?: Flashcard[] };
  return parsed.flashcards ?? [];
}
