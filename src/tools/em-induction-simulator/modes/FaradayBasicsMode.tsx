import { useEffect, useMemo, useRef, useState } from "react";
import { faradayAtPosition } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import MagnetCoilDiagram from "../components/MagnetCoilDiagram";

type MotionMode = "manual" | "auto" | "single";
type LoadType = "Galvanometer" | "Bulb" | "Voltmeter" | "Ammeter";

const DOMAIN_M = 0.15;

export default function FaradayBasicsMode() {
  const [bTesla, setBTesla] = useState(0.5);
  const [turns, setTurns] = useState(200);
  const [areaCm2, setAreaCm2] = useState(20);
  const [resistanceOhm, setResistanceOhm] = useState(5);
  const [loadType, setLoadType] = useState<LoadType>("Galvanometer");
  const [motionMode, setMotionMode] = useState<MotionMode>("manual");
  const [magnetX, setMagnetX] = useState(-0.1);

  const magnetXRef = useRef(magnetX);
  const velocityRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const singlePassStartRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const areaM2 = areaCm2 / 10000;

  useEffect(() => {
    magnetXRef.current = magnetX;
  }, [magnetX]);

  useEffect(() => {
    let raf: number;
    function frame(ts: number) {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      if (motionMode === "auto") {
        phaseRef.current += dt * 2 * Math.PI * 0.25; // 0.25 Hz oscillation
        const x = DOMAIN_M * Math.sin(phaseRef.current);
        velocityRef.current = DOMAIN_M * 2 * Math.PI * 0.25 * Math.cos(phaseRef.current);
        magnetXRef.current = x;
        setMagnetX(x);
      } else if (motionMode === "single") {
        if (singlePassStartRef.current === null) singlePassStartRef.current = ts;
        const elapsed = (ts - singlePassStartRef.current) / 1000;
        const duration = 3;
        if (elapsed < duration) {
          const x = -DOMAIN_M + (elapsed / duration) * 2 * DOMAIN_M;
          velocityRef.current = (2 * DOMAIN_M) / duration;
          magnetXRef.current = x;
          setMagnetX(x);
        } else {
          velocityRef.current = 0;
        }
      } else {
        // manual: velocity from finite difference of slider-driven position
        const prevX = magnetXRef.current;
        const currentSliderX = magnetX;
        velocityRef.current = dt > 0 ? (currentSliderX - prevX) / dt : 0;
        magnetXRef.current = currentSliderX;
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionMode, magnetX]);

  useEffect(() => {
    if (motionMode === "single") singlePassStartRef.current = null;
  }, [motionMode]);

  const result = useMemo(
    () => faradayAtPosition(magnetXRef.current, velocityRef.current, turns, bTesla, areaM2, resistanceOhm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [magnetXRef.current, velocityRef.current, turns, bTesla, areaM2, resistanceOhm]
  );

  const brightness = Math.min(1, Math.abs(result.currentA) * 3);
  const stationary = Math.abs(velocityRef.current) < 0.001;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Magnet strength (B)" unit=" T" min={0.1} max={2.0} step={0.05} value={bTesla} onChange={setBTesla} />
        <SliderField label="Coil turns (N)" unit="" min={10} max={1000} step={10} value={turns} onChange={setTurns} />
        <SliderField label="Coil area (A)" unit=" cm²" min={1} max={100} step={1} value={areaCm2} onChange={setAreaCm2} />
        <SliderField label="Coil resistance (R)" unit=" Ω" min={0.1} max={100} step={0.1} value={resistanceOhm} onChange={setResistanceOhm} />
        <SegmentedField
          label="Load"
          value={loadType}
          onChange={setLoadType}
          options={[
            { value: "Galvanometer", label: "Galv." },
            { value: "Bulb", label: "Bulb" },
            { value: "Voltmeter", label: "Volt." },
            { value: "Ammeter", label: "Amp." },
          ]}
        />
        <SegmentedField
          label="Magnet motion"
          value={motionMode}
          onChange={setMotionMode}
          options={[
            { value: "manual", label: "Drag" },
            { value: "auto", label: "Auto" },
            { value: "single", label: "Single" },
          ]}
        />
        {motionMode === "manual" && (
          <SliderField label="Magnet position" unit=" m" min={-DOMAIN_M} max={DOMAIN_M} step={0.002} value={magnetX} onChange={setMagnetX} />
        )}

        <EquationBox
          lines={[
            `Φ = B·A·cosθ = ${result.fluxWb.toExponential(2)} Wb`,
            `ε = −N·dΦ/dt = ${result.emfV.toFixed(3)} V`,
            `I = ε/R = ${(result.currentA * 1000).toFixed(2)} mA`,
          ]}
        />
        <MisconceptionTip
          wrong="A stationary magnet inside a coil produces constant EMF."
          right="EMF is induced only while flux is changing — a stationary magnet gives dΦ/dt = 0, so ε = 0."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <MagnetCoilDiagram
            magnetXMeters={magnetXRef.current}
            domainMeters={DOMAIN_M}
            poleNearCoil="N"
            currentA={result.currentA}
            dPhiDt={result.dPhiDt}
            showFieldLines
            showInducedPoles
            showGalvanometer={loadType === "Galvanometer"}
            turnsVisual={Math.min(8, Math.max(3, Math.round(turns / 150)))}
          />
          {loadType === "Bulb" && (
            <div className="mt-2 flex justify-center">
              <div
                className="h-8 w-8 rounded-full"
                style={{ background: `radial-gradient(circle, rgba(232,163,61,${0.2 + brightness * 0.8}) 0%, transparent 70%)`, border: "1px solid #E8A33D" }}
              />
            </div>
          )}
          {stationary && <div className="mt-2 text-center text-[10px] text-[#5C726C]">Magnet stationary — no EMF, no current.</div>}
        </div>

        <StatGrid
          stats={[
            { label: "Flux (Φ)", value: `${result.fluxWb.toExponential(2)} Wb` },
            { label: "Induced EMF", value: `${result.emfV.toFixed(3)} V` },
            { label: "Current", value: `${(result.currentA * 1000).toFixed(2)} mA` },
            { label: "Velocity", value: `${velocityRef.current.toFixed(3)} m/s` },
            { label: "Galvanometer", value: stationary ? "Zero" : result.currentA > 0 ? "Right" : "Left" },
            { label: "Brightness", value: loadType === "Bulb" ? (brightness > 0.6 ? "Bright" : brightness > 0.1 ? "Dim" : "Off") : "—", muted: loadType !== "Bulb" },
          ]}
        />
      </div>
    </div>
  );
}
