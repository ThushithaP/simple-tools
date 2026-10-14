import { useEffect, useMemo, useRef, useState } from "react";
import { GeneratorMotorMode } from "../types";
import { DC_AVERAGE_FACTOR, motorStep, rpmToOmega } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip, PlaybackControls } from "../components/Controls";
import Chart from "../components/Chart";

const MOTOR_TURNS = 100;
const MOTOR_AREA_M2 = 0.005;
const MOTOR_MOMENT_OF_INERTIA = 0.02;

export default function DcGeneratorMotorMode() {
  const [mode, setMode] = useState<GeneratorMotorMode>("generator");

  // generator controls
  const [genB, setGenB] = useState(0.8);
  const [genRpm, setGenRpm] = useState(600);
  const [segments, setSegments] = useState<"2" | "multiple">("2");

  // motor controls
  const [supplyV, setSupplyV] = useState(12);
  const [motorB, setMotorB] = useState(0.5);
  const [loadTorquePct, setLoadTorquePct] = useState(0);
  const armatureR = 4;

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const thetaRef = useRef(0);
  const omegaMotorRef = useRef(0);
  const [, forceRender] = useState(0);
  const historyRef = useRef<{ t: number; v: number }[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    let raf: number;
    let lastTs: number | null = null;
    function frame(ts: number) {
      if (lastTs === null) lastTs = ts;
      const dt = Math.min(0.05, (ts - lastTs) / 1000) * speed;
      lastTs = ts;

      if (running) {
        timeRef.current += dt;
        if (mode === "generator") {
          const omega = rpmToOmega(genRpm);
          thetaRef.current += omega * dt;
          const peak = MOTOR_TURNS * genB * MOTOR_AREA_M2 * omega;
          let v = Math.abs(peak * Math.sin(thetaRef.current));
          if (segments === "multiple") {
            const v2 = Math.abs(peak * Math.sin(thetaRef.current + Math.PI / 4));
            const v3 = Math.abs(peak * Math.sin(thetaRef.current + Math.PI / 2));
            const v4 = Math.abs(peak * Math.sin(thetaRef.current + (3 * Math.PI) / 4));
            v = Math.max(v, v2, v3, v4);
          }
          historyRef.current.push({ t: timeRef.current, v });
        } else {
          const st = motorStep(omegaMotorRef.current, supplyV, MOTOR_TURNS, motorB, MOTOR_AREA_M2, armatureR, loadTorquePct / 100, MOTOR_MOMENT_OF_INERTIA, dt);
          omegaMotorRef.current = st.omegaRadPerS;
          thetaRef.current += st.omegaRadPerS * dt;
          historyRef.current.push({ t: timeRef.current, v: st.omegaRadPerS });
        }
        const windowS = 3;
        historyRef.current = historyRef.current.filter((p) => p.t > timeRef.current - windowS);
      }
      forceRender((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running, speed, mode, genB, genRpm, segments, supplyV, motorB, loadTorquePct]);

  function reset() {
    thetaRef.current = 0;
    omegaMotorRef.current = 0;
    timeRef.current = 0;
    historyRef.current = [];
  }

  const genOmega = rpmToOmega(genRpm);
  const genPeak = MOTOR_TURNS * genB * MOTOR_AREA_M2 * genOmega;
  const genAvg = genPeak * DC_AVERAGE_FACTOR * (segments === "multiple" ? 1.25 : 1);
  const genRipple = segments === "multiple" ? (genPeak * 0.15) / genAvg : (genPeak - 0) / genAvg;

  const motorState = useMemo(
    () => motorStep(omegaMotorRef.current, supplyV, MOTOR_TURNS, motorB, MOTOR_AREA_M2, armatureR, loadTorquePct / 100, MOTOR_MOMENT_OF_INERTIA, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supplyV, motorB, loadTorquePct, omegaMotorRef.current]
  );
  const mechPowerW = motorState.torqueNm * omegaMotorRef.current;
  const elecPowerW = supplyV * motorState.currentA;
  const motorEfficiency = elecPowerW > 0 ? Math.min(100, (mechPowerW / elecPowerW) * 100) : 0;

  const windowNow = timeRef.current;
  const chartPoints = historyRef.current.map((p) => ({ x: p.t - Math.max(0, windowNow - 3), y: p.v }));
  const chartMax = mode === "generator" ? Math.max(0.1, genPeak * 1.15) : Math.max(1, omegaMotorRef.current * 1.3);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v);
            reset();
          }}
          options={[
            { value: "generator", label: "Generator" },
            { value: "motor", label: "Motor" },
          ]}
        />

        {mode === "generator" ? (
          <>
            <SliderField label="Field strength (B)" unit=" T" min={0.1} max={2.0} step={0.05} value={genB} onChange={setGenB} />
            <SliderField label="Rotation speed" unit=" rpm" min={10} max={3000} step={10} value={genRpm} onChange={setGenRpm} />
            <SegmentedField
              label="Commutator segments"
              value={segments}
              onChange={setSegments}
              options={[
                { value: "2", label: "2 (simple)" },
                { value: "multiple", label: "Multiple" },
              ]}
            />
            <EquationBox lines={[`V_avg = (2/π)V_peak = ${genAvg.toFixed(2)} V`, `Ripple factor = ${genRipple.toFixed(2)}`, `Commutator reverses connection every half-turn`]} />
          </>
        ) : (
          <>
            <SliderField label="Supply voltage" unit=" V" min={1} max={24} step={0.5} value={supplyV} onChange={setSupplyV} />
            <SliderField label="Field strength (B)" unit=" T" min={0.1} max={2.0} step={0.05} value={motorB} onChange={setMotorB} />
            <SliderField label="Load torque" unit="%" min={0} max={100} step={5} value={loadTorquePct} onChange={setLoadTorquePct} />
            <EquationBox
              lines={[
                `ε_back = NBAω = ${motorState.backEmfV.toFixed(2)} V`,
                `V_net = V_supply − ε_back = ${motorState.netVoltageV.toFixed(2)} V`,
                `I = V_net/R = ${motorState.currentA.toFixed(2)} A`,
              ]}
            />
          </>
        )}
        <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />
        <MisconceptionTip
          wrong="A motor draws constant current regardless of speed."
          right="Current depends on back-EMF, which grows with speed — startup current is highest, running current is lowest."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <CommutatorCoil thetaRad={thetaRef.current} spinning={mode === "motor" ? omegaMotorRef.current > 0.1 : true} />
        </div>
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">{mode === "generator" ? "Pulsating DC output" : "Angular speed ω(t)"}</div>
          <Chart series={[{ points: chartPoints, color: "#E85A4A" }]} xLabel="t (s)" yLabel={mode === "generator" ? "V" : "rad/s"} xMax={3} yMin={0} yMax={chartMax} />
        </div>

        {mode === "generator" ? (
          <StatGrid
            stats={[
              { label: "Rotation speed", value: `${genRpm} rpm` },
              { label: "Output voltage (avg)", value: `${genAvg.toFixed(2)} V` },
              { label: "Peak voltage", value: `${genPeak.toFixed(2)} V` },
              { label: "Ripple factor", value: genRipple.toFixed(2) },
              { label: "Polarity", value: "Always positive (DC)" },
            ]}
          />
        ) : (
          <StatGrid
            stats={[
              { label: "Speed (ω)", value: `${omegaMotorRef.current.toFixed(1)} rad/s` },
              { label: "Back EMF", value: `${motorState.backEmfV.toFixed(2)} V` },
              { label: "Net voltage", value: `${motorState.netVoltageV.toFixed(2)} V` },
              { label: "Armature current", value: `${motorState.currentA.toFixed(2)} A` },
              { label: "Torque", value: `${motorState.torqueNm.toFixed(3)} N·m` },
              { label: "Mech. power", value: `${mechPowerW.toFixed(1)} W` },
              { label: "Efficiency", value: `${motorEfficiency.toFixed(0)}%` },
            ]}
          />
        )}
      </div>
    </div>
  );
}

