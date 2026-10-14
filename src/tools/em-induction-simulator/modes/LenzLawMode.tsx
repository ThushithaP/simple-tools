import { useEffect, useRef, useState } from "react";
import { MagnetPole } from "../types";
import { faradayAtPosition } from "../physics";
import { SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import MagnetCoilDiagram from "../components/MagnetCoilDiagram";

const DOMAIN_M = 0.15;
const SPEED_MAP = { Slow: 0.03, Medium: 0.08, Fast: 0.18 };

export default function LenzLawMode() {
  const [pole, setPole] = useState<MagnetPole>("N");
  const [direction, setDirection] = useState<"Approaching" | "Receding">("Approaching");
  const [speedTier, setSpeedTier] = useState<keyof typeof SPEED_MAP>("Medium");
  const [showViolation, setShowViolation] = useState(false);

  const magnetXRef = useRef(direction === "Approaching" ? -DOMAIN_M : 0);
  const [magnetX, setMagnetX] = useState(magnetXRef.current);
  const [result, setResult] = useState(faradayAtPosition(magnetXRef.current, 0, 300, 0.5, 0.002, 5));

  useEffect(() => {
    magnetXRef.current = direction === "Approaching" ? -DOMAIN_M : 0;
  }, [direction]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    const speed = SPEED_MAP[speedTier];
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const velocity = direction === "Approaching" ? speed : -speed;
      let x = magnetXRef.current + velocity * dt;
      if (direction === "Approaching" && x > 0) x = -DOMAIN_M; // loop
      if (direction === "Receding" && x < -DOMAIN_M) x = 0; // loop
      magnetXRef.current = x;
      setMagnetX(x);

      const r = faradayAtPosition(x, velocity, 300, 0.5, 0.002, 5);
      setResult(r);

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [direction, speedTier]);

  const opposes = Math.abs(result.currentA) > 1e-6;
  const forceType = result.dPhiDt > 0 ? "Repulsive (opposes approach)" : result.dPhiDt < 0 ? "Attractive (opposes recession)" : "None";

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Leading pole"
          value={pole}
          onChange={setPole}
          options={[
            { value: "N", label: "North" },
            { value: "S", label: "South" },
          ]}
        />
        <SegmentedField
          label="Motion direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "Approaching", label: "Approaching" },
            { value: "Receding", label: "Receding" },
          ]}
        />
        <SegmentedField
          label="Speed"
          value={speedTier}
          onChange={setSpeedTier}
          options={[
            { value: "Slow", label: "Slow" },
            { value: "Medium", label: "Med" },
            { value: "Fast", label: "Fast" },
          ]}
        />

        <EquationBox lines={[`dΦ/dt = ${result.dPhiDt.toExponential(2)} Wb/s`, `Induced current opposes the change causing it`, `Force is always ${forceType.split(" ")[0].toLowerCase()}`]} />
        <MisconceptionTip
          wrong="Lenz's Law means induced current opposes the magnetic field."
          right="It opposes the CHANGE in flux — if flux is decreasing, the induced field actually reinforces the original field."
        />

        <button
          onClick={() => setShowViolation((v) => !v)}
          className="w-full rounded border border-dashed border-[#3A4B48] py-2 text-xs text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors"
        >
          {showViolation ? "Hide" : "What if Lenz's Law were violated?"}
        </button>
        {showViolation && (
          <div className="rounded border border-[#E8A33D] bg-[#E8A33D22] p-3 text-xs text-[#E8A33D]">
            If the induced current instead <em>reinforced</em> the change (attracted an approaching magnet), the
            magnet would accelerate faster, inducing even more current, accelerating it further — a runaway
            feedback loop generating unlimited energy from nothing. This is forbidden by conservation of energy,
            which is exactly why Lenz's Law (the minus sign in Faraday's Law) must hold.
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <MagnetCoilDiagram
            magnetXMeters={magnetX}
            domainMeters={DOMAIN_M}
            poleNearCoil={pole}
            currentA={result.currentA}
            dPhiDt={result.dPhiDt}
            showFieldLines
            showInducedPoles
            showGalvanometer={false}
          />
        </div>

        <StatGrid
          stats={[
            { label: "Current direction", value: opposes ? (result.currentA > 0 ? "Counterclockwise" : "Clockwise") : "None" },
            { label: "Induced pole (near magnet)", value: Math.abs(result.dPhiDt) < 1e-9 ? "None" : result.dPhiDt > 0 ? pole : pole === "N" ? "S" : "N" },
            { label: "Force on magnet", value: forceType },
            { label: "Magnet velocity", value: `${(direction === "Approaching" ? 1 : -1) * SPEED_MAP[speedTier]} m/s` },
            { label: "dΦ/dt", value: `${result.dPhiDt.toExponential(2)} Wb/s` },
            { label: "Opposes change?", value: opposes ? "Yes ✓" : "No current" },
          ]}
        />
      </div>
    </div>
  );
}
