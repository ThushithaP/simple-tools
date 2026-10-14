import { useMemo, useState } from "react";
import { LengthUnit, RenderMode, ShapeDimensions, ShapeKind } from "../types";
import { computeShapeInfo, DEFAULT_DIMENSIONS, SHAPE_DIMENSION_FIELDS, SHAPE_LABELS } from "../geometry";
import { FaceGroup } from "../geometryBuilders";
import { SliderField, SelectField, SegmentedField, StatGrid, ColorPicker, InfoBox } from "../components/Controls";
import ShapeScene from "../components/ShapeScene";

const SHAPE_KEYS = Object.keys(SHAPE_LABELS) as ShapeKind[];

export default function ShapeExplorerMode() {
  const [shapeKind, setShapeKind] = useState<ShapeKind>("cube");
  const [dimensions, setDimensions] = useState<ShapeDimensions>(DEFAULT_DIMENSIONS.cube);
  const [unit, setUnit] = useState<LengthUnit>("cm");
  const [renderMode, setRenderMode] = useState<RenderMode>("solid");
  const [baseColor, setBaseColor] = useState("#5FC7B8");
  const [faceColors, setFaceColors] = useState<Record<string, string>>({});
  const [selectedFace, setSelectedFace] = useState<FaceGroup | null>(null);
  const [showAxes, setShowAxes] = useState(true);

  function changeShape(kind: ShapeKind) {
    setShapeKind(kind);
    setDimensions(DEFAULT_DIMENSIONS[kind]);
    setFaceColors({});
    setSelectedFace(null);
  }

  function setDim(key: keyof ShapeDimensions, value: number) {
    setDimensions((d) => ({ ...d, [key]: value }));
  }

  const info = useMemo(() => computeShapeInfo(shapeKind, dimensions), [shapeKind, dimensions]);
  const dimensionFields = SHAPE_DIMENSION_FIELDS[shapeKind];

  function recolorSelectedFace(color: string) {
    if (!selectedFace) return;
    setFaceColors((c) => ({ ...c, [selectedFace.id]: color }));
  }

  function resetColors() {
    setFaceColors({});
    setBaseColor("#5FC7B8");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SelectField label="Shape" value={shapeKind} onChange={changeShape} options={SHAPE_KEYS.map((k) => ({ value: k, label: SHAPE_LABELS[k] }))} />

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Dimensions</div>
          {dimensionFields.map((f) => (
            <SliderField
              key={f.key}
              label={`${f.label} (${unit})`}
              unit=""
              min={0.2}
              max={5}
              step={0.1}
              value={dimensions[f.key] ?? 1}
              onChange={(v) => setDim(f.key, v)}
            />
          ))}
          <SegmentedField
            label="Units"
            value={unit}
            onChange={setUnit}
            options={[
              { value: "mm", label: "mm" },
              { value: "cm", label: "cm" },
              { value: "m", label: "m" },
            ]}
          />
        </div>

        <SegmentedField
          label="View mode"
          value={renderMode}
          onChange={setRenderMode}
          options={[
            { value: "solid", label: "Solid" },
            { value: "wireframe", label: "Wire" },
            { value: "transparent", label: "See-through" },
          ]}
        />
        <button
          onClick={() => setShowAxes((a) => !a)}
          className="w-full rounded border border-[#2A3A37] bg-[#0F1614] py-2 text-xs text-[#8FA39D] hover:border-[#5FC7B8] transition-colors min-h-[44px]"
        >
          {showAxes ? "Hide" : "Show"} axes
        </button>

        <ColorPicker
          label={selectedFace ? `Color: ${selectedFace.name}` : "Whole shape color"}
          value={selectedFace ? faceColors[selectedFace.id] ?? baseColor : baseColor}
          onChange={selectedFace ? recolorSelectedFace : setBaseColor}
        />
        <button onClick={resetColors} className="w-full rounded border border-dashed border-[#3A4B48] py-2 text-xs text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors">
          Reset colors
        </button>
      </div>

      <div className="space-y-6">
        <ShapeScene
          shapeKind={shapeKind}
          dimensions={dimensions}
          renderMode={renderMode}
          baseColor={baseColor}
          faceColors={faceColors}
          selectedFaceId={selectedFace?.id ?? null}
          onSelectFace={setSelectedFace}
          showEdges
          showAxes={showAxes}
        />
        <div className="text-center text-[10px] text-[#5C726C]">Drag to rotate • scroll to zoom • click a face to select and recolor it</div>

        {selectedFace && (
          <InfoBox>
            <span className="text-[#ECF2F0] font-medium">{selectedFace.name}</span> — area ≈ {selectedFace.area.toFixed(2)} {unit}²
          </InfoBox>
        )}

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4 space-y-3">
          <div className="text-sm font-medium text-[#ECF2F0]">{info.name}</div>
          <p className="text-xs text-[#8FA39D] leading-relaxed">{info.explanation}</p>
          <StatGrid
            stats={[
              { label: "Faces", value: `${info.faces}` },
              { label: "Edges", value: `${info.edges}` },
              { label: "Vertices", value: `${info.vertices}` },
              { label: "Surface area", value: `${info.surfaceArea.toFixed(2)} ${unit}²` },
              { label: "Volume", value: `${info.volume.toFixed(2)} ${unit}³` },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
