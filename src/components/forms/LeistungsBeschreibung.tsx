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
 * - Zeigt Fett / Kursiv / Unterstrichen direkt an — keine sichtbaren Marker.
 * - Gespeichert wird weiterhin Markdown (`**fett**`, `*kursiv*`, `__unterstrichen__`),
 *   das die PDF-Renderer (`src/lib/pdf/inlineFormat.ts`) interpretieren.
 * - Wächst automatisch zwischen min/max Zeilen.
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
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => ref.current?.focus());
  }, [autoFocus]);

  // Auto-Resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const scroll = el.scrollHeight;
    const min = minRows * LINE_HEIGHT_PX + 16;
    const max = maxRows * LINE_HEIGHT_PX + 16;
    el.style.height = `${Math.max(min, Math.min(max, scroll + 2))}px`;
    el.style.overflowY = scroll > max ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const min = minRows * LINE_HEIGHT_PX + 16;
    const max = maxRows * LINE_HEIGHT_PX + 16;
    el.style.height = `${Math.max(min, Math.min(max, el.scrollHeight + 2))}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }

  function emit() {
    const el = ref.current;
    if (!el) return;
    const md = htmlToMarkdown(el);
    lastEmitted.current = md;
    onChange(md);
    resize();
  }

  function exec(command: "bold" | "italic" | "underline") {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command);
    emit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        exec(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
      }
    }
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      insertTextAtSelection("\n");
      emit();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    insertTextAtSelection(text.replace(/\r\n?/g, "\n"));
    emit();
  }

  function bulletEinfuegen() {
    const el = ref.current;
    if (!el) return;
    el.focus();
    insertTextAtSelection("• ");
    emit();
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

/** Markdown → HTML für die Anzeige im contentEditable. */
function markdownToHtml(md: string): string {
  const escaped = escapeHtml(md ?? "");
  const withMarks = escaped
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>")
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1<i>$2</i>");
  return withMarks.replace(/\n/g, "<br>");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML aus dem contentEditable → Markdown-String. */
function htmlToMarkdown(root: HTMLElement): string {
  const out = serializeNodes(Array.from(root.childNodes), {
    bold: false,
    italic: false,
    underline: false,
  });
  return out.replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trimEnd();
}

interface Marks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const BLOCK_TAGS = new Set(["DIV", "P", "LI", "TR", "H1", "H2", "H3", "H4", "H5", "H6"]);

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
  if (tag === "BR") return "\n";

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

  const inner = serializeNodes(Array.from(el.childNodes), next);
  if (BLOCK_TAGS.has(tag)) {
    return inner.endsWith("\n") ? inner : `${inner}\n`;
  }
  return inner;
}

function wrap(text: string, marks: Marks): string {
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

function insertTextAtSelection(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = document.createDocumentFragment();
  const parts = text.split("\n");
  let lastNode: Node | null = null;
  parts.forEach((part, index) => {
    if (index > 0) {
      const br = document.createElement("br");
      fragment.appendChild(br);
      lastNode = br;
    }
    if (part) {
      const node = document.createTextNode(part);
      fragment.appendChild(node);
      lastNode = node;
    }
  });
  range.insertNode(fragment);
  if (lastNode) range.setStartAfter(lastNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
