import { ImageResult, RayPath, Vec2 } from "../types";

export type ElementKind = "lens-converging" | "lens-diverging" | "mirror-concave" | "mirror-convex";

interface OpticalBenchProps {
  kind: ElementKind;
  fMag: number;
  objectDistance: number;
  objectHeight: number;
  image: ImageResult;
  imageX: number;
  rays: RayPath[];
  rayVisibility: { parallel: boolean; focal: boolean; central: boolean };
  showGrid: boolean;
  showLabels: boolean;
  showFocalPoints: boolean;
  zoom: number;
}

const CANVAS_W = 760;
const CANVAS_H = 340;
const DOMAIN_W = 480; // cm, total width
const DOMAIN_H = 280; // cm, total height
const RAY_COLORS = { Parallel: "#5FC7B8", Focal: "#E8A33D", Central: "#4A90E2" } as const;

function rayColorFor(label: string): string {
  if (label.startsWith("Parallel")) return RAY_COLORS.Parallel;
  if (label.startsWith("Focal")) return RAY_COLORS.Focal;
  return RAY_COLORS.Central;
}

export default function OpticalBench({
  kind,
  fMag,
  objectDistance,
  objectHeight,
  image,
  imageX,
  rays,
  rayVisibility,
  showGrid,
  showLabels,
  showFocalPoints,
  zoom,
}: OpticalBenchProps) {
  const scale = Math.min(CANVAS_W / DOMAIN_W, CANVAS_H / DOMAIN_H) * zoom;
  const originX = CANVAS_W / 2;
  const originY = CANVAS_H / 2;

  function toPx(p: Vec2) {
    return { x: originX + p.x * scale, y: originY - p.y * scale };
  }

  const isLens = kind.startsWith("lens");
  const isConcaveOrConverging = kind === "mirror-concave" || kind === "lens-converging";

  // clip rays to a sensible drawn range so they don't run off canvas at odd angles
  function clip(p: Vec2, limitCm: number) {
    return { x: Math.max(-limitCm, Math.min(limitCm, p.x)), y: Math.max(-limitCm, Math.min(limitCm, p.y)) };
  }

  const imageHeightClamped = image.atInfinity ? 0 : image.imageHeight;

  const rayVisible = (label: string) => {
    if (label.startsWith("Parallel")) return rayVisibility.parallel;
    if (label.startsWith("Focal")) return rayVisibility.focal;
    return rayVisibility.central;
  };

  return (
    <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%" height="auto" className="rounded" role="img" aria-label="Ray diagram">
      <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0D1412" />

      {showGrid && (
        <g stroke="#1A2422" strokeWidth={1}>
          {Array.from({ length: Math.floor(DOMAIN_W / 20) }).map((_, i) => {
            const x = -DOMAIN_W / 2 + i * 20;
            const px = toPx({ x, y: 0 }).x;
            return <line key={`vg${i}`} x1={px} x2={px} y1={0} y2={CANVAS_H} />;
          })}
          {Array.from({ length: Math.floor(DOMAIN_H / 20) }).map((_, i) => {
            const y = -DOMAIN_H / 2 + i * 20;
            const py = toPx({ x: 0, y }).y;
            return <line key={`hg${i}`} x1={0} x2={CANVAS_W} y1={py} y2={py} />;
          })}
        </g>
      )}

      {/* principal axis */}
      <line x1={0} x2={CANVAS_W} y1={originY} y2={originY} stroke="#3A4B48" strokeWidth={1.2} strokeDasharray="5 4" />

      {/* element silhouette */}
      <ElementGlyph kind={kind} originX={originX} originY={originY} scale={scale} />

      {/* focal points / center of curvature / optical center */}
      {showFocalPoints && (
        <>
          {isLens ? (
            <>
              <MarkerDot p={toPx({ x: -fMag, y: 0 })} color="#E85A4A" label={showLabels ? "F" : undefined} />
              <MarkerDot p={toPx({ x: fMag, y: 0 })} color="#E85A4A" label={showLabels ? "F" : undefined} />
              <MarkerDot p={toPx({ x: 0, y: 0 })} color="#4A90E2" label={showLabels ? "O" : undefined} />
            </>
          ) : (
            <>
              <MarkerDot p={toPx({ x: -fMag, y: 0 })} color="#E85A4A" label={showLabels ? "F" : undefined} />
              <MarkerDot p={toPx({ x: -2 * fMag, y: 0 })} color="#6FCF7A" label={showLabels ? "C" : undefined} />
            </>
          )}
        </>
      )}

      {/* rays */}
      {rays.filter((r) => rayVisible(r.label)).map((r) => {
        const color = rayColorFor(r.label);
        const inA = toPx(clip(r.incidentFrom, DOMAIN_W));
        const inB = toPx(r.incidentTo);
        const outA = toPx(r.outgoingFrom);
        const outB = toPx(clip(r.outgoingTo, DOMAIN_W));
        return (
          <g key={r.label}>
            <line x1={inA.x} y1={inA.y} x2={inB.x} y2={inB.y} stroke={color} strokeWidth={1.6} />
            <line x1={outA.x} y1={outA.y} x2={outB.x} y2={outB.y} stroke={color} strokeWidth={1.6} />
            {r.virtualExtension && (
              <line
                x1={toPx(r.virtualExtension.from).x}
                y1={toPx(r.virtualExtension.from).y}
                x2={toPx(clip(r.virtualExtension.to, DOMAIN_W)).x}
                y2={toPx(clip(r.virtualExtension.to, DOMAIN_W)).y}
                stroke={color}
                strokeWidth={1.2}
                strokeDasharray="4 3"
                opacity={0.7}
              />
            )}
          </g>
        );
      })}

      {/* object arrow */}
      <Arrow
        base={toPx({ x: -objectDistance, y: 0 })}
        tip={toPx({ x: -objectDistance, y: objectHeight })}
        color="#E85A4A"
        dashed={false}
        label={showLabels ? "Object" : undefined}
      />

      {/* image arrow */}
      {!image.atInfinity && (
        <Arrow
          base={toPx({ x: imageX, y: 0 })}
          tip={toPx({ x: imageX, y: imageHeightClamped })}
          color="#4A90E2"
          dashed={!image.isReal}
          label={showLabels ? (image.isReal ? "Real Image" : "Virtual Image") : undefined}
        />
      )}

      {/* image glow dot */}
      {!image.atInfinity && (
        <circle cx={toPx({ x: imageX, y: imageHeightClamped }).x} cy={toPx({ x: imageX, y: imageHeightClamped }).y} r={4} fill="#ECF2F0" opacity={0.9} />
      )}

      {showLabels && !isConcaveOrConverging && (
        <text x={8} y={16} fontSize="10" fill="#8FA39D">
          {isLens ? "Diverging lens: always virtual, upright, diminished" : "Convex mirror: always virtual, upright, diminished"}
        </text>
      )}
    </svg>
  );
}

