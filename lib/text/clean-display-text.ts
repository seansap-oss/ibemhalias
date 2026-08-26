const REPLACEMENTS: Array<[string, string]> = [
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€™", "’"],
  ["â€˜", "‘"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€¢", "•"],
  ["Â·", "·"],
  ["Â ", " "],
  ["Â", ""],
];

export function cleanDisplayText(value: unknown): string {
  let text = String(value ?? "");
  for (const [bad, good] of REPLACEMENTS) {
    text = text.split(bad).join(good);
  }
  return text;
}

export function cleanDisplayObject<T>(value: T): T {
  if (typeof value === "string") return cleanDisplayText(value) as T;
  if (Array.isArray(value)) return value.map((item) => cleanDisplayObject(item)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = cleanDisplayObject(entry);
    }
    return output as T;
  }
  return value;
}
