import { useEffect, useMemo, useRef, useState } from "react";
import { MotionType } from "../types";
import { faradayAtPosition, acGenerator } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import Chart from "../components/Chart";

const DOMAIN_M = 0.15;

export default function FactorsMode() {
  const [speed, setSpeed] = useState(2); // m/s (linear) or rad/s (rotational, simplified mapping)
  const [bTesla, setBTesla] = useState(0.5);
  const [turns, setTurns] = useState(200);
  const [areaCm2, setAreaCm2] = useState(20);
  const [angleDeg, setAngleDeg] = useState(0);
  const [motionType, setMotionType] = useState<MotionType>("linear");

  const timeRef = useRef(0);
  const historyRef = useRef<{ t: number; phi: number; emf: number }[]>([]);
  const [, forceRender] = useState(0);
  const peakRef = useRef(0);

  const areaM2 = areaCm2 / 10000;
  const resistanceOhm = 5;

  useEffect(() => {
    historyRef.current = [];
    peakRef.current = 0;
    timeRef.current = 0;
  }, [motionType]);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      timeRef.current += dt;

      let phi: number;
      let emf: number;
      if (motionType === "linear") {
        const period = (2 * DOMAIN_M) / Math.max(speed, 0.01);
        const phase = (timeRef.current % (2 * period)) / period; // 0..2, triangle wave position
        const x = phase < 1 ? -DOMAIN_M + phase * 2 * DOMAIN_M : DOMAIN_M - (phase - 1) * 2 * DOMAIN_M;
        const velocity = phase < 1 ? speed : -speed;
        const r = faradayAtPosition(x, velocity, turns, bTesla, areaM2 * Math.cos((angleDeg * Math.PI) / 180), resistanceOhm);
        phi = r.fluxWb;
        emf = r.emfV;
      } else {
        const omega = speed; // simplified: reuse the same slider as angular velocity for rotational demonstration
        const theta = omega * timeRef.current;
        const r = acGenerator(turns, bTesla, areaM2, omega, theta, resistanceOhm);
        phi = r.fluxWb;
        emf = r.emfInstantV;
      }

      peakRef.current = Math.max(peakRef.current, Math.abs(emf));
      historyRef.current.push({ t: timeRef.current, phi, emf });
      const windowS = 6;
      historyRef.current = historyRef.current.filter((p) => p.t > timeRef.current - windowS);

      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speed, bTesla, turns, areaM2, angleDeg, motionType]);

  const latest = historyRef.current[historyRef.current.length - 1] ?? { phi: 0, emf: 0 };
  const avgAbsEmf = useMemo(() => {
    const h = historyRef.current;
    if (!h.length) return 0;
    return h.reduce((s, p) => s + Math.abs(p.emf), 0) / h.length;
  }, [latest]);

  const windowNow = timeRef.current;
  const fluxPoints = historyRef.current.map((p) => ({ x: p.t - Math.max(0, windowNow - 6), y: p.phi }));
  const emfPoints = historyRef.current.map((p) => ({ x: p.t - Math.max(0, windowNow - 6), y: p.emf }));
  const maxPhi = Math.max(1e-6, bTesla * areaM2);
  const maxEmf = Math.max(0.01, peakRef.current * 1.2);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Motion type"
          value={motionType}
          onChange={setMotionType}
          options={[
            { value: "linear", label: "Linear (in/out)" },
            { value: "rotational", label: "Rotational" },
          ]}
        />
        <SliderField label={motionType === "linear" ? "Magnet speed" : "Angular speed (ω)"} unit={motionType === "linear" ? " m/s" : " rad/s"} min={0.1} max={10} step={0.1} value={speed} onChange={setSpeed} />
        <SliderField label="Magnet strength (B)" unit=" T" min={0.1} max={2.0} step={0.05} value={bTesla} onChange={setBTesla} />
        <SliderField label="Coil turns (N)" unit="" min={10} max={1000} step={10} value={turns} onChange={setTurns} />
        <SliderField label="Coil area (A)" unit=" cm²" min={1} max={100} step={1} value={areaCm2} onChange={setAreaCm2} />
        {motionType === "linear" && <SliderField label="Angle (θ)" unit="°" min={0} max={90} step={1} value={angleDeg} onChange={setAngleDeg} />}

        <EquationBox lines={[`Φ = B·A·cosθ`, `ε = −N·dΦ/dt`, `Peak so far: ${peakRef.current.toFixed(3)} V`]} />
        <MisconceptionTip
          wrong="Induced EMF depends on the magnetic flux itself."
          right="EMF depends on the rate of change of flux (dΦ/dt) — a large but constant flux gives zero EMF."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Flux Φ(t)</div>
          <Chart series={[{ points: fluxPoints, color: "#4A90E2" }]} xLabel="t (s)" yLabel="Wb" xMax={6} yMin={-maxPhi * 1.1} yMax={maxPhi * 1.1} />
        </div>
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Induced EMF ε(t)</div>
          <Chart series={[{ points: emfPoints, color: "#5FC7B8" }]} xLabel="t (s)" yLabel="V" xMax={6} yMin={-maxEmf} yMax={maxEmf} />
        </div>

        <StatGrid
          stats={[
            { label: "Flux (Φ)", value: `${latest.phi.toExponential(2)} Wb` },
            { label: "EMF (ε)", value: `${latest.emf.toFixed(3)} V` },
            { label: "Peak EMF", value: `${peakRef.current.toFixed(3)} V` },
            { label: "Average |EMF|", value: `${avgAbsEmf.toFixed(3)} V` },
            { label: "Flux linkage (NΦ)", value: `${(turns * latest.phi).toExponential(2)} Wb-turns` },
            { label: "Current", value: `${((latest.emf / resistanceOhm) * 1000).toFixed(2)} mA` },
          ]}
        />
      </div>
    </div>
  );
}
