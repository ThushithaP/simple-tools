import { useMemo, useState } from "react";
import { TransistorConfig, TransistorType } from "../types";
import { transistorAmplifier, transistorSwitch } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import Chart from "../components/Chart";

const VBE_ON = 0.7; // silicon BJT assumption, standard for this teaching context

export default function TransistorMode() {
  const [transistorType, setTransistorType] = useState<TransistorType>("npn");
  const [config, setConfig] = useState<TransistorConfig>("switch");

  // switch controls
  const [baseResistorK, setBaseResistorK] = useState(10);
  const [inputVoltage, setInputVoltage] = useState(5);
  const [switchVcc, setSwitchVcc] = useState(5);
  const [switchRc, setSwitchRc] = useState(330);
  const [beta, setBeta] = useState(100);

  // amplifier controls
  const [inputAmplitudeMv, setInputAmplitudeMv] = useState(50);
  const [inputFreqHz, setInputFreqHz] = useState(1000);
  const [ampRc, setAmpRc] = useState(4700);
  const [ampVcc, setAmpVcc] = useState(12);

  const switchResult = useMemo(
    () => transistorSwitch(inputVoltage, baseResistorK * 1000, VBE_ON, beta, switchVcc, switchRc),
    [inputVoltage, baseResistorK, beta, switchVcc, switchRc]
  );

  const ampResult = useMemo(
    () => transistorAmplifier(inputAmplitudeMv / 1000, ampRc, ampVcc, 300),
    [inputAmplitudeMv, ampRc, ampVcc]
  );

  const period = 1 / inputFreqHz;
  const waveform = useMemo(() => {
    const N = 200;
    const inPts: { x: number; y: number }[] = [];
    const outPts: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * period * 2;
      const vIn = (inputAmplitudeMv / 1000) * Math.sin(2 * Math.PI * inputFreqHz * t);
      inPts.push({ x: t * 1e6, y: vIn });
      const rawOut = ampResult.voltageGain * vIn;
      const clampedOut = Math.max(-ampResult.outputAmplitudeV, Math.min(ampResult.outputAmplitudeV, rawOut));
      outPts.push({ x: t * 1e6, y: clampedOut });
    }
    return { inPts, outPts };
  }, [inputAmplitudeMv, inputFreqHz, period, ampResult]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Transistor type"
          value={transistorType}
          onChange={setTransistorType}
          options={[
            { value: "npn", label: "NPN" },
            { value: "pnp", label: "PNP" },
          ]}
        />
        <SegmentedField
          label="Configuration"
          value={config}
          onChange={setConfig}
          options={[
            { value: "switch", label: "Switch" },
            { value: "amplifier", label: "Amplifier" },
          ]}
        />

        {config === "switch" ? (
          <>
            <SliderField label="Current gain (β)" unit="" min={50} max={300} step={5} value={beta} onChange={setBeta} />
            <SliderField label="Base resistor" unit=" kΩ" min={1} max={100} step={1} value={baseResistorK} onChange={setBaseResistorK} />
            <SliderField label="Input voltage" unit=" V" min={0} max={10} step={0.1} value={inputVoltage} onChange={setInputVoltage} />
            <SliderField label="Supply V_CC" unit=" V" min={3} max={12} step={0.5} value={switchVcc} onChange={setSwitchVcc} />
            <SliderField label="Collector resistor" unit=" Ω" min={100} max={1000} step={10} value={switchRc} onChange={setSwitchRc} />
            <EquationBox
              lines={[
                `I_B = (V_in − V_BE)/R_B = ${(switchResult.baseCurrentA * 1e6).toFixed(1)} µA`,
                `I_C = β × I_B (capped by saturation) = ${(switchResult.collectorCurrentA * 1000).toFixed(2)} mA`,
                `I_E = I_B + I_C = ${(switchResult.emitterCurrentA * 1000).toFixed(2)} mA`,
              ]}
            />
          </>
        ) : (
          <>
            <SliderField label="Input amplitude" unit=" mV" min={10} max={500} step={10} value={inputAmplitudeMv} onChange={setInputAmplitudeMv} />
            <SliderField label="Input frequency" unit=" Hz" min={100} max={10000} step={100} value={inputFreqHz} onChange={setInputFreqHz} />
            <SliderField label="Collector resistor" unit=" Ω" min={1000} max={10000} step={100} value={ampRc} onChange={setAmpRc} />
            <SliderField label="Supply V_CC" unit=" V" min={5} max={20} step={0.5} value={ampVcc} onChange={setAmpVcc} />
            <div className="text-[10px] text-[#5C726C]">
              Assumes the bias network is already set for max symmetric swing (quiescent Iс ≈ V_CC/2R_C) — see notes.
            </div>
            <EquationBox
              lines={[
                `r_e ≈ V_T/I_E = ${ampResult.reOhm.toFixed(1)} Ω`,
                `A_v = −R_C/r_e = ${ampResult.voltageGain.toFixed(1)}`,
                `V_out ≈ ${(ampResult.outputAmplitudeV * 1000).toFixed(0)} mV peak${ampResult.clipped ? " (clipped!)" : ""}`,
              ]}
            />
          </>
        )}
        <MisconceptionTip
          wrong="A transistor amplifies voltage directly."
          right="A transistor amplifies current (I_C = β × I_B) — voltage gain comes from that current change across a resistor."
        />
      </div>

      <div className="space-y-6">
        {config === "switch" ? (
          <>
            <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-6 flex items-center justify-center">
              <TransistorSwitchSchematic on={switchResult.ledOn} vce={switchResult.vce} />
            </div>
            <StatGrid
              stats={[
                { label: "I_B", value: `${(switchResult.baseCurrentA * 1e6).toFixed(1)} µA` },
                { label: "I_C", value: `${(switchResult.collectorCurrentA * 1000).toFixed(2)} mA` },
                { label: "I_E", value: `${(switchResult.emitterCurrentA * 1000).toFixed(2)} mA` },
                { label: "V_BE", value: switchResult.region === "cutoff" ? "< 0.7 V" : "0.7 V" },
                { label: "V_CE", value: `${switchResult.vce.toFixed(2)} V` },
                { label: "Region", value: switchResult.region },
                { label: "LED", value: switchResult.ledOn ? "ON" : "OFF" },
                { label: "Power (P=VI)", value: `${(switchResult.powerW * 1000).toFixed(1)} mW` },
              ]}
            />
          </>
        ) : (
          <>
            <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Input (blue) vs. output (teal, inverted)</div>
              <Chart
                series={[
                  { points: waveform.inPts, color: "#4A90E2", dashed: true },
                  { points: waveform.outPts, color: "#5FC7B8" },
                ]}
                xLabel="t (µs)"
                yLabel="V"
                xMin={0}
                xMax={period * 2 * 1e6}
                yMin={-Math.max(ampResult.outputAmplitudeV, inputAmplitudeMv / 1000) * 1.2}
                yMax={Math.max(ampResult.outputAmplitudeV, inputAmplitudeMv / 1000) * 1.2}
              />
              {ampResult.clipped && <div className="mt-1 text-center text-[10px] text-[#E8A33D]">Output clipping — reduce input amplitude or increase V_CC</div>}
              <div className="mt-1 text-center text-[10px] text-[#5C726C]">
                Input looks nearly flat next to the output — that gap in scale is the amplification.
              </div>
            </div>
            <StatGrid
              stats={[
                { label: "I_E (bias)", value: `${(ampResult.emitterCurrentA * 1000).toFixed(2)} mA` },
                { label: "r_e", value: `${ampResult.reOhm.toFixed(1)} Ω` },
                { label: "Voltage gain (A_v)", value: ampResult.voltageGain.toFixed(1) },
                { label: "V_out (peak)", value: `${(ampResult.outputAmplitudeV * 1000).toFixed(0)} mV` },
                { label: "Phase", value: "180° (inverted)" },
                { label: "Clipping?", value: ampResult.clipped ? "Yes" : "No", muted: !ampResult.clipped },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function TransistorSwitchSchematic({ on, vce }: { on: boolean; vce: number }) {
  return (
    <svg viewBox="0 0 300 220" width="280" height="205" role="img" aria-label="Transistor switch with LED">
      {/* supply rail */}
      <line x1={150} y1={10} x2={150} y2={40} stroke="#8FA39D" strokeWidth={2} />
      <text x={156} y={20} fontSize="10" fill="#8FA39D">
        V_CC
      </text>
      {/* LED */}
      <line x1={150} y1={40} x2={150} y2={75} stroke="#8FA39D" strokeWidth={2} />
      <polygon points="140,75 160,75 150,95" fill={on ? "#E85A4A" : "#3A4B48"} style={{ filter: on ? "drop-shadow(0 0 6px #E85A4A)" : undefined }} />
      <line x1={140} y1={95} x2={160} y2={95} stroke={on ? "#E85A4A" : "#3A4B48"} strokeWidth={2} />
      <text x={165} y={88} fontSize="9" fill="#8FA39D">
        LED
      </text>
      {/* collector */}
      <line x1={150} y1={95} x2={150} y2={120} stroke="#8FA39D" strokeWidth={2} />
      {/* transistor body */}
      <circle cx={150} cy={150} r={30} fill="none" stroke="#5FC7B8" strokeWidth={1.5} />
      <line x1={135} y1={135} x2={135} y2={165} stroke="#ECF2F0" strokeWidth={2} />
      <line x1={150} y1={120} x2={135} y2={140} stroke="#ECF2F0" strokeWidth={1.5} />
      <line x1={135} y1={160} x2={150} y2={180} stroke="#ECF2F0" strokeWidth={1.5} />
      <line x1={100} y1={150} x2={135} y2={150} stroke="#ECF2F0" strokeWidth={1.5} />
      <polygon points="145,172 150,180 139,177" fill="#ECF2F0" />
      <text x={150} y={200} fontSize="9" fill="#8FA39D" textAnchor="middle">
        C={"C"} B={"B"} E={"E"}
      </text>
      <text x={95} y={150} fontSize="9" fill="#8FA39D" textAnchor="end">
        Base
      </text>
      <line x1={150} y1={180} x2={150} y2={210} stroke="#8FA39D" strokeWidth={2} />
      <text x={156} y={210} fontSize="9" fill="#8FA39D">
        GND
      </text>
      <text x={165} y={155} fontSize="9" fill="#5C726C">
        V_CE={vce.toFixed(2)}V
      </text>
    </svg>
  );
}
