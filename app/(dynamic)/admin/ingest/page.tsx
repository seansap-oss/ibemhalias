"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Youtube,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
  ListChecks,
  ClipboardCheck,
  ExternalLink,
  AlignLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api-base";

interface QuizQ {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface NotesData {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: Array<{ heading: string; content: string }>;
  upscRelevance: string;
  probableQuestions: string[];
}

interface IngestResult {
  success: boolean;
  title?: string;
  wordCount?: number;
  segmentCount?: number;
  transcript?: string;
  vtt?: string;
  notes?: NotesData;
  quiz?: { title: string; sourceSummary: string; questions: QuizQ[] };
  servedBy?: string;
  degraded?: boolean;
  error?: string;
  detail?: string;
}

export default function AdminIngestPage() {
  const [url, setUrl] = React.useState("");
  const [quizCount, setQuizCount] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<IngestResult | null>(null);

  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pdfTopic, setPdfTopic] = React.useState("");
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const [pdfResult, setPdfResult] = React.useState<IngestResult | null>(null);

  const [rawText, setRawText] = React.useState("");
  const [textTopic, setTextTopic] = React.useState("");
  const [textLoading, setTextLoading] = React.useState(false);
  const [textResult, setTextResult] = React.useState<IngestResult | null>(null);

  const ingestYoutube = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiFetch("/api/ai/youtube", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, generateQuiz: true, quizCount }),
      });
      setResult(await res.json());
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const ingestPdf = async () => {
    if (!pdfFile) return;
    setPdfLoading(true);
    setPdfResult(null);
    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("count", String(quizCount));
      if (pdfTopic.trim()) form.append("topic", pdfTopic.trim());
      const res = await apiFetch("/api/ai/quiz", { method: "POST", body: form });
      const json = await res.json();
      setPdfResult({ ...json, quiz: json.quiz });
    } catch {
      setPdfResult({ success: false, error: "Network error" });
    } finally {
      setPdfLoading(false);
    }
  };

  const ingestText = async () => {
    if (!rawText.trim()) return;
    setTextLoading(true);
    setTextResult(null);
    try {
      const res = await apiFetch("/api/ai/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceText: rawText,
          topic: textTopic.trim() || "General Studies",
          count: quizCount,
        }),
      });
      const json = await res.json();
      setTextResult({ ...json, quiz: json.quiz });
    } catch {
      setTextResult({ success: false, error: "Network error" });
    } finally {
      setTextLoading(false);
    }
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Online Exam Maker &amp; Content Ingestion</h1>
        <p className="text-muted-foreground">
          Upload a PDF, paste MCQs/notes, or ingest a YouTube lecture — then publish directly to the Online Exam Conductor.
        </p>
      </div>

      <Tabs defaultValue="pdf">
        <TabsList>
          <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-2" />PDF Exam Maker</TabsTrigger>
          <TabsTrigger value="text"><AlignLeft className="h-4 w-4 mr-2" />Paste Text / MCQs</TabsTrigger>
          <TabsTrigger value="youtube"><Youtube className="h-4 w-4 mr-2" />YouTube Lecture</TabsTrigger>
        </TabsList>

        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">YouTube Lecture Ingestion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="space-y-2 max-w-[180px]">
                <Label>MCQs to generate</Label>
                <Input type="number" min={5} max={20} value={quizCount} onChange={(e) => setQuizCount(Number(e.target.value))} />
              </div>
              <Button onClick={ingestYoutube} disabled={!url.trim() || loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pulling transcript & generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Ingest & Generate Module</>}
              </Button>

              {result && <ResultPanel result={result} onDownload={download} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF to Online Exam (Digital &amp; Scanned PDFs)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Exam / Subject Topic (optional)</Label>
                  <Input
                    value={pdfTopic}
                    onChange={(e) => setPdfTopic(e.target.value)}
                    placeholder="e.g., Indian Polity — Fundamental Rights"
                  />
                </div>
                <div className="space-y-2 max-w-[200px]">
                  <Label>MCQs to generate</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={quizCount}
                    onChange={(e) => setQuizCount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">{pdfFile ? pdfFile.name : "Click to upload a PDF"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports standard PDFs (via PDF.js) and scanned/image PDFs (via Gemini OCR).
                  </p>
                </label>
              </div>
              <Button onClick={ingestPdf} disabled={!pdfFile || pdfLoading}>
                {pdfLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading PDF &amp; generating MCQs...</> : <><ListChecks className="mr-2 h-4 w-4" />Generate MCQs from PDF</>}
              </Button>

              {pdfResult && <ResultPanel result={pdfResult} onDownload={download} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paste Notes or Existing MCQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject / Topic</Label>
                  <Input
                    value={textTopic}
                    onChange={(e) => setTextTopic(e.target.value)}
                    placeholder="e.g., Modern History / SSC Quant"
                  />
                </div>
                <div className="space-y-2 max-w-[200px]">
                  <Label>MCQs to generate</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={quizCount}
                    onChange={(e) => setQuizCount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Study Notes or Raw MCQ Text</Label>
                <textarea
                  rows={7}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lecture notes, current affairs, or raw MCQ questions here..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <Button onClick={ingestText} disabled={!rawText.trim() || textLoading}>
                {textLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating MCQs...</> : <><ListChecks className="mr-2 h-4 w-4" />Generate MCQs from Text</>}
              </Button>

              {textResult && <ResultPanel result={textResult} onDownload={download} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultPanel({
  result,
  onDownload,
}: {
  result: IngestResult;
  onDownload: (c: string, f: string) => void;
}) {
  if (!result.success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">{result.error}</p>
            {result.detail && <p className="text-xs text-muted-foreground mt-1">{result.detail}</p>}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Ingested</Badge>
        {result.wordCount && <Badge variant="outline">{result.wordCount.toLocaleString()} words</Badge>}
        {result.segmentCount && <Badge variant="outline">{result.segmentCount} caption cues</Badge>}
        {result.servedBy && <Badge variant="secondary">{result.servedBy}</Badge>}
        {result.degraded && <Badge variant="warning">Offline engine</Badge>}
      </div>

      {result.title && <p className="font-semibold">{result.title}</p>}

      <div className="flex gap-2 flex-wrap">
        {result.transcript && (
          <Button size="sm" variant="outline" onClick={() => onDownload(result.transcript!, "transcript.txt")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Transcript
          </Button>
        )}
        {result.vtt && (
          <Button size="sm" variant="outline" onClick={() => onDownload(result.vtt!, "captions.vtt")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />WebVTT
          </Button>
        )}
        {result.notes && (
          <Button size="sm" variant="outline" onClick={() => onDownload(JSON.stringify(result.notes, null, 2), "notes.json")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Notes JSON
          </Button>
        )}
        {result.quiz && (
          <Button size="sm" variant="outline" onClick={() => onDownload(JSON.stringify(result.quiz, null, 2), "quiz.json")}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Quiz JSON
          </Button>
        )}
      </div>

      {result.notes && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Generated Study Notes</p>
            <p className="text-xs text-muted-foreground">{result.notes.summary}</p>
            <div>
              <p className="text-xs font-medium mb-1">Key Points</p>
              <ul className="space-y-1">
                {result.notes.keyPoints?.slice(0, 6).map((k, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {k}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2.5">
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">UPSC Relevance</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{result.notes.upscRelevance}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result.quiz && (
        <>
          <PublishExamBox quiz={result.quiz} />
          <Card className="bg-muted/30">
            <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <p className="text-sm font-semibold">{result.quiz.title}</p>
              {result.quiz.questions?.map((q) => (
                <div key={q.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-medium whitespace-pre-wrap">Q{q.id}. {q.question}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{q.difficulty}</Badge>
                  </div>
                  <ul className="space-y-1 mb-2">
                    {q.options.map((o, oi) => (
                      <li
                        key={oi}
                        className={`text-[11px] px-2 py-1 rounded ${
                          oi === q.correctIndex
                            ? "bg-green-500/15 text-green-700 dark:text-green-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(97 + oi)}) {o}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground border-t pt-2">{q.explanation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}

function PublishExamBox({
  quiz,
}: {
  quiz: { title: string; sourceSummary: string; questions: QuizQ[] };
}) {
  const [examTitle, setExamTitle] = React.useState(quiz.title || "AI Online Exam");
  const [examCategory, setExamCategory] = React.useState("UPSC");
  const [durationMinutes, setDurationMinutes] = React.useState(
    Math.max(10, (quiz.questions?.length || 10) * 2)
  );
  const [negativeMarking, setNegativeMarking] = React.useState(0.33);
  const [publishNow, setPublishNow] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [createdTest, setCreatedTest] = React.useState<{
    id: string;
    title: string;
    status: string;
  } | null>(null);

  const publishExam = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await apiFetch("/api/admin/mock-tests/from-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: examTitle,
          exam_category: examCategory,
          subject: quiz.questions?.[0]?.topic || "General Studies",
          duration_minutes: durationMinutes,
          negative_marking: negativeMarking,
          publishImmediately: publishNow,
          questions: quiz.questions,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.test?.id) {
        throw new Error(json.error || "Unable to publish exam");
      }
      setCreatedTest(json.test);
    } catch (err: any) {
      setSaveError(err?.message || "Unable to publish exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-[#14256f]">
          <ClipboardCheck className="h-4 w-4" />
          Publish to Online Exam Conductor ({quiz.questions?.length || 0} Questions)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Exam Title</Label>
            <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input value={examCategory} onChange={(e) => setExamCategory(e.target.value)} placeholder="UPSC / SSC" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration (mins)</Label>
            <Input
              type="number"
              min={5}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="rounded border-slate-300"
              />
              Publish immediately for students
            </label>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Negative:</span>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={2}
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
                className="h-7 w-20 text-xs"
              />
            </div>
          </div>

          <Button onClick={publishExam} disabled={saving || !quiz.questions?.length} size="sm">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 h-3.5 w-3.5" />
                Save &amp; Publish Exam
              </>
            )}
          </Button>
        </div>

        {saveError && (
          <p className="text-xs font-medium text-destructive">{saveError}</p>
        )}

        {createdTest && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <span className="font-semibold text-emerald-900">
              Saved &ldquo;{createdTest.title}&rdquo; ({createdTest.status}).
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/mock-test/tests/${createdTest.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 font-semibold text-[#14256f] border border-slate-200 hover:bg-slate-50"
              >
                Edit in Exam Builder <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href={`/mock-test/${createdTest.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-[#14256f] px-2.5 py-1.5 font-semibold text-white hover:bg-[#1d348f]"
              >
                Open Exam Runner <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
