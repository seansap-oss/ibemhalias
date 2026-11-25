function inflateRawSafe(bytes: Uint8Array): Uint8Array | null {
  try {
    const zlib = require("zlib") as typeof import("zlib");
    return new Uint8Array(zlib.inflateSync(Buffer.from(bytes)));
  } catch {
    try {
      const zlib = require("zlib") as typeof import("zlib");
      return new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));
    } catch {
      return null;
    }
  }
}

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractTextFromContentStream(content: string): string {
  const out: string[] = [];

  const tjArray = /\[((?:[^\[\]\\]|\\.)*)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = tjArray.exec(content)) !== null) {
    const inner = m[1];
    const parts = inner.match(/\(((?:[^()\\]|\\.)*)\)/g) || [];
    const joined = parts.map((p) => decodePdfString(p.slice(1, -1))).join("");
    if (joined.trim()) out.push(joined);
  }

  const tjSimple = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
  while ((m = tjSimple.exec(content)) !== null) {
    const t = decodePdfString(m[1]);
    if (t.trim()) out.push(t);
  }

  return out.join(" ");
}

export async function extractPdfTextAsync(buffer: ArrayBuffer): Promise<{
  text: string;
  pages: number;
  method: "pdfjs" | "flate" | "raw" | "none";
}> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = (content.items as Array<{ str?: string }>)
        .map((item) => item.str || "")
        .filter(Boolean);
      if (strings.length) {
        pageTexts.push(strings.join(" "));
      }
    }

    const combined = pageTexts.join("\n").replace(/\s+/g, " ").trim();
    if (combined.length > 0) {
      return {
        text: combined.slice(0, 60_000),
        pages: doc.numPages || 1,
        method: "pdfjs",
      };
    }
  } catch {
    // Fall back to lightweight stream parser below.
  }

  return extractPdfText(buffer);
}

export function extractPdfText(buffer: ArrayBuffer): {
  text: string;
  pages: number;
  method: "flate" | "raw" | "none";
} {
  const bytes = new Uint8Array(buffer);
  const latin = Buffer.from(bytes).toString("latin1");

  const pages = (latin.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;

  const collected: string[] = [];
  let method: "flate" | "raw" | "none" = "none";

  const streamRe = /stream\r?\n?/g;
  let match: RegExpExecArray | null;
  const positions: number[] = [];
  while ((match = streamRe.exec(latin)) !== null) {
    positions.push(match.index + match[0].length);
  }

  for (const start of positions) {
    const end = latin.indexOf("endstream", start);
    if (end === -1) continue;

    const slice = bytes.subarray(start, end);
    const inflated = inflateRawSafe(slice);

    if (inflated) {
      const content = Buffer.from(inflated).toString("latin1");
      const text = extractTextFromContentStream(content);
      if (text.trim()) {
        collected.push(text);
        method = "flate";
      }
    } else {
      const content = latin.slice(start, end);
      const text = extractTextFromContentStream(content);
      if (text.trim()) {
        collected.push(text);
        if (method === "none") method = "raw";
      }
    }
  }

  const text = collected
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, pages, method };
}
