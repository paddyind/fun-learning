"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { UploadCloud, Loader2, CheckCircle2, ImagePlus } from "lucide-react";
import { storage } from "@/lib/firebase";
import { compressImage } from "@/lib/image";
import { useActiveProfile } from "@/lib/useActiveProfile";
import { listSubjects, type Subject } from "@/lib/db";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Stage = "idle" | "compressing" | "uploading" | "extracting" | "done" | "error";

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadPageInner />
    </Suspense>
  );
}

function UploadPageInner() {
  const { activeProfile } = useActiveProfile();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(searchParams.get("subject") ?? "");
  const [title, setTitle] = useState("");
  const [volumeTag, setVolumeTag] = useState("Term 1 Vol 1");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeProfile) return;
    listSubjects(activeProfile.id)
      .then((list) => {
        setSubjects(list);
        if (!subjectId && list.length > 0) setSubjectId(list[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your subjects."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  const handleFile = (f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStage("idle");
    setError(null);
    setExtractedText(null);
  };

  const handleSubmit = async () => {
    if (!activeProfile || !file || !subjectId || !title.trim()) return;
    setError(null);
    try {
      setStage("compressing");
      const compressed = await compressImage(file);

      setStage("uploading");
      const fileId = crypto.randomUUID();
      const storageRef = ref(storage, `book_pages/${activeProfile.id}/${fileId}.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      const imageUrl = await getDownloadURL(storageRef);

      setStage("extracting");
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId,
          profile_id: activeProfile.id,
          title: title.trim(),
          volume_tag: volumeTag.trim(),
          imageUrl,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Extraction failed");
      const data = await res.json();

      setExtractedText(data.extracted_text);
      setMaterialId(data.study_material_id);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  };

  const busy = stage === "compressing" || stage === "uploading" || stage === "extracting";

  return (
    <main className="mx-auto max-w-xl">
      <h1 className="font-heading text-2xl font-bold text-foreground">Upload Notes</h1>
      <p className="mt-1 text-muted">Snap a photo of your textbook or notes and we&apos;ll turn it into study material!</p>

      <Card className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-muted">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-background px-4 text-lg text-foreground focus:border-brand focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-muted">Chapter title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fractions and Decimals"
            className="mt-1 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-background px-4 text-lg text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-muted">Volume / term tag</label>
          <input
            value={volumeTag}
            onChange={(e) => setVolumeTag(e.target.value)}
            placeholder="e.g. Term 1 Vol 1"
            className="mt-1 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-background px-4 text-lg text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-muted">Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="mt-1 flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-muted transition hover:border-brand hover:text-brand"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="max-h-40 rounded-xl object-contain" />
            ) : (
              <>
                <ImagePlus size={32} />
                <span className="text-sm font-semibold">Tap to take a photo or drag one here</span>
              </>
            )}
          </button>
        </div>

        {error && <p className="text-sm font-semibold text-red-500 dark:text-red-400">{error}</p>}

        <Button
          className="flex w-full items-center justify-center gap-2"
          disabled={!file || !subjectId || !title.trim() || busy}
          onClick={handleSubmit}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {stage === "compressing" && "Getting your photo ready..."}
              {stage === "uploading" && "Uploading..."}
              {stage === "extracting" && "Reading your notes..."}
            </>
          ) : (
            <>
              <UploadCloud size={20} /> Upload & extract
            </>
          )}
        </Button>
      </Card>

      {stage === "done" && extractedText && (
        <Card className="mt-6">
          <div className="flex items-center gap-2 text-xp">
            <CheckCircle2 size={22} />
            <h2 className="font-heading text-lg font-bold text-foreground">Notes saved!</h2>
          </div>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-muted p-4 text-sm text-foreground ring-1 ring-line">
            {extractedText}
          </pre>
          <Button
            className="mt-4 w-full"
            onClick={() => router.push(`/dashboard/quiz?subject=${subjectId}&material=${materialId}`)}
          >
            Take a challenge on this! 🎯
          </Button>
        </Card>
      )}
    </main>
  );
}