function ElementGlyph({ kind, originX, originY, scale }: { kind: ElementKind; originX: number; originY: number; scale: number }) {
  const halfH = 100 * scale;
  if (kind.startsWith("lens")) {
    const converging = kind === "lens-converging";
    const bow = converging ? 14 : -14;
    const d = converging
      ? `M ${originX} ${originY - halfH} C ${originX + bow} ${originY - halfH * 0.5}, ${originX + bow} ${originY + halfH * 0.5}, ${originX} ${originY + halfH} C ${originX - bow} ${originY + halfH * 0.5}, ${originX - bow} ${originY - halfH * 0.5}, ${originX} ${originY - halfH} Z`
      : `M ${originX - 8} ${originY - halfH} L ${originX + 8} ${originY - halfH} C ${originX - bow} ${originY - halfH * 0.5}, ${originX - bow} ${originY + halfH * 0.5}, ${originX + 8} ${originY + halfH} L ${originX - 8} ${originY + halfH} C ${originX + bow} ${originY + halfH * 0.5}, ${originX + bow} ${originY - halfH * 0.5}, ${originX - 8} ${originY - halfH} Z`;
    return <path d={d} fill="#5FC7B833" stroke="#5FC7B8" strokeWidth={1.5} />;
  }
  const concave = kind === "mirror-concave";
  const bow = concave ? 22 : -22;
  const d = `M ${originX} ${originY - halfH} Q ${originX + bow} ${originY} ${originX} ${originY + halfH}`;
  return <path d={d} fill="none" stroke="#8FA39D" strokeWidth={3} strokeLinecap="round" />;
}

function MarkerDot({ p, color, label }: { p: { x: number; y: number }; color: string; label?: string }) {
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
      {label && (
        <text x={p.x + 5} y={p.y - 5} fontSize="10" fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}

function Arrow({
  base,
  tip,
  color,
  dashed,
  label,
}: {
  base: { x: number; y: number };
  tip: { x: number; y: number };
  color: string;
  dashed: boolean;
  label?: string;
}) {
  const angle = Math.atan2(tip.y - base.y, tip.x - base.x);
  const headLen = 8;
  const h1 = { x: tip.x - headLen * Math.cos(angle - 0.4), y: tip.y - headLen * Math.sin(angle - 0.4) };
  const h2 = { x: tip.x - headLen * Math.cos(angle + 0.4), y: tip.y - headLen * Math.sin(angle + 0.4) };
  return (
    <g opacity={dashed ? 0.75 : 1}>
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={2.2} strokeDasharray={dashed ? "5 4" : undefined} />
      <polygon points={`${tip.x},${tip.y} ${h1.x},${h1.y} ${h2.x},${h2.y}`} fill={color} />
      {label && (
        <text x={tip.x + 6} y={tip.y} fontSize="10" fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}
