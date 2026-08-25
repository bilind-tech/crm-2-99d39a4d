import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Mindesthöhe in Zeilen (Default 2). „Pauschal"-Modus nutzt 5+. */
  minRows?: number;
  /** Maxhöhe in Zeilen, danach wird gescrollt (Default 16). */
  maxRows?: number;
  /** Toolbar oben rechts mit B / I / U / Liste. Default false. */
  withToolbar?: boolean;
  className?: string;
  id?: string;
  autoFocus?: boolean;
}

const LINE_HEIGHT_PX = 22; // entspricht text-sm + leading-relaxed

/**
 * WYSIWYG-Feld für Leistungsbeschreibungen.
 *
 * Zeilenmodell (deterministisch):
 * - Das Element hat `white-space: pre-wrap`; Zeilenumbrüche sind echte
 *   "\n"-Zeichen in den Textknoten — keine Browser-<div>/<br>-Strukturen.
 * - Enter wird per keydown abgefangen und als "\n" via insertText eingefügt,
 *   dadurch baut der Browser nie eigene Block-Elemente auf.
 * - Gespeichert wird Markdown (`**fett**`, `*kursiv*`, `__unterstrichen__`),
 *   das die PDF-Renderer (`src/lib/pdf/inlineFormat.ts`) interpretieren.
 */
export function LeistungsBeschreibung({
  value,
  onChange,
  placeholder,
  minRows = 2,
  maxRows = 16,
  withToolbar = false,
  className,
  id,
  autoFocus = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");

  // Externen Wert übernehmen (ohne den Cursor beim Tippen zu zerstören)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastEmitted.current || document.activeElement === el) return;
    el.innerHTML = markdownToHtml(value);
    ensureTrailingBr(el);
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => ref.current?.focus());
  }, [autoFocus]);

  // Auto-Resize
  useEffect(() => {
    resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minRows, maxRows]);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const scroll = el.scrollHeight;
    const min = minRows * LINE_HEIGHT_PX + 16;
    const max = maxRows * LINE_HEIGHT_PX + 16;
    el.style.height = `${Math.max(min, Math.min(max, scroll + 2))}px`;
    el.style.overflowY = scroll > max ? "auto" : "hidden";
  }

  function emit() {
    const el = ref.current;
    if (!el) return;
    const md = htmlToMarkdown(el);
    lastEmitted.current = md;
    onChange(md);
    ensureTrailingBr(el);
    resize();
  }

  function exec(command: "bold" | "italic" | "underline") {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command);
    emit();
  }

  function insertPlain(text: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertText", false, text);
    emit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      // Browser-Default (<div>/<br>-Chaos) komplett unterbinden — Zeilenumbruch
      // ist bei uns immer ein echtes "\n" im Textknoten.
      e.preventDefault();
      insertPlain("\n");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        exec(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    insertPlain(text.replace(/\r\n?/g, "\n"));
  }

  function bulletEinfuegen() {
    insertPlain("• ");
  }

  const isEmpty = !value || !value.trim();

  return (
    <div className={cn("relative", className)}>
      {withToolbar && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex gap-1">
          <ToolbarBtn onClick={() => exec("bold")} title="Fett (Cmd/Ctrl+B)">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("italic")} title="Kursiv (Cmd/Ctrl+I)">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => exec("underline")} title="Unterstrichen (Cmd/Ctrl+U)">
            <Underline className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={bulletEinfuegen} title="Aufzählungs-Punkt einfügen">
            <List className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>
      )}
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "block w-full whitespace-pre-wrap break-words rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isEmpty &&
            "before:pointer-events-none before:text-muted-foreground before:content-[attr(data-placeholder)]",
          withToolbar && "pr-32",
        )}
      />
    </div>
  );
}

/**
 * Markdown → HTML für die Anzeige im contentEditable.
 * Zeilenumbrüche bleiben echte "\n"-Zeichen (Rendering via pre-wrap),
 * Formatierungen werden zu <b>/<i>/<u>-Tags.
 */
function markdownToHtml(md: string): string {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  return lines
    .map((line) => {
      const escaped = escapeHtml(line);
      return escaped
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
        .replace(/__([^_]+)__/g, "<u>$1</u>")
        .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
        .replace(/(^|[^_])_([^_]+)_/g, "$1<i>$2</i>");
    })
    .join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Chrome zeigt ein "\n" am Ende eines contentEditable (pre-wrap) nicht als
 * eigene Zeile an — der Caret bleibt scheinbar stehen. Ein Sentinel-<br>
 * am Ende gibt der letzten Zeile eine Box. Der Serializer ignoriert ihn.
 */
function ensureTrailingBr(el: HTMLElement) {
  const last = el.lastChild;
  const isSentinel =
    last &&
    last.nodeType === Node.ELEMENT_NODE &&
    (last as HTMLElement).tagName === "BR" &&
    (last as HTMLElement).dataset.sentinel === "1";
  const endsWithNewline = (el.textContent ?? "").endsWith("\n");
  if (endsWithNewline && !isSentinel) {
    const br = document.createElement("br");
    br.dataset.sentinel = "1";
    el.appendChild(br);
  } else if (!endsWithNewline && isSentinel) {
    el.removeChild(last as Node);
  }
}

/** HTML aus dem contentEditable → Markdown-String. */
function htmlToMarkdown(root: HTMLElement): string {
  const out = serializeNodes(Array.from(root.childNodes), {
    bold: false,
    italic: false,
    underline: false,
  });
  return out
    .replace(/[​﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\r\n?/g, "\n");
}

interface Marks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

function serializeNodes(nodes: Node[], marks: Marks): string {
  let out = "";
  nodes.forEach((node) => {
    out += serializeNode(node, marks);
  });
  return out;
}

function serializeNode(node: Node, marks: Marks): string {
  if (node.nodeType === Node.TEXT_NODE) return wrap(node.textContent ?? "", marks);
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "BR") return el.dataset.sentinel === "1" ? "" : "\n";

  const style = el.style;
  const next: Marks = {
    bold:
      marks.bold ||
      tag === "B" ||
      tag === "STRONG" ||
      style.fontWeight === "bold" ||
      Number(style.fontWeight) >= 600,
    italic: marks.italic || tag === "I" || tag === "EM" || style.fontStyle === "italic",
    underline:
      marks.underline || tag === "U" || (style.textDecoration || "").includes("underline"),
  };

  return serializeNodes(Array.from(el.childNodes), next);
}

/**
 * Hüllt formatierten Text in Markdown-Marker — zeilenweise, damit Marker
 * niemals über einen Zeilenumbruch hinweg aufgespannt werden (der PDF-Parser
 * arbeitet zeilenbasiert).
 */
function wrap(text: string, marks: Marks): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => wrapLine(line, marks))
    .join("\n");
}

function wrapLine(text: string, marks: Marks): string {
  if (!text) return "";
  // Führende/abschließende Leerzeichen bleiben außerhalb der Marker.
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const pre = match?.[1] ?? "";
  const core = match?.[2] ?? "";
  const post = match?.[3] ?? "";
  if (!core) return text;
  let out = core;
  if (marks.underline) out = `__${out}__`;
  if (marks.italic) out = `*${out}*`;
  if (marks.bold) out = `**${out}**`;
  return pre + out + post;
}

function ToolbarBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="pointer-events-auto h-7 w-7 text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}
