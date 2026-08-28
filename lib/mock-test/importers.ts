export type ImportedQuestion = {
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
  options: { option_key: string; option_text: string; is_correct: boolean; sort_order: number }[];
};

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && quoted && next === '"') {
      field += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some(x => x.trim().length)) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(x => x.trim().length)) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map(h => normalizeHeader(h));

  return rows.slice(1).map(cols => {
    const out: Record<string, string> = {};
    headers.forEach((h, i) => { out[h] = (cols[i] ?? "").trim(); });
    return out;
  });
}

function normalizeHeader(v: string) {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function splitAnswerKeys(v: string) {
  return v
    .toUpperCase()
    .split(/[,\s;|/&]+/)
    .map(x => x.replace(/[^A-H]/g, ""))
    .filter(Boolean);
}

export function csvRowsToQuestions(rows: Record<string, string>[], filename: string): ImportedQuestion[] {
  const result: ImportedQuestion[] = [];

  for (const row of rows) {
    const question = row.question || row.question_text || row.q || "";
    if (!question.trim()) continue;

    const type = (row.question_type || row.type || "mcq_single").trim().toLowerCase();
    const answer = row.correct_answer || row.answer || row.correct || "";
    const keys = new Set(splitAnswerKeys(answer));
    const options: ImportedQuestion["options"] = [];

    for (let i = 0; i < 8; i++) {
      const key = String.fromCharCode(65 + i);
      const raw =
        row[`option_${key.toLowerCase()}`] ||
        row[`option${key.toLowerCase()}`] ||
        row[`option_${i + 1}`] ||
        "";
      if (raw.trim()) {
        options.push({
          option_key: key,
          option_text: raw.trim(),
          is_correct: keys.has(key),
          sort_order: i + 1,
        });
      }
    }

    const answerNumericRaw = row.answer_numeric || row.numeric_answer || "";
    const answerNumeric = answerNumericRaw !== "" && Number.isFinite(Number(answerNumericRaw))
      ? Number(answerNumericRaw)
      : null;

    const answerText = row.answer_text || row.text_answer || (
      type === "fill_blank" ? answer : ""
    );

    const isTyped = type === "fill_blank" || type === "numeric_answer";
    const hasChoiceKey = options.some(x => x.is_correct);
    const hasTypedKey = type === "fill_blank"
      ? Boolean(answerText.trim())
      : type === "numeric_answer"
        ? answerNumeric !== null
        : false;

    result.push({
      question_type: type,
      question_text: question.trim(),
      paragraph_text: row.paragraph || row.passage || null,
      explanation: row.explanation || row.solution || null,
      exam: row.exam || row.exam_category || null,
      subject: row.subject || null,
      topic: row.topic || null,
      difficulty: row.difficulty || "medium",
      marks: Number(row.marks || 1) || 1,
      negative_marks: Number(row.negative_marks || row.negative_marking || 0) || 0,
      source: "CSV import",
      source_pdf: filename,
      source_page: null,
      verification_status: (isTyped ? hasTypedKey : hasChoiceKey) ? "verified" : "needs_verification",
      answer_text: answerText || null,
      answer_numeric: answerNumeric,
      answer_tolerance: Number(row.answer_tolerance || row.tolerance || 0) || 0,
      options,
    });
  }

  return result;
}

function cleanLine(v: string) {
  return v.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseExplicitAnswer(line: string) {
  const m = line.match(/^(?:answer|ans(?:wer)?)\s*[:\-]\s*([A-H](?:\s*[,;&/]\s*[A-H])*)\b/i);
  if (!m) return [];
  return splitAnswerKeys(m[1]);
}

function questionStart(line: string) {
  return line.match(/^(?:q(?:uestion)?\s*)?(\d{1,4})\s*[\.\):\-]\s+(.+)$/i);
}

function optionStart(line: string) {
  return line.match(/^\(?([A-H])\)?\s*[\.\):\-]\s+(.+)$/i);
}

function answerKeyFromLines(lines: string[]) {
  const map = new Map<number, string[]>();
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    const lower = line.toLowerCase();
    const likelyKey = lower.includes("answer key") || lower.startsWith("answers") || lower.startsWith("key:");
    if (!likelyKey) continue;

    const matches = [...line.matchAll(/(\d{1,4})\s*[\.\):\-]?\s*([A-H])(?=\s|$|[,;])/gi)];
    for (const m of matches) {
      map.set(Number(m[1]), [m[2].toUpperCase()]);
    }
  }
  return map;
}

