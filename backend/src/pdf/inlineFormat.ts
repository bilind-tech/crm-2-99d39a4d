// Inline-Formatierung für PDF-Texte.
// Markdown-Marker aus dem Leistungs-Editor werden in pdfmake-Textfragmente
// übersetzt:  **fett**  ·  *kursiv* / _kursiv_  ·  __unterstrichen__
// Der Parser ist bewusst klein gehalten und wird 1:1 zwischen
// src/lib/pdf/inlineFormat.ts und backend/src/pdf/inlineFormat.ts gespiegelt.

export interface InlineFragment {
  text: string;
  bold?: boolean;
  italics?: boolean;
  decoration?: "underline";
}

interface Style {
  bold: boolean;
  italics: boolean;
  underline: boolean;
}

const EMPTY: Style = { bold: false, italics: false, underline: false };

/** Zerlegt eine Zeile in pdfmake-Textfragmente. */
export function inlineText(text: string): InlineFragment[] {
  const out: InlineFragment[] = [];
  parseInto(text ?? "", EMPTY, out);
  if (out.length === 0) out.push({ text: "" });
  return mergeFragments(out);
}

/** Entfernt alle Formatier-Marker (für Längen-/Zeilenschätzung). */
export function plainText(text: string): string {
  return inlineText(text)
    .map((f) => f.text)
    .join("");
}

const MARKERS: Array<{ token: string; key: keyof Style }> = [
  { token: "**", key: "bold" },
  { token: "__", key: "underline" },
  { token: "*", key: "italics" },
  { token: "_", key: "italics" },
];

function parseInto(text: string, style: Style, out: InlineFragment[]): void {
  let buffer = "";
  let i = 0;
  const flush = () => {
    if (buffer) {
      out.push(toFragment(buffer, style));
      buffer = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Escape: \* bzw. \_ gibt das Zeichen literal aus.
    if (ch === "\\" && i + 1 < text.length && "*_\\".includes(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    const marker = MARKERS.find((m) => text.startsWith(m.token, i) && !style[m.key]);
    // Öffnender Marker muss direkt von einem Nicht-Leerzeichen gefolgt werden
    // („2 * 3 * 4" bleibt dadurch normaler Text).
    if (marker && /\S/.test(text[i + marker.token.length] ?? "")) {
      const close = findClosing(text, i + marker.token.length, marker.token);
      if (close > -1) {
        flush();
        const inner = text.slice(i + marker.token.length, close);
        parseInto(inner, { ...style, [marker.key]: true }, out);
        i = close + marker.token.length;
        continue;
      }
    }

    buffer += ch;
    i += 1;
  }
  flush();
}

/** Sucht das nächste passende Schluss-Token; leerer Inhalt zählt nicht. */
function findClosing(text: string, from: number, token: string): number {
  let i = from;
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2;
      continue;
    }
    if (text.startsWith(token, i)) {
      // Schließender Marker muss direkt auf ein Nicht-Leerzeichen folgen.
      if (i > from && /\S/.test(text[i - 1] ?? "")) return i;
      i += token.length;
      continue;
    }
    i += 1;
  }
  return -1;
}

function toFragment(text: string, style: Style): InlineFragment {
  const f: InlineFragment = { text };
  if (style.bold) f.bold = true;
  if (style.italics) f.italics = true;
  if (style.underline) f.decoration = "underline";
  return f;
}

function mergeFragments(fragments: InlineFragment[]): InlineFragment[] {
  const out: InlineFragment[] = [];
  for (const f of fragments) {
    const last = out[out.length - 1];
    if (
      last &&
      !!last.bold === !!f.bold &&
      !!last.italics === !!f.italics &&
      last.decoration === f.decoration
    ) {
      last.text += f.text;
    } else {
      out.push({ ...f });
    }
  }
  return out;
}

/** Erkennt Aufzählungszeilen — „*text*" (kursiv) gilt bewusst NICHT als Bullet. */
export function bulletMatch(line: string): string | null {
  const m = line.match(/^(?:[•\u2022\-–]|\*(?=\s))\s+(.*)$/);
  return m ? m[1] : null;
}
