import { useMemo, useState } from "react";
import { MirrorType } from "../types";
import { thinElementImage, mirrorPrincipalRays } from "../optics";
import { SliderField, SegmentedField, ToggleField, StatGrid, EquationBox, MisconceptionTip, DataTable } from "../components/Controls";
import OpticalBench from "../components/OpticalBench";

function scenarioLabel(concave: boolean, objectDistance: number, fMag: number): string {
  if (!concave) return "Convex mirror: always virtual, upright, diminished, behind the mirror.";
  const twoF = 2 * fMag;
  if (Math.abs(objectDistance - fMag) < fMag * 0.02) return "Object at F: rays leave parallel — no image forms (image at infinity).";
  if (Math.abs(objectDistance - twoF) < fMag * 0.03) return "Object at C (2f): real, inverted, same-size image at C.";
  if (objectDistance > twoF) return "Object beyond C: real, inverted, diminished image between F and C.";
  if (objectDistance > fMag) return "Object between F and C: real, inverted, magnified image beyond C.";
  return "Object within F: virtual, upright, magnified image behind the mirror.";
}

export default function CurvedMirrorMode() {
  const [mirrorType, setMirrorType] = useState<MirrorType>("concave");
  const [fMag, setFMag] = useState(20);
  const [objectDistance, setObjectDistance] = useState(60);
  const [objectHeight, setObjectHeight] = useState(20);
  const [showGrid, setShowGrid] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showFocalPoints, setShowFocalPoints] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rayVisibility, setRayVisibility] = useState({ parallel: true, focal: true, central: true });

  const concave = mirrorType === "concave";
  const f = concave ? fMag : -fMag;
  const image = useMemo(() => thinElementImage(f, objectDistance, objectHeight), [f, objectDistance, objectHeight]);
  const rays = useMemo(() => mirrorPrincipalRays(concave, fMag, objectDistance, objectHeight, image), [concave, fMag, objectDistance, objectHeight, image]);
  const imageX = image.atInfinity ? (concave ? -1e6 : 1e6) : -image.imageDistance;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Mirror type"
          value={mirrorType}
          onChange={setMirrorType}
          options={[
            { value: "concave", label: "Concave" },
            { value: "convex", label: "Convex" },
          ]}
        />
        <SliderField label="Focal length |f|" unit=" cm" min={10} max={100} step={1} value={fMag} onChange={setFMag} />
        <SliderField label="Object distance (dₒ)" unit=" cm" min={1} max={200} step={1} value={objectDistance} onChange={setObjectDistance} />
        <SliderField label="Object height (hₒ)" unit=" cm" min={1} max={50} step={1} value={objectHeight} onChange={setObjectHeight} />
        <SliderField label="Zoom" unit="×" min={0.5} max={3} step={0.1} value={zoom} onChange={setZoom} />

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-0.5">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D] mb-1">Show</div>
          <ToggleField label="Parallel ray" checked={rayVisibility.parallel} onChange={(v) => setRayVisibility((r) => ({ ...r, parallel: v }))} />
          <ToggleField label="Focal ray" checked={rayVisibility.focal} onChange={(v) => setRayVisibility((r) => ({ ...r, focal: v }))} />
          <ToggleField label="Central ray" checked={rayVisibility.central} onChange={(v) => setRayVisibility((r) => ({ ...r, central: v }))} />
          <ToggleField label="Focal points / C" checked={showFocalPoints} onChange={setShowFocalPoints} />
          <ToggleField label="Labels" checked={showLabels} onChange={setShowLabels} />
          <ToggleField label="Grid" checked={showGrid} onChange={setShowGrid} />
        </div>

        <EquationBox
          lines={[
            `1/f = 1/dₒ + 1/dᵢ`,
            `1/${f} = 1/${objectDistance} + 1/dᵢ  →  dᵢ = ${image.atInfinity ? "∞" : image.imageDistance.toFixed(1)} cm`,
            `M = −dᵢ/dₒ = ${image.atInfinity ? "—" : image.magnification.toFixed(2)}`,
          ]}
        />
        <MisconceptionTip
          wrong="Concave mirrors always form real images."
          right="Concave mirrors form virtual images when the object is within the focal length (dₒ < f)."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <OpticalBench
            kind={concave ? "mirror-concave" : "mirror-convex"}
            fMag={fMag}
            objectDistance={objectDistance}
            objectHeight={objectHeight}
            image={image}
            imageX={imageX}
            rays={rays}
            rayVisibility={rayVisibility}
            showGrid={showGrid}
            showLabels={showLabels}
            showFocalPoints={showFocalPoints}
            zoom={zoom}
          />
        </div>

        <div className="rounded border border-dashed border-[#3A4B48] p-3 text-xs text-[#8FA39D]">
          {scenarioLabel(concave, objectDistance, fMag)}
        </div>

        <StatGrid
          stats={[
            { label: "Object dist. (dₒ)", value: `${objectDistance} cm` },
            { label: "Image dist. (dᵢ)", value: image.atInfinity ? "∞" : `${image.imageDistance.toFixed(1)} cm` },
            { label: "Focal length (f)", value: `${f} cm` },
            { label: "Object height (hₒ)", value: `${objectHeight} cm` },
            { label: "Image height (hᵢ)", value: image.atInfinity ? "—" : `${image.imageHeight.toFixed(1)} cm` },
            { label: "Magnification (M)", value: image.atInfinity ? "—" : image.magnification.toFixed(2) },
            { label: "Image type", value: image.atInfinity ? "—" : image.isReal ? "Real" : "Virtual" },
            { label: "Orientation", value: image.atInfinity ? "—" : image.isUpright ? "Upright" : "Inverted" },
            { label: "Size", value: image.atInfinity ? "—" : image.sizeLabel },
          ]}
        />

        <DataTable
          rows={[
            { param: "Object Distance", value: objectDistance.toFixed(1), unit: "cm" },
            { param: "Image Distance", value: image.atInfinity ? "∞" : image.imageDistance.toFixed(1), unit: "cm" },
            { param: "Focal Length", value: f.toFixed(1), unit: "cm" },
            { param: "Object Height", value: objectHeight.toFixed(1), unit: "cm" },
            { param: "Image Height", value: image.atInfinity ? "—" : image.imageHeight.toFixed(1), unit: "cm" },
            { param: "Magnification", value: image.atInfinity ? "—" : image.magnification.toFixed(2), unit: "—" },
          ]}
        />
      </div>
    </div>
  );
}
