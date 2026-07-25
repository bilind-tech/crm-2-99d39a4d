// Client-only wrapper around the react-pdf based viewer.
// react-pdf's canvas module references browser-only globals (DOMMatrix) at
// import time, which crashes SSR. We therefore lazy-load the real
// implementation only in the browser.
import { lazy, Suspense, useEffect, useState, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";

const LazyImpl = lazy(() =>
  import("./PdfCanvasViewerImpl").then((m) => ({ default: m.PdfCanvasViewer })),
);

type Props = ComponentProps<typeof LazyImpl>;

export function PdfCanvasViewer(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fallback = (
    <div className={props.className ?? "h-full w-full overflow-y-auto bg-muted/30"}>
      <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>PDF wird geladen …</span>
      </div>
    </div>
  );
  if (!mounted) return fallback;
  return (
    <Suspense fallback={fallback}>
      <LazyImpl {...props} />
    </Suspense>
  );
}