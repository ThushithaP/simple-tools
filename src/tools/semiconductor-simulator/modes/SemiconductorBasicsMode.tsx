import { useEffect, useMemo, useRef, useState } from "react";
import { DopingType, Material } from "../types";
import { BAND_GAP_EV, carrierConcentrations, fermiLevelOffsetEv } from "../physics";
import { SliderField, SegmentedField, SelectField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

const CANVAS_W = 720;
const CANVAS_H = 260;
const LATTICE_COLS = 10;
const LATTICE_ROWS = 5;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "electron" | "hole";
}

export default function SemiconductorBasicsMode() {
  const [material, setMaterial] = useState<Material>("silicon");
  const [tempK, setTempK] = useState(300);
  const [dopingType, setDopingType] = useState<DopingType>("none");
  const [dopingExp, setDopingExp] = useState(16); // 10^dopingExp cm^-3
  const [dopant, setDopant] = useState("Phosphorus");

  const dopingConc = Math.pow(10, dopingExp);
  const carriers = useMemo(() => carrierConcentrations(material, dopingType, dopingConc), [material, dopingType, dopingConc]);
  const fermiOffset = useMemo(
    () => fermiLevelOffsetEv(carriers.electronConc, carriers.intrinsicConc, tempK),
    [carriers, tempK]
  );
  const eg = BAND_GAP_EV[material];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  // dopant options depend on doping type
  const dopantOptions = dopingType === "n-type" ? ["Phosphorus", "Arsenic", "Antimony"] : ["Boron", "Aluminum", "Gallium"];

  useEffect(() => {
    if (dopingType === "n-type" && !["Phosphorus", "Arsenic", "Antimony"].includes(dopant)) setDopant("Phosphorus");
    if (dopingType === "p-type" && !["Boron", "Aluminum", "Gallium"].includes(dopant)) setDopant("Boron");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dopingType]);

  // seed particle count qualitatively from log(concentration), capped for rendering sanity
  useEffect(() => {
    const nCount = Math.max(2, Math.min(24, Math.round(2 + Math.log10(Math.max(carriers.electronConc, 1)) - 10)));
    const pCount = Math.max(2, Math.min(24, Math.round(2 + Math.log10(Math.max(carriers.holeConc, 1)) - 10)));
    const particles: Particle[] = [];
    for (let i = 0; i < nCount; i++) {
      particles.push({ x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, kind: "electron" });
    }
    for (let i = 0; i < pCount; i++) {
      particles.push({ x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H, vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8, kind: "hole" });
    }
    particlesRef.current = particles;
  }, [carriers]);

  useEffect(() => {
    let raf: number;
    function frame() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#0D1412";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // lattice grid of atoms
        const cellW = CANVAS_W / (LATTICE_COLS + 1);
        const cellH = CANVAS_H / (LATTICE_ROWS + 1);
        for (let r = 1; r <= LATTICE_ROWS; r++) {
          for (let c = 1; c <= LATTICE_COLS; c++) {
            const isDopant = dopingType !== "none" && (r * 7 + c * 13) % 23 === 0;
            ctx.beginPath();
            ctx.arc(c * cellW, r * cellH, isDopant ? 6 : 4.5, 0, Math.PI * 2);
            ctx.fillStyle = isDopant ? (dopingType === "n-type" ? "#6FCF7A" : "#E85A4A") : "#4A5A57";
            ctx.fill();
            if (r < LATTICE_ROWS) ctx.strokeStyle = "#1E2B29";
          }
        }

        // free carriers, random walk
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > CANVAS_W) p.vx *= -1;
          if (p.y < 0 || p.y > CANVAS_H) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = p.kind === "electron" ? "#4A90E2" : "#E85A4A";
          ctx.fill();
          ctx.fillStyle = "#0D1412";
          ctx.font = "8px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(p.kind === "electron" ? "-" : "+", p.x, p.y + 3);
        });
        ctx.textAlign = "left";
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [dopingType]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Material"
          value={material}
          onChange={setMaterial}
          options={[
            { value: "silicon", label: "Silicon" },
            { value: "germanium", label: "Germanium" },
          ]}
        />
        <SliderField label="Temperature" unit=" K" min={100} max={500} step={5} value={tempK} onChange={setTempK} />
        <SegmentedField
          label="Doping type"
          value={dopingType}
          onChange={setDopingType}
          options={[
            { value: "none", label: "None" },
            { value: "n-type", label: "n-type" },
            { value: "p-type", label: "p-type" },
          ]}
        />
        {dopingType !== "none" && (
          <>
            <SliderField
              label="Doping concentration"
              unit=" (10ˣ cm⁻³)"
              min={14}
              max={18}
              step={0.1}
              value={dopingExp}
              onChange={setDopingExp}
            />
            <SelectField
              label="Dopant element"
              value={dopant}
              onChange={setDopant}
              options={dopantOptions.map((d) => ({ value: d, label: d }))}
            />
          </>
        )}

        <EquationBox
          lines={[
            `n × p = nᵢ² = (${carriers.intrinsicConc.toExponential(2)})²`,
            `n = ${carriers.electronConc.toExponential(3)} cm⁻³`,
            `p = ${carriers.holeConc.toExponential(3)} cm⁻³`,
          ]}
        />
        <MisconceptionTip
          wrong="n-type semiconductor has negative charge overall."
          right="n-type is electrically neutral — more free electrons than holes, but total charge balances with the donor ions."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full h-auto rounded" />
          <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-[#8FA39D] justify-center">
            <span>⚪ Si/Ge atom</span>
            <span className="text-[#6FCF7A]">● donor ion (n-type)</span>
            <span className="text-[#E85A4A]">● acceptor ion (p-type)</span>
            <span className="text-[#4A90E2]">● electron</span>
            <span className="text-[#E85A4A]">● hole</span>
          </div>
        </div>

        {/* energy band diagram */}
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-[#8FA39D]">Energy Band Diagram</div>
          <BandDiagram eg={eg} fermiOffset={fermiOffset} />
        </div>

        <StatGrid
          stats={[
            { label: "Band gap (Eg)", value: `${eg.toFixed(2)} eV` },
            { label: "Electron conc. (n)", value: `${carriers.electronConc.toExponential(2)} cm⁻³` },
            { label: "Hole conc. (p)", value: `${carriers.holeConc.toExponential(2)} cm⁻³` },
            { label: "Intrinsic conc. (nᵢ)", value: `${carriers.intrinsicConc.toExponential(2)} cm⁻³` },
            { label: "Fermi level (Eᶠ−Eᵢ)", value: `${fermiOffset >= 0 ? "+" : ""}${fermiOffset.toFixed(3)} eV` },
            { label: "Conductivity", value: carriers.conductivityLabel },
          ]}
        />
      </div>
    </div>
  );
}