function CommutatorCoil({ thetaRad, spinning }: { thetaRad: number; spinning: boolean }) {
  const W = 320;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2 - 10;
  const halfTurn = Math.floor(thetaRad / Math.PI) % 2 === 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Commutator and coil">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <rect x={20} y={cy - 40} width={30} height={80} fill="#E85A4A44" stroke="#E85A4A" strokeWidth={1.5} />
      <rect x={W - 50} y={cy - 40} width={30} height={80} fill="#4A90E244" stroke="#4A90E2" strokeWidth={1.5} />
      <rect x={cx - 50 * Math.abs(Math.cos(thetaRad)) - 3} y={cy - 30} width={100 * Math.abs(Math.cos(thetaRad)) + 6} height={60} fill="none" stroke="#B5652A" strokeWidth={3} opacity={spinning ? 1 : 0.4} />
      {/* commutator segments */}
      <circle cx={cx} cy={H - 30} r={16} fill={halfTurn ? "#C9822A" : "#8A5A1A"} />
      <rect x={cx - 16} y={H - 46} width={16} height={32} fill={halfTurn ? "#C9822A" : "#8A5A1A"} />
      <rect x={cx} y={H - 46} width={16} height={32} fill={halfTurn ? "#8A5A1A" : "#C9822A"} />
      <line x1={cx} y1={H - 46} x2={cx} y2={H - 14} stroke="#0D1412" strokeWidth={1} />
      <rect x={cx - 22} y={H - 12} width={10} height={10} fill="#3A2A1A" />
      <rect x={cx + 12} y={H - 12} width={10} height={10} fill="#3A2A1A" />
      <text x={cx - 30} y={H - 2} fontSize="8" fill="#8FA39D">
        brushes
      </text>
      <text x={cx - 30} y={20} fontSize="9" fill="#8FA39D">
        Split-ring commutator
      </text>
    </svg>
  );
}
