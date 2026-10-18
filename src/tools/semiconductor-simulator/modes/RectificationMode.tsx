import { useMemo, useState } from "react";
import { DiodeModel, RectifierCircuit } from "../types";
import { rectifiedInstant, rectifierAnalysis } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";
import Chart from "../components/Chart";
import FullscreenPanel from "../../../components/FullscreenPanel";

export default function RectificationMode() {
  const [circuit, setCircuit] = useState<RectifierCircuit>("half-wave");
  const [vPeak, setVPeak] = useState(20);
  const [freqHz, setFreqHz] = useState(50);
  const [loadOhm, setLoadOhm] = useState(1000);
  const [capacitanceUf, setCapacitanceUf] = useState(100);
  const [diodeModel, setDiodeModel] = useState<DiodeModel>("silicon");

  const capacitanceF = capacitanceUf * 1e-6;
  const analysis = useMemo(
    () => rectifierAnalysis(circuit, vPeak, freqHz, loadOhm, capacitanceF, diodeModel),
    [circuit, vPeak, freqHz, loadOhm, capacitanceF, diodeModel]
  );

  const period = 1 / freqHz;
  const windowT = period * 2.2;
  const samples = useMemo(() => {
    const N = 240;
    const input: { x: number; y: number }[] = [];
    const output: { x: number; y: number }[] = [];
    let lastOut = 0;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * windowT;
      const inst = rectifiedInstant(circuit === "full-wave-capacitor" ? "full-wave" : circuit, vPeak, freqHz, diodeModel, t);
      input.push({ x: t * 1000, y: inst.inputV });
      if (circuit === "full-wave-capacitor") {
        // simple RC discharge model between diode conduction peaks for visualization
        const rising = inst.outputV;
        if (rising > lastOut) {
          lastOut = rising;
        } else {
          const tau = loadOhm * capacitanceF;
          lastOut = lastOut * Math.exp(-(windowT / N) / Math.max(tau, 1e-6));
        }
        output.push({ x: t * 1000, y: lastOut });
      } else {
        output.push({ x: t * 1000, y: inst.outputV });
        lastOut = inst.outputV;
      }
    }
    return { input, output };
  }, [circuit, vPeak, freqHz, diodeModel, loadOhm, capacitanceF, windowT]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Circuit type"
          value={circuit}
          onChange={setCircuit}
          options={[
            { value: "half-wave", label: "Half" },
            { value: "full-wave", label: "Full" },
            { value: "full-wave-capacitor", label: "+Cap" },
          ]}
        />
        <SliderField label="Input AC voltage (peak)" unit=" V" min={5} max={50} step={1} value={vPeak} onChange={setVPeak} />
        <SliderField label="Input frequency" unit=" Hz" min={50} max={1000} step={10} value={freqHz} onChange={setFreqHz} />
        <SliderField label="Load resistance" unit=" Ω" min={100} max={10000} step={100} value={loadOhm} onChange={setLoadOhm} />
        {circuit === "full-wave-capacitor" && (
          <SliderField label="Filter capacitance" unit=" μF" min={10} max={1000} step={10} value={capacitanceUf} onChange={setCapacitanceUf} />
        )}
        <SegmentedField
          label="Diode type"
          value={diodeModel}
          onChange={setDiodeModel}
          options={[
            { value: "silicon", label: "Si" },
            { value: "germanium", label: "Ge" },
            { value: "ideal", label: "Ideal" },
          ]}
        />

        <EquationBox
          lines={
            circuit === "half-wave"
              ? [`V_DC = V_peak/π ≈ ${analysis.vdcV.toFixed(2)} V`, `η ≈ 40.6% (ideal)`]
              : circuit === "full-wave"
              ? [`V_DC = 2V_peak/π ≈ ${analysis.vdcV.toFixed(2)} V`, `η ≈ 81.2% (ideal)`]
              : [`V_DC ≈ V_peak − Vᵣ/2 ≈ ${analysis.vdcV.toFixed(2)} V`, `r ≈ 1/(2√3·f·R_L·C) ≈ ${analysis.rippleFactor.toFixed(3)}`]
          }
        />
        <MisconceptionTip wrong="Rectifiers produce pure DC." right="Rectifiers produce pulsating DC with ripple — a filter capacitor is needed to smooth it." />
      </div>

      <div className="space-y-6">
        <FullscreenPanel>
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[#8FA39D]">Oscilloscope: input (blue) vs. output (teal)</div>
          <Chart
            series={[
              { points: samples.input, color: "#4A90E2", dashed: true },
              { points: samples.output, color: "#5FC7B8" },
            ]}
            xLabel="t (ms)"
            yLabel="V"
            xMin={0}
            xMax={windowT * 1000}
            yMin={-vPeak * 1.1}
            yMax={vPeak * 1.1}
          />
        </FullscreenPanel>

        <StatGrid
          stats={[
            { label: "Input Vrms", value: `${(vPeak / Math.SQRT2).toFixed(1)} V` },
            { label: "Output V_DC", value: `${analysis.vdcV.toFixed(2)} V` },
            { label: "Ripple (pp)", value: `${analysis.ripplePeakToPeakV.toFixed(2)} V` },
            { label: "Ripple factor", value: analysis.rippleFactor.toFixed(3) },
            { label: "Efficiency", value: `${analysis.efficiencyPercent.toFixed(1)}%` },
            { label: "PIV", value: `${analysis.pivV.toFixed(1)} V` },
            { label: "Output freq.", value: `${analysis.outputFrequencyHz} Hz` },
          ]}
        />
      </div>
    </div>
  );
}
