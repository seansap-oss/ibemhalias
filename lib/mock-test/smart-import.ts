import { inflateRawSync } from "zlib";
import { extractPdfText } from "@/lib/ai/pdf";
import { extractJson, runWithFallback } from "@/lib/ai/router";

export type DraftOption = {
  option_key: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
};

export type DraftQuestion = {
  temp_id: string;
  selected: boolean;
  question_type: string;
  question_text: string;
  paragraph_text?: string | null;
  explanation?: string | null;
  exam?: string | null;
  subject?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  marks: number;
  negative_marks: number;
  source?: string | null;
  source_pdf?: string | null;
  source_page?: number | null;
  verification_status: "verified" | "needs_verification";
  answer_text?: string | null;
  answer_numeric?: number | null;
  answer_tolerance?: number;
  options: DraftOption[];
};

export type SmartImportSettings = {
  mode: "existing" | "generate";
  count: number;
  questionType: string;
  difficulty: string;
  optionCount: number;
  marks: number;
  negativeMarks: number;
  language: string;
  exam?: string;
  subject?: string;
  topic?: string;
};

function tempId(index: number) {
  return `draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeXmlEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)));
}

function locateZipEntry(buffer: Buffer, target: string): Buffer | null {
  const EOCD = 0x06054b50;
  const CDFH = 0x02014b50;
  const LFH = 0x04034b50;

  let eocd = -1;
  const start = Math.max(0, buffer.length - 65557);
  for (let i = buffer.length - 22; i >= start; i--) {
    if (buffer.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < totalEntries && offset + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(offset) !== CDFH) break;

    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    if (name === target) {
      if (buffer.readUInt32LE(localHeaderOffset) !== LFH) return null;
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compression === 0) return Buffer.from(compressed);
      if (compression === 8) return inflateRawSync(compressed);
      return null;
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

export function extractDocxText(buffer: ArrayBuffer) {
  const bytes = Buffer.from(buffer);
  const xmlBytes = locateZipEntry(bytes, "word/document.xml");
  if (!xmlBytes) throw new Error("This DOCX could not be read. Please save it again as a standard .docx file.");

  const xml = xmlBytes.toString("utf8")
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n");

  const parts: string[] = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) parts.push(decodeXmlEntities(m[1]));

  const text = parts.join(" ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) throw new Error("The DOCX opened successfully but no readable text was found.");
  return text;
}

export async function extractUploadedText(file: File) {
  const lower = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return { text: new TextDecoder("utf-8").decode(buffer), pages: null as number | null, kind: "text" };
  }

  if (lower.endsWith(".docx")) {
    return { text: extractDocxText(buffer), pages: null as number | null, kind: "docx" };
  }

  if (lower.endsWith(".pdf")) {
    const pdf = extractPdfText(buffer);
    if (!pdf.text.trim()) {
      throw new Error("No readable text was found in this PDF. It may be scanned/image-only and require OCR.");
    }
    return { text: pdf.text, pages: pdf.pages, kind: "pdf" };
  }

  if (lower.endsWith(".csv")) {
    return { text: new TextDecoder("utf-8").decode(buffer), pages: null as number | null, kind: "csv" };
  }

  throw new Error("Unsupported file. Use PDF, DOCX, TXT, MD, or CSV.");
}

function cleanLine(line: string) {
  return line.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function splitAnswerKeys(value: string) {
  return value
    .toUpperCase()
    .split(/[,\s;|/&]+/)
    .map(v => v.replace(/[^A-H]/g, ""))
    .filter(Boolean);
}

function qStart(line: string) {
  return line.match(/^(?:q(?:uestion)?\s*)?(\d{1,4})\s*[\.\):\-]\s*(.+)$/i);
}

function optionStart(line: string) {
  return line.match(/^\(?([A-H])\)?\s*[\.\):\-]\s*(.+)$/i);
}

function answerLine(line: string) {
  const m = line.match(/^(?:correct\s*)?(?:answer|ans(?:wer)?)\s*[:\-]\s*(.+)$/i);
  return m ? splitAnswerKeys(m[1]) : [];
}

function normalizeCompressedQuestionText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/(?:🔑\s*)?answer\s*key/gi, "\nAnswer Key ")
    .replace(/(?<!\d)(\d{1,4})\.\s*(?=[A-Z])/g, "\n$1. ")
    .replace(/([A-H])\)\s*/g, "\n$1) ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseGlobalAnswerKey(text: string) {
  const key = new Map<number, string[]>();
  const marker = text.match(/(?:🔑\s*)?answer\s*key\s*([A-H])?/i);
  if (!marker || marker.index == null) return key;

  if (marker[1]) key.set(1, [marker[1].toUpperCase()]);

  const tail = text.slice(marker.index + marker[0].length);
  for (const match of tail.matchAll(/(?:^|[|,;\s])(\d{1,4})\s*[\.\):\-]?\s*([A-H])(?=$|[|,;\s])/gi)) {
    key.set(Number(match[1]), [match[2].toUpperCase()]);
  }
  return key;
}

export function parseExistingQuestions(
  text: string,
  filename: string,
  defaults: Pick<SmartImportSettings, "marks" | "negativeMarks" | "difficulty" | "exam" | "subject" | "topic">
): DraftQuestion[] {
  const normalizedText = normalizeCompressedQuestionText(text);
  const globalAnswerKey = parseGlobalAnswerKey(text);
  const lines = normalizedText.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const output: DraftQuestion[] = [];
  let current: any = null;
  let currentOption: { key: string; text: string } | null = null;

  const flushOption = () => {
    if (!current || !currentOption) return;
    current.options.push({
      option_key: currentOption.key,
      option_text: currentOption.text.trim(),
      is_correct: false,
      sort_order: current.options.length + 1,
    });
    currentOption = null;
  };

  const flushQuestion = () => {
    flushOption();
    if (!current) return;

    if (current.answers.length === 0 && globalAnswerKey.has(current.number)) {
      current.answers = globalAnswerKey.get(current.number) ?? [];
    }

    for (const opt of current.options) {
      opt.is_correct = current.answers.includes(opt.option_key);
    }

    if (current.question_text.trim()) {
      const explicitAnswer =
        current.answers.length > 0 &&
        (current.options.some((x: any) => x.is_correct) ||
          current.answer_text ||
          current.answer_numeric != null);

      output.push({
        temp_id: tempId(output.length),
        selected: true,
        question_type:
          current.question_type ||
          (current.answers.length > 1 ? "mcq_multiple" : current.options.length ? "mcq_single" : "fill_blank"),
        question_text: current.question_text.trim(),
        paragraph_text: current.paragraph_text || null,
        explanation: current.explanation || null,
        exam: defaults.exam || null,
        subject: defaults.subject || null,
        topic: defaults.topic || null,
        difficulty: defaults.difficulty || "medium",
        marks: defaults.marks || 1,
        negative_marks: defaults.negativeMarks || 0,
        source: "Existing questions import",
        source_pdf: filename || null,
        source_page: null,
        verification_status: explicitAnswer ? "verified" : "needs_verification",
        answer_text: current.answer_text || null,
        answer_numeric: current.answer_numeric ?? null,
        answer_tolerance: 0,
        options: current.options,
      });
    }

    current = null;
  };

  for (const line of lines) {
    if (/^answer\s*key\b/i.test(line)) {
      flushQuestion();
      break;
    }

    const qs = qStart(line);
    if (qs) {
      flushQuestion();
      current = {
        number: Number(qs[1]),
        question_text: qs[2],
        options: [],
        answers: [],
        explanation: "",
        answer_text: "",
        answer_numeric: null,
      };
      continue;
    }

    if (!current) continue;

    const os = optionStart(line);
    if (os) {
      flushOption();
      currentOption = { key: os[1].toUpperCase(), text: os[2] };
      continue;
    }

    const keys = answerLine(line);
    if (keys.length) {
      flushOption();
      current.answers = keys;
      continue;
    }

    const textAnswer = line.match(/^(?:answer\s*text|accepted\s*answer)\s*[:\-]\s*(.+)$/i);
    if (textAnswer) {
      flushOption();
      current.answer_text = textAnswer[1].trim();
      current.question_type = "fill_blank";
      continue;
    }

    const numericAnswer = line.match(/^(?:numeric\s*answer|answer\s*numeric)\s*[:\-]\s*(-?\d+(?:\.\d+)?)$/i);
    if (numericAnswer) {
      flushOption();
      current.answer_numeric = Number(numericAnswer[1]);
      current.question_type = "numeric_answer";
      continue;
    }

    const explanation = line.match(/^(?:explanation|solution)\s*[:\-]\s*(.*)$/i);
    if (explanation) {
      flushOption();
      current.explanation = explanation[1];
      continue;
    }

    if (current.explanation) current.explanation += " " + line;
    else if (currentOption) currentOption.text += " " + line;
    else current.question_text += " " + line;
  }

  flushQuestion();
  return output;
}

type AiQuestion = {
  question_type?: string;
  question_text?: string;
  paragraph_text?: string | null;
  options?: Array<string | { option_key?: string; option_text?: string; is_correct?: boolean }>;
  correct_answers?: string[];
  correct_answer?: string | string[] | null;
  answer_text?: string | null;
  answer_numeric?: number | null;
  answer_tolerance?: number | null;
  explanation?: string | null;
  subject?: string | null;
  topic?: string | null;
  difficulty?: string | null;
};

function normalizeAiQuestions(
  raw: AiQuestion[],
  sourceName: string,
  settings: SmartImportSettings,
  forceNeedsVerification: boolean
): DraftQuestion[] {
  return raw
    .map((q, index) => {
      const type = String(q.question_type || settings.questionType || "mcq_single");
      const answerList = Array.isArray(q.correct_answers)
        ? q.correct_answers.map(x => String(x).toUpperCase())
        : Array.isArray(q.correct_answer)
          ? q.correct_answer.map(x => String(x).toUpperCase())
          : q.correct_answer
            ? splitAnswerKeys(String(q.correct_answer))
            : [];

      const rawOptions = Array.isArray(q.options) ? q.options : [];
      const options: DraftOption[] = rawOptions.map((item: any, i: number) => {
        const key = String(item?.option_key || String.fromCharCode(65 + i)).toUpperCase();
        const text = typeof item === "string" ? item : String(item?.option_text ?? "");
        const explicitCorrect = typeof item === "object" && typeof item?.is_correct === "boolean"
          ? Boolean(item.is_correct)
          : answerList.includes(key);

        return {
          option_key: key,
          option_text: text,
          is_correct: explicitCorrect,
          sort_order: i + 1,
        };
      }).filter(x => x.option_text.trim());

      const hasAnswer =
        options.some(x => x.is_correct) ||
        Boolean(String(q.answer_text ?? "").trim()) ||
        q.answer_numeric != null;

      return {
        temp_id: tempId(index),
        selected: true,
        question_type: type,
        question_text: String(q.question_text ?? "").trim(),
        paragraph_text: q.paragraph_text ? String(q.paragraph_text) : null,
        explanation: q.explanation ? String(q.explanation) : null,
        exam: settings.exam || null,
        subject: q.subject ? String(q.subject) : settings.subject || null,
        topic: q.topic ? String(q.topic) : settings.topic || null,
        difficulty: q.difficulty ? String(q.difficulty) : settings.difficulty,
        marks: settings.marks,
        negative_marks: settings.negativeMarks,
        source: settings.mode === "generate" ? "AI-generated draft from source material" : "AI-assisted existing question extraction",
        source_pdf: sourceName || null,
        source_page: null,
        verification_status: forceNeedsVerification || !hasAnswer ? "needs_verification" : "verified",
        answer_text: q.answer_text ? String(q.answer_text) : null,
        answer_numeric: q.answer_numeric == null ? null : Number(q.answer_numeric),
        answer_tolerance: Number(q.answer_tolerance || 0),
        options,
      } satisfies DraftQuestion;
    })
    .filter(q => q.question_text.length > 0);
}

async function aiJson<T>(system: string, user: string) {
  const result = await runWithFallback(system, user, { jsonMode: true });
  if (!result.text.trim()) {
    const trace = result.trace
      .map(x => `${x.provider}: ${x.status}${x.reason ? ` (${x.reason})` : ""}`)
      .join("; ");
    throw new Error(`No AI provider produced a response.${trace ? ` ${trace}` : ""}`);
  }

  const parsed = extractJson<T>(result.text);
  if (!parsed) throw new Error("The AI provider responded, but the returned quiz data was not valid JSON.");
  return { parsed, servedBy: result.servedBy, trace: result.trace };
}

export async function aiParseExistingQuestions(
  sourceText: string,
  sourceName: string,
  settings: SmartImportSettings
) {
  const system = [
    "You are a strict document parser for an Indian competitive-exam mock-test system.",
    "Extract ONLY questions that already exist in the supplied source.",
    "Do not invent, rewrite, improve, answer, or add questions.",
    "Preserve the source wording as closely as possible.",
    "If the source explicitly contains a correct answer, preserve it.",
    "If a correct answer is not explicit, return no correct answer.",
    "Return JSON only."
  ].join(" ");

  const user = JSON.stringify({
    task: "extract_existing_questions",
    output_schema: {
      questions: [{
        question_type: "mcq_single|mcq_multiple|true_false|statement_based|assertion_reason|match_following|fill_blank|numeric_answer|paragraph_based",
        question_text: "string",
        paragraph_text: "string|null",
        options: [{ option_key: "A", option_text: "string", is_correct: false }],
        correct_answers: ["A"],
        answer_text: "string|null",
        answer_numeric: "number|null",
        explanation: "string|null",
        subject: "string|null",
        topic: "string|null",
        difficulty: "easy|medium|hard"
      }]
    },
    source_text: sourceText.slice(0, 60000),
  });

  const { parsed, servedBy, trace } = await aiJson<{ questions?: AiQuestion[] } | AiQuestion[]>(system, user);
  const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
  return {
    questions: normalizeAiQuestions(arr, sourceName, settings, false),
    servedBy,
    trace
  };
}

export async function aiGenerateQuestions(
  sourceText: string,
  sourceName: string,
  settings: SmartImportSettings
) {
  const count = Math.max(1, Math.min(50, Number(settings.count || 10)));

  const system = [
    "You create DRAFT questions for the Ibemhal IAS competitive-exam mock-test system.",
    "Use ONLY facts and information explicitly supported by the supplied source material.",
    "Do not silently add outside knowledge.",
    "Every question must be answerable from the supplied source.",
    "Create plausible distractors that do not require outside facts to evaluate.",
    "Provide a concise explanation grounded in the source.",
    "The output is a draft for teacher verification, not automatically published.",
    "Return JSON only."
  ].join(" ");

  const user = JSON.stringify({
    task: "generate_mock_test_questions_from_source",
    settings: {
      count,
      question_type: settings.questionType,
      difficulty: settings.difficulty,
      option_count: Math.max(2, Math.min(6, settings.optionCount || 4)),
      language: settings.language || "English",
      exam: settings.exam || null,
      subject: settings.subject || null,
      topic: settings.topic || null,
    },
    output_schema: {
      questions: [{
        question_type: "mcq_single|mcq_multiple|true_false|statement_based|assertion_reason|match_following|fill_blank|numeric_answer|paragraph_based",
        question_text: "string",
        paragraph_text: "string|null",
        options: [{ option_key: "A", option_text: "string", is_correct: false }],
        correct_answers: ["A"],
        answer_text: "string|null",
        answer_numeric: "number|null",
        answer_tolerance: 0,
        explanation: "string",
        subject: "string|null",
        topic: "string|null",
        difficulty: "easy|medium|hard"
      }]
    },
    source_text: sourceText.slice(0, 60000),
  });

  const { parsed, servedBy, trace } = await aiJson<{ questions?: AiQuestion[] } | AiQuestion[]>(system, user);
  const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? [];

  return {
    questions: normalizeAiQuestions(arr.slice(0, count), sourceName, settings, true),
    servedBy,
    trace
  };
}
