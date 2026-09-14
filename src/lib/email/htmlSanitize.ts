// Kleiner, strenger HTML-Reiniger für Texte, die im Schreib-Editor entstehen.
// Nur eine Whitelist an Tags/Attributen bleibt erhalten — alles andere fliegt raus
// (Skripte, Event-Handler, fremde Styles). Läuft nur im Browser.

const ERLAUBT: Record<string, string[]> = {
  P: [],
  BR: [],
  DIV: [],
  STRONG: [],
  B: [],
  EM: [],
  I: [],
  U: [],
  S: [],
  UL: [],
  OL: [],
  LI: [],
  H2: [],
  H3: [],
  BLOCKQUOTE: [],
  HR: [],
  A: ["href", "target", "rel"],
  SPAN: ["style"],
};

/** Nur ungefährliche Farb-/Ausrichtungs-Styles behalten. */
function styleFiltern(wert: string): string {
  return wert
    .split(";")
    .map((t) => t.trim())
    .filter((t) => /^(color|background-color|text-align|font-weight|font-style)\s*:/i.test(t))
    .filter((t) => !/url\s*\(|expression|javascript:/i.test(t))
    .join("; ");
}

function istSichereUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("mailto:") ||
    u.startsWith("tel:") ||
    u.startsWith("#")
  );
}

export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const doc = document.implementation.createHTMLDocument("rein");
  doc.body.innerHTML = html;

  const walk = (el: Element) => {
    [...el.children].forEach(walk);
    const tag = el.tagName;
    const erlaubteAttrs = ERLAUBT[tag];
    if (!erlaubteAttrs) {
      // Unbekanntes Element: Inhalt behalten, Hülle entfernen.
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (!erlaubteAttrs.includes(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === "style") {
        const rein = styleFiltern(attr.value);
        if (rein) el.setAttribute("style", rein);
        else el.removeAttribute("style");
      }
      if (name === "href" && !istSichereUrl(attr.value)) el.removeAttribute("href");
    }
    if (tag === "A" && el.getAttribute("href")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  };

  [...doc.body.children].forEach(walk);
  return doc.body.innerHTML.trim();
}
