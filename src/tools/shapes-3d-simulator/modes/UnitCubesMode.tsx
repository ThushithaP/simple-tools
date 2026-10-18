import { useEffect, useMemo, useState } from "react";
import { bestCuboidArrangement } from "../geometry";
import { SliderField, StatGrid, InfoBox, SegmentedField, ColorPicker } from "../components/Controls";
import UnitCubesScene, { faceKey, BOX_FACE_NAMES } from "../components/UnitCubesScene";
import FullscreenPanel from "../../../components/FullscreenPanel";

const PRESETS = [1, 8, 27, 50, 64, 125];
type Tool = "view" | "paint" | "cut";

export default function UnitCubesMode() {
  const [n, setN] = useState(50);
  const [explode, setExplode] = useState(0.15);
  const [tool, setTool] = useState<Tool>("view");
  const [paintColor, setPaintColor] = useState("#F2D14E");
  const [removedCubes, setRemovedCubes] = useState<Set<string>>(new Set());
  const [customFaceColors, setCustomFaceColors] = useState<Record<string, string>>({});
  const [lastPainted, setLastPainted] = useState<string | null>(null);
  const [layerColor, setLayerColor] = useState<boolean>(false);

  const arrangement = useMemo(() => bestCuboidArrangement(n), [n]);
  const cube27 = useMemo(() => bestCuboidArrangement(27), []);
  const cube64 = useMemo(() => bestCuboidArrangement(64), []);

  // a new quantity means a new grid shape, so old cut/paint indices no longer apply
  useEffect(() => {
    setRemovedCubes(new Set());
    setCustomFaceColors({});
    setLastPainted(null);
  }, [arrangement.x, arrangement.y, arrangement.z]);

  const nearestCubeBelow = useMemo(() => {
    let k = Math.floor(Math.cbrt(n));
    while (k ** 3 > n) k--;
    return k ** 3;
  }, [n]);
  const nearestCubeAbove = useMemo(() => {
    let k = Math.ceil(Math.cbrt(n));
    while (k ** 3 < n) k++;
    return k ** 3;
  }, [n]);

  function handleCubeClick(cubeKeyStr: string, faceIndex: number, _ix: number, _iy: number, _iz: number) {
    if (tool === "cut") {
      setRemovedCubes((prev) => {
        const next = new Set(prev);
        if (next.has(cubeKeyStr)) next.delete(cubeKeyStr);
        else next.add(cubeKeyStr);
        return next;
      });
    } else if (tool === "paint") {
      const key = faceKey(cubeKeyStr, faceIndex);
      setCustomFaceColors((prev) => ({ ...prev, [key]: paintColor }));
      setLastPainted(`${cubeKeyStr} — ${BOX_FACE_NAMES[faceIndex]} face`);
    }
  }

  const layerCounts = useMemo(() => {
    const counts: number[] = [];
    for (let iy = 0; iy < arrangement.y; iy++) {
      let count = 0;
      for (let ix = 0; ix < arrangement.x; ix++) {
        for (let iz = 0; iz < arrangement.z; iz++) {
          if (!removedCubes.has(`${ix}-${iy}-${iz}`)) count++;
        }
      }
      counts.push(count);
    }
    return counts;
  }, [arrangement, removedCubes]);

  const remainingTotal = arrangement.used - removedCubes.size;
  const layersUnequal = layerCounts.some((c) => c !== layerCounts[0]);
  const paintedFaceCount = Object.keys(customFaceColors).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">How many unit cubes?</div>
          <SliderField label="Quantity" unit=" cubes" min={1} max={1000} step={1} value={n} onChange={setN} />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setN(p)}
                className={`rounded px-2.5 py-1.5 text-xs border transition-colors min-h-[36px] ${n === p ? "bg-[#5FC7B8] border-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] border-[#2A3A37] text-[#8FA39D]"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="rounded px-2.5 py-1.5 text-xs border"
            onClick={() => setLayerColor((prev) => !prev)}
          >
            {layerColor ? "Remove Layer Colors" : "Apply Layer Colors"}
          </button>
        </div>

        <SliderField label="Explode (pull layers apart)" unit="" min={0} max={1} step={0.05} value={explode} onChange={setExplode} />

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Tool</div>
          <SegmentedField
            label="Click a cube to..."
            value={tool}
            onChange={setTool}
            options={[
              { value: "view", label: "Just rotate" },
              { value: "paint", label: "Paint a face" },
              { value: "cut", label: "Cut out" },
            ]}
          />
          {tool === "paint" && (
            <>
              <ColorPicker label="Paint color" value={paintColor} onChange={setPaintColor} />
              <div className="text-[10px] text-[#5C726C]">Click exactly the face you want to color — only that one side changes, not the whole cube.</div>
              {lastPainted && <div className="text-[10px] text-[#5FC7B8]">Last painted: {lastPainted}</div>}
            </>
          )}
          {tool === "cut" && <div className="text-[10px] text-[#5C726C]">Click a cube to remove it. Click a gap again to put a cube back.</div>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCustomFaceColors({});
                setLastPainted(null);
              }}
              className="flex-1 rounded border border-dashed border-[#3A4B48] py-1.5 text-xs text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors"
            >
              Reset paint
            </button>
            <button
              onClick={() => setRemovedCubes(new Set())}
              className="flex-1 rounded border border-dashed border-[#3A4B48] py-1.5 text-xs text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors"
            >
              Undo all cuts
            </button>
          </div>
        </div>

        {!arrangement.isPerfectCube && (
          <div className="rounded border border-dashed border-[#3A4B48] p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Try instead</div>
            <button onClick={() => setN(nearestCubeBelow)} className="w-full rounded border border-[#2A3A37] bg-[#0F1614] py-2 text-xs text-[#8FA39D] hover:border-[#5FC7B8] transition-colors">
              Remove {n - nearestCubeBelow} cubes → {nearestCubeBelow} ({Math.round(Math.cbrt(nearestCubeBelow))}×{Math.round(Math.cbrt(nearestCubeBelow))}×{Math.round(Math.cbrt(nearestCubeBelow))} cube)
            </button>
            <button onClick={() => setN(nearestCubeAbove)} className="w-full rounded border border-[#2A3A37] bg-[#0F1614] py-2 text-xs text-[#8FA39D] hover:border-[#5FC7B8] transition-colors">
              Add {nearestCubeAbove - n} cubes → {nearestCubeAbove} ({Math.round(Math.cbrt(nearestCubeAbove))}×{Math.round(Math.cbrt(nearestCubeAbove))}×{Math.round(Math.cbrt(nearestCubeAbove))} cube)
            </button>
          </div>
        )}

        <InfoBox>
          A perfect cube needs the <span className="text-[#ECF2F0]">same</span> number of unit cubes in every direction (x × x × x).
          3×3×3 = 27, 4×4×4 = 64 — since {n} sits between those, it can't form a complete cube.
        </InfoBox>
      </div>

      <div className="space-y-6">
        <FullscreenPanel
          cardClassName=""
          caption={tool === "view" ? "Drag to rotate • scroll to zoom" : tool === "paint" ? "Click any single face to paint just that face" : "Click any cube to cut it out"}
        >
          <UnitCubesScene
            x={arrangement.x}
            y={arrangement.y}
            z={arrangement.z}
            explodeFactor={explode}
            removedCubes={removedCubes}
            customFaceColors={customFaceColors}
            lColor={layerColor}
            onCubeClick={handleCubeClick}
          />
        </FullscreenPanel>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4 space-y-2">
          <div className="text-sm font-medium text-[#ECF2F0]">
            {arrangement.x} × {arrangement.y} × {arrangement.z} {arrangement.isPerfectCube ? "— a perfect cube!" : "cuboid"}
            {removedCubes.size > 0 && <span className="text-[#E8A33D]"> (cut down to {remainingTotal})</span>}
          </div>
          <p className="text-xs text-[#8FA39D] leading-relaxed">
            {arrangement.isPerfectCube
              ? `${n} cubes arrange perfectly into a ${arrangement.x}×${arrangement.y}×${arrangement.z} cube — every side has the same length.`
              : `${n} cubes can't form a perfect cube, but they arrange neatly into a ${arrangement.x}×${arrangement.y}×${arrangement.z} cuboid using all ${arrangement.used} of them${arrangement.leftover > 0 ? `, with ${arrangement.leftover} left over` : ""
              }.`}
          </p>
          <StatGrid
            stats={[
              { label: "Cubes across (x)", value: `${arrangement.x}` },
              { label: "Cubes deep (z)", value: `${arrangement.z}` },
              { label: "Layers (y)", value: `${arrangement.y}` },
              { label: "Cubes used", value: `${arrangement.used}` },
              { label: "Cut away", value: `${removedCubes.size}`, muted: removedCubes.size === 0 },
              { label: "Faces painted", value: `${paintedFaceCount}`, muted: paintedFaceCount === 0 },
            ]}
          />
        </div>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Cubes per layer{layersUnequal ? " (uneven after cutting!)" : ""}</div>
          <div className="flex flex-wrap gap-2">
            {layerCounts.map((c, i) => (
              <div key={i} className={`rounded border px-3 py-2 text-xs ${c !== arrangement.x * arrangement.z ? "border-[#E8A33D] text-[#E8A33D]" : "border-[#2A3A37] text-[#8FA39D]"}`}>
                Layer {i + 1}: <span className="font-mono">{c}</span>
              </div>
            ))}
          </div>
          {layersUnequal && (
            <p className="text-[10px] text-[#5C726C]">
              Cutting cubes out unevenly means the layers no longer match — this is exactly what happens with a shape that isn't a simple
              cuboid, like one with a corner or a hole cut out of it.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 text-xs text-[#8FA39D]">
            <div className="text-[#ECF2F0] mb-1">Compare: 3×3×3</div>
            27 cubes make a perfect cube ({cube27.x}×{cube27.y}×{cube27.z}).
          </div>
          <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 text-xs text-[#8FA39D]">
            <div className="text-[#ECF2F0] mb-1">Compare: 4×4×4</div>
            64 cubes make a perfect cube ({cube64.x}×{cube64.y}×{cube64.z}).
          </div>
        </div>
      </div>
    </div>
  );
}
