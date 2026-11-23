import { RW_TRACE_VIEW_BOX, rwTraceGlyphPath, rwTracePointFromStored, type RwTracePoint } from "@/lib/rw-trace-geometry";
import { cn } from "@/lib/utils";

export function rwStoredTracePath(strokes: { x: number; y: number }[][]) {
  return strokes.map((stroke) => stroke.map((point, index) => {
    const converted = rwTracePointFromStored(point);
    return `${index === 0 ? "M" : "L"}${converted.x},${converted.y}`;
  }).join(" ")).join(" ");
}

export function rwLiveTracePath(strokes: RwTracePoint[][]) {
  return strokes.map((stroke) => stroke.map((point, index) =>
    `${index === 0 ? "M" : "L"}${point.x},${point.y}`,
  ).join(" ")).join(" ");
}

export function RwTracePreview({ character, trace, className }: {
  character: string;
  trace?: { strokes: { x: number; y: number }[][] };
  className?: string;
}) {
  const viewBox = `${RW_TRACE_VIEW_BOX.x} ${RW_TRACE_VIEW_BOX.y} ${RW_TRACE_VIEW_BOX.width} ${RW_TRACE_VIEW_BOX.height}`;
  return (
    <svg viewBox={viewBox} className={cn("rounded-2xl border border-border bg-muted/40", className)} aria-label={`Tracé conservé pour ${character}`} role="img">
      <path d={rwTraceGlyphPath(character)} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {trace && <path d={rwStoredTracePath(trace.strokes)} fill="none" stroke="var(--primary)" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