function BandDiagram({ eg, fermiOffset }: { eg: number; fermiOffset: number }) {
  const W = 480;
  const H = 140;
  const midY = H / 2;
  const gapPx = Math.min(90, eg * 60);
  const ecY = midY - gapPx / 2;
  const evY = midY + gapPx / 2;
  const clampedOffset = Math.max(-eg / 2 + 0.05, Math.min(eg / 2 - 0.05, fermiOffset));
  const efY = midY - (clampedOffset / (eg / 2)) * (gapPx / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Energy band diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={40} y={ecY} width={W - 80} height={evY - ecY} fill="#1A2422" opacity={0.6} />
      <line x1={40} x2={W - 40} y1={ecY} y2={ecY} stroke="#4A90E2" strokeWidth={2.5} />
      <text x={W - 38} y={ecY + 4} fontSize="10" fill="#4A90E2">
        Ec
      </text>
      <line x1={40} x2={W - 40} y1={evY} y2={evY} stroke="#E85A4A" strokeWidth={2.5} />
      <text x={W - 38} y={evY + 4} fontSize="10" fill="#E85A4A">
        Ev
      </text>
      <line x1={40} x2={W - 40} y1={efY} y2={efY} stroke="#ECF2F0" strokeWidth={1.4} strokeDasharray="5 3" />
      <text x={W - 38} y={efY + 4} fontSize="10" fill="#ECF2F0">
        Ef
      </text>
      <text x={44} y={midY - gapPx / 2 - 8} fontSize="9" fill="#8FA39D">
        Conduction Band
      </text>
      <text x={44} y={midY + gapPx / 2 + 16} fontSize="9" fill="#8FA39D">
        Valence Band
      </text>
      <text x={W / 2 - 18} y={midY} fontSize="9" fill="#5C726C">
        Eg = {eg.toFixed(2)} eV
      </text>
    </svg>
  );
}
