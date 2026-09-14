// Schreib-Editor für E-Mail-Vorlagen und Signaturen: Man schreibt direkt so,
// wie die Mail später aussieht — fett, kursiv, unterstrichen, Listen, Links,
// Farben. Das Ergebnis wird automatisch in sauberes HTML umgewandelt.
// Bewusst ohne zusätzliche Bibliothek (contentEditable + document.execCommand).

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Eraser,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/email/htmlSanitize";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const FARBEN = [
  { name: "Standard", wert: "#1f2937" },
  { name: "Grau", wert: "#6b7280" },
  { name: "Blau", wert: "#1d4ed8" },
  { name: "Grün", wert: "#15803d" },
  { name: "Rot", wert: "#b91c1c" },
];

export function RichtextEditor({ value, onChange, placeholder, minHeight = 320 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [farbenOffen, setFarbenOffen] = useState(false);

  // Inhalt nur von außen setzen, wenn er wirklich abweicht — sonst springt der Cursor.
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const melden = () => {
    const el = ref.current;
    if (el) onChange(sanitizeHtml(el.innerHTML));
  };

  const cmd = (befehl: string, wert?: string) => {
    ref.current?.focus();
    document.execCommand(befehl, false, wert);
    melden();
  };

  const linkSetzen = () => {
    const url = window.prompt("Link-Adresse (z. B. https://mycleancenter.de)");
    if (!url) return;
    cmd("createLink", url);
  };

  // Eingefügter Text soll keine fremden Formate mitbringen.
  const beiEinfuegen = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    melden();
  };

  const Knopf = ({
    onClick,
    title,
    children,
  }: {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1">
        <Knopf title="Fett" onClick={() => cmd("bold")}>
          <Bold className="h-4 w-4" />
        </Knopf>
        <Knopf title="Kursiv" onClick={() => cmd("italic")}>
          <Italic className="h-4 w-4" />
        </Knopf>
        <Knopf title="Unterstrichen" onClick={() => cmd("underline")}>
          <Underline className="h-4 w-4" />
        </Knopf>
        <span className="mx-1 h-5 w-px bg-border" />
        <Knopf title="Überschrift" onClick={() => cmd("formatBlock", "<h2>")}>
          <Heading2 className="h-4 w-4" />
        </Knopf>
        <Knopf title="Normaler Text" onClick={() => cmd("formatBlock", "<p>")}>
          <Type className="h-4 w-4" />
        </Knopf>
        <Knopf title="Aufzählung" onClick={() => cmd("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </Knopf>
        <Knopf title="Nummerierte Liste" onClick={() => cmd("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </Knopf>
        <Knopf title="Link einfügen" onClick={linkSetzen}>
          <Link2 className="h-4 w-4" />
        </Knopf>
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="relative">
          <Knopf title="Textfarbe" onClick={() => setFarbenOffen((v) => !v)}>
            <span className="h-4 w-4 rounded-full border border-border bg-gradient-to-br from-foreground/70 to-primary" />
          </Knopf>
          {farbenOffen && (
            <div className="absolute z-20 mt-1 flex gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-md">
              {FARBEN.map((f) => (
                <button
                  key={f.wert}
                  type="button"
                  title={f.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    cmd("foreColor", f.wert);
                    setFarbenOffen(false);
                  }}
                  className="h-6 w-6 rounded-full border border-border"
                  style={{ backgroundColor: f.wert }}
                />
              ))}
            </div>
          )}
        </div>
        <Knopf title="Formatierung entfernen" onClick={() => cmd("removeFormat")}>
          <Eraser className="h-4 w-4" />
        </Knopf>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder ?? "Hier schreiben …"}
        onInput={melden}
        onBlur={melden}
        onPaste={beiEinfuegen}
        style={{ minHeight }}
        className={cn(
          "prose-email w-full bg-white px-5 py-4 text-[14px] leading-relaxed text-[#1f2937] outline-none",
          "overflow-y-auto [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:mb-2",
          "[&_a]:text-blue-700 [&_a]:underline",
          "empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]",
        )}
      />
    </div>
  );
}
