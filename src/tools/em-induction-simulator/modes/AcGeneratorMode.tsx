import { useEffect, useMemo, useRef, useState } from "react";
import { acGenerator, rpmToOmega } from "../physics";
import { SliderField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import Chart from "../components/Chart";
import FullscreenPanel from "../../../components/FullscreenPanel";

export default function AcGeneratorMode() {
  const [bTesla, setBTesla] = useState(0.8);
  const [turns, setTurns] = useState(200);
  const [areaCm2, setAreaCm2] = useState(100);
  const [rpm, setRpm] = useState(600);
  const [loadOhm, setLoadOhm] = useState(100);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(0.1);

  const thetaRef = useRef(0);
  const [, forceRender] = useState(0);
  const historyRef = useRef<{ t: number; emf: number }[]>([]);
  const timeRef = useRef(0);

  const areaM2 = areaCm2 / 10000;
  const omega = rpmToOmega(rpm);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;
      if (running) {
        thetaRef.current += omega * dt;
        timeRef.current += dt;
        const r = acGenerator(turns, bTesla, areaM2, omega, thetaRef.current, loadOhm);
        historyRef.current.push({ t: timeRef.current, emf: r.emfInstantV });
        const windowS = Math.max(0.05, 4 / Math.max(1, omega / 20));
        historyRef.current = historyRef.current.filter((p) => p.t > timeRef.current - Math.max(0.5, windowS));
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, omega, turns, bTesla, areaM2, loadOhm]);

  const result = useMemo(() => acGenerator(turns, bTesla, areaM2, omega, thetaRef.current, loadOhm), [turns, bTesla, areaM2, omega, loadOhm, thetaRef.current]);

  function reset() {
    thetaRef.current = 0;
    timeRef.current = 0;
    historyRef.current = [];
  }

  const windowNow = timeRef.current;
  const windowS = Math.max(0.5, 4 / Math.max(1, omega / 20));
  const emfPoints = historyRef.current.map((p) => ({ x: p.t - Math.max(0, windowNow - windowS), y: p.emf }));

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SliderField label="Field strength (B)" unit=" T" min={0.1} max={2.0} step={0.05} value={bTesla} onChange={setBTesla} />
        <SliderField label="Coil turns (N)" unit="" min={10} max={500} step={10} value={turns} onChange={setTurns} />
        <SliderField label="Coil area (A)" unit=" cm²" min={10} max={500} step={10} value={areaCm2} onChange={setAreaCm2} />
        <SliderField label="Rotation speed" unit=" rpm" min={10} max={3000} step={10} value={rpm} onChange={setRpm} />
        <SliderField label="Load resistance" unit=" Ω" min={1} max={1000} step={1} value={loadOhm} onChange={setLoadOhm} />
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />

        <EquationBox
          lines={[
            `ε₀ = NBAω = ${result.peakEmfV.toFixed(2)} V`,
            `ε(t) = ε₀sin(ωt) = ${result.emfInstantV.toFixed(2)} V`,
            `f = ω/2π = ${result.frequencyHz.toFixed(1)} Hz`,
          ]}
        />
        <MisconceptionTip wrong="AC generator produces DC if you spin it fast enough." right="An AC generator with slip rings always produces alternating current — a commutator is needed for DC." />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <RotatingCoil thetaRad={thetaRef.current} />
        </FullscreenPanel>
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Oscilloscope — output EMF</div>
          <Chart series={[{ points: emfPoints, color: "#4A90E2" }]} xLabel="t (s)" yLabel="V" xMax={windowS} yMin={-result.peakEmfV * 1.15} yMax={result.peakEmfV * 1.15} />
        </div>

        <StatGrid
          stats={[
            { label: "Coil angle (θ)", value: `${((thetaRef.current * 180) / Math.PI) % 360 | 0}°` },
            { label: "Flux (Φ)", value: `${result.fluxWb.toExponential(2)} Wb` },
            { label: "EMF now", value: `${result.emfInstantV.toFixed(2)} V` },
            { label: "Peak EMF", value: `${result.peakEmfV.toFixed(2)} V` },
            { label: "RMS voltage", value: `${result.rmsV.toFixed(2)} V` },
            { label: "Frequency", value: `${result.frequencyHz.toFixed(1)} Hz` },
            { label: "RMS current", value: `${(result.rmsA * 1000).toFixed(1)} mA` },
            { label: "Output power", value: `${result.powerW.toFixed(2)} W` },
          ]}
        />
      </div>
    </div>
  );
}

function RotatingCoil({ thetaRad }: { thetaRad: number }) {
  const W = 360;
  const H = 260;
  const cx = W / 2;
  const cy = H / 2;
  const halfW = 70;
  const cosT = Math.cos(thetaRad);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Rotating coil AC generator">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {/* poles */}
      <rect x={20} y={cy - 50} width={40} height={100} fill="#E85A4A44" stroke="#E85A4A" strokeWidth={1.5} />
      <text x={30} y={cy + 5} fontSize="16" fill="#E85A4A">
        N
      </text>
      <rect x={W - 60} y={cy - 50} width={40} height={100} fill="#4A90E244" stroke="#4A90E2" strokeWidth={1.5} />
      <text x={W - 48} y={cy + 5} fontSize="16" fill="#4A90E2">
        S
      </text>

      {/* coil, foreshortened by cos(theta) to suggest rotation */}
      <rect x={cx - halfW * Math.abs(cosT) - 4} y={cy - 40} width={halfW * 2 * Math.abs(cosT) + 8} height={80} fill="none" stroke="#B5652A" strokeWidth={3} />
      <line x1={cx} y1={cy - 40} x2={cx} y2={cy + 40} stroke="#B5652A" strokeWidth={1} opacity={0.5} />

      {/* slip rings */}
      <circle cx={cx - 90} cy={cy} r={6} fill="#C9A227" />
      <circle cx={cx + 90} cy={cy} r={6} fill="#C9A227" />
      <text x={cx - 20} y={20} fontSize="9" fill="#8FA39D">
        Slip rings + brushes → AC output
      </text>
    </svg>
  );
}