export function parseStructuredPdfPages(
  pages: { page: number; text: string }[],
  filename: string
): ImportedQuestion[] {
  const allLines = pages.flatMap(p => p.text.split(/\r?\n/));
  const globalKey = answerKeyFromLines(allLines);
  const out: ImportedQuestion[] = [];

  for (const page of pages) {
    const lines = page.text.split(/\r?\n/).map(cleanLine).filter(Boolean);
    let current: any = null;
    let currentOption: { option_key: string; option_text: string } | null = null;

    const flushOption = () => {
      if (!current || !currentOption) return;
      current.options.push({
        option_key: currentOption.option_key,
        option_text: currentOption.option_text.trim(),
        is_correct: false,
        sort_order: current.options.length + 1,
      });
      currentOption = null;
    };

    const flushQuestion = () => {
      flushOption();
      if (!current) return;

      const keys = current.answerKeys.length
        ? current.answerKeys
        : (globalKey.get(current.number) ?? []);

      for (const option of current.options) {
        option.is_correct = keys.includes(option.option_key);
      }

      if (current.question_text && current.options.length >= 2) {
        out.push({
          question_type: keys.length > 1 ? "mcq_multiple" : "mcq_single",
          question_text: current.question_text.trim(),
          paragraph_text: null,
          explanation: current.explanation || null,
          exam: null,
          subject: null,
          topic: null,
          difficulty: "medium",
          marks: 1,
          negative_marks: 0,
          source: "PDF import",
          source_pdf: filename,
          source_page: page.page,
          verification_status: current.options.some((x: any) => x.is_correct)
            ? "verified"
            : "needs_verification",
          answer_text: null,
          answer_numeric: null,
          answer_tolerance: 0,
          options: current.options,
        });
      }
      current = null;
    };

    for (const line of lines) {
      const qs = questionStart(line);
      if (qs) {
        flushQuestion();
        current = {
          number: Number(qs[1]),
          question_text: qs[2],
          options: [],
          answerKeys: [],
          explanation: "",
        };
        continue;
      }

      if (!current) continue;

      const os = optionStart(line);
      if (os) {
        flushOption();
        currentOption = { option_key: os[1].toUpperCase(), option_text: os[2] };
        continue;
      }

      const answer = parseExplicitAnswer(line);
      if (answer.length) {
        flushOption();
        current.answerKeys = answer;
        continue;
      }

      if (/^(?:explanation|solution)\s*[:\-]/i.test(line)) {
        flushOption();
        current.explanation = line.replace(/^(?:explanation|solution)\s*[:\-]\s*/i, "");
        continue;
      }

      if (currentOption) currentOption.option_text += " " + line;
      else current.question_text += " " + line;
    }

    flushQuestion();
  }

  return out;
}

export async function extractPdfPages(buffer: ArrayBuffer) {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;

  const pages: { page: number; text: string }[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const items = content.items ?? [];
    let text = "";
    let lastY: number | null = null;

    for (const item of items as any[]) {
      if (!("str" in item)) continue;
      const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(lastY - y) > 3) text += "\n";
      else if (text && !text.endsWith("\n")) text += " ";
      text += String(item.str || "");
      if (y !== null) lastY = y;
    }

    pages.push({ page: n, text });
  }

  return { pages, pageCount: doc.numPages };
}

function normalizeAiOutput(raw: any) {
  if (typeof raw === "string") return raw;
  if (typeof raw?.text === "string") return raw.text;
  if (typeof raw?.content === "string") return raw.content;
  if (typeof raw?.output === "string") return raw.output;
  if (typeof raw?.message?.content === "string") return raw.message.content;
  return JSON.stringify(raw ?? "");
}

function extractJsonLoose(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const a = candidate.indexOf("[");
  const b = candidate.lastIndexOf("]");
  if (a >= 0 && b > a) return JSON.parse(candidate.slice(a, b + 1));
  const o1 = candidate.indexOf("{");
  const o2 = candidate.lastIndexOf("}");
  if (o1 >= 0 && o2 > o1) return JSON.parse(candidate.slice(o1, o2 + 1));
  return JSON.parse(candidate);
}

export async function tryExistingAiDraft(
  text: string,
  filename: string,
  maxQuestions = 40
): Promise<ImportedQuestion[]> {
  try {
    const ai: any = await import("@/lib/ai/router");
    const fn = ai?.runWithFallback;
    if (typeof fn !== "function") return [];

    const prompt = [
      "Create a DRAFT competitive-exam question bank from the supplied material.",
      "Return ONLY JSON array. Do not include markdown.",
      `Maximum ${maxQuestions} questions.`,
      "Each object: question_text, options (array of 4 strings), correct_answer (A/B/C/D or null), explanation, subject, topic, difficulty.",
      "If you are not certain of the correct answer, use null. Never invent source page numbers.",
      "Material:",
      text.slice(0, 50000),
    ].join("\n\n");

    const attempts = [
      () => fn(prompt),
      () => fn({ prompt }),
      () => fn({ task: "mock_test_pdf_draft", prompt }),
      () => fn({ messages: [{ role: "user", content: prompt }] }),
    ];

    let raw: any = null;
    for (const run of attempts) {
      try {
        raw = await run();
        if (raw) break;
      } catch {}
    }
    if (!raw) return [];

    const parsed = extractJsonLoose(normalizeAiOutput(raw));
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : [];

    return arr.slice(0, maxQuestions).map((q: any, idx: number) => {
      const opts = Array.isArray(q.options) ? q.options.slice(0, 8) : [];
      const keys = splitAnswerKeys(String(q.correct_answer ?? ""));
      const options = opts.map((v: any, i: number) => ({
        option_key: String.fromCharCode(65 + i),
        option_text: String(v ?? ""),
        is_correct: keys.includes(String.fromCharCode(65 + i)),
        sort_order: i + 1,
      })).filter((x: any) => x.option_text.trim());

      return {
        question_type: keys.length > 1 ? "mcq_multiple" : "mcq_single",
        question_text: String(q.question_text ?? "").trim(),
        paragraph_text: null,
        explanation: q.explanation ? String(q.explanation) : null,
        exam: null,
        subject: q.subject ? String(q.subject) : null,
        topic: q.topic ? String(q.topic) : null,
        difficulty: q.difficulty ? String(q.difficulty) : "medium",
        marks: 1,
        negative_marks: 0,
        source: "AI draft from PDF",
        source_pdf: filename,
        source_page: null,
        verification_status: "needs_verification" as const,
        answer_text: null,
        answer_numeric: null,
        answer_tolerance: 0,
        options,
      };
    }).filter((q: ImportedQuestion) => q.question_text && q.options.length >= 2);
  } catch {
    return [];
  }
}
