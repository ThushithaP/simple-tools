import { useEffect, useMemo, useRef, useState } from "react";
import Cell from "./components/Cell";
import ControlPanel from "./components/ControlPanel";
import ReactionDisplay from "./components/ReactionDisplay";
import Dashboard from "./components/Dashboard";
import QuantityChart from "./components/QuantityChart";
import IonLegend from "./components/IonLegend";
import { Electrolyte, ElectrodeMaterial } from "./types";
import {
  determineReactions,
  estimateCurrentAmps,
  copperMassDepositedGrams,
  gasVolumeCm3,
} from "./chemistry";
import FullscreenPanel from "../../components/FullscreenPanel";

const COPPER_VISUAL_MAX_G = 0.5;
const ANODE_VISUAL_MAX_G = 1.5;

interface HistoryPoint {
  t: number;
  massG: number | null;
  gasCm3: number | null;
}

export default function ElectrolysisSimulator() {
  const [electrolyte, setElectrolyte] = useState<Electrolyte>("CuSO4");
  const [anodeMaterial, setAnodeMaterial] = useState<ElectrodeMaterial>("Graphite");
  const [cathodeMaterial, setCathodeMaterial] = useState<ElectrodeMaterial>("Graphite");
  const [voltageV, setVoltageV] = useState(6);
  const [concentrationM, setConcentrationM] = useState(1.0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  const [elapsedS, setElapsedS] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([{ t: 0, massG: 0, gasCm3: 0 }]);
  const [zoom, setZoom] = useState<"cathode" | "anode" | null>(null);
  const intervalRef = useRef<number | null>(null);

  const reaction = useMemo(
    () => determineReactions(electrolyte, anodeMaterial, cathodeMaterial, concentrationM),
    [electrolyte, anodeMaterial, cathodeMaterial, concentrationM]
  );

  const currentA = useMemo(() => estimateCurrentAmps(voltageV, concentrationM), [voltageV, concentrationM]);

  const massDepositedG = reaction.copperDeposits ? copperMassDepositedGrams(currentA, elapsedS) : null;
  const anodeDissolvedG = reaction.anodeDissolves ? copperMassDepositedGrams(currentA, elapsedS) : null;
  const gasCm3 =
    reaction.anodeElectronsPerUnit !== null
      ? gasVolumeCm3(currentA, elapsedS, reaction.anodeElectronsPerUnit)
      : null;

  // reset the run whenever the setup changes (does not auto-start)
  useEffect(() => {
    setElapsedS(0);
    setHistory([{ t: 0, massG: reaction.copperDeposits ? 0 : null, gasCm3: reaction.anodeElectronsPerUnit ? 0 : null }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electrolyte, anodeMaterial, cathodeMaterial]);

  useEffect(() => {
    if (started && running) {
      intervalRef.current = window.setInterval(() => {
        setElapsedS((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, started]);

  useEffect(() => {
    if (elapsedS === 0) return;
    setHistory((h) => [...h, { t: elapsedS, massG: massDepositedG, gasCm3: gasCm3 }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedS]);

  function reset() {
    setElapsedS(0);
    setHistory([{ t: 0, massG: reaction.copperDeposits ? 0 : null, gasCm3: reaction.anodeElectronsPerUnit ? 0 : null }]);
    setStarted(false);
    setRunning(false);
  }

  const chartMode: "mass" | "gas" | "none" = reaction.copperDeposits ? "mass" : reaction.anodeElectronsPerUnit ? "gas" : "none";
  const chartPoints =
    chartMode === "mass"
      ? history.filter((h) => h.massG !== null).map((h) => ({ t: h.t, value: h.massG as number }))
      : chartMode === "gas"
      ? history.filter((h) => h.gasCm3 !== null).map((h) => ({ t: h.t, value: h.gasCm3 as number }))
      : [];

  return (
    <div className="min-h-full bg-[#0F1614] text-[#ECF2F0] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Electrolysis Simulator</h1>
          <p className="text-sm text-[#8FA39D]">
            Ion migration, electrode reactions, and electrode-material effects — O-Level electrochemistry.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <ControlPanel
            anodeMaterial={anodeMaterial}
            cathodeMaterial={cathodeMaterial}
            electrolyte={electrolyte}
            voltageV={voltageV}
            concentrationM={concentrationM}
            speedMultiplier={speedMultiplier}
            onAnodeMaterialChange={setAnodeMaterial}
            onCathodeMaterialChange={setCathodeMaterial}
            onElectrolyteChange={setElectrolyte}
            onVoltageChange={setVoltageV}
            onConcentrationChange={setConcentrationM}
            onSpeedChange={setSpeedMultiplier}
          />

          <div className="space-y-6">
            <FullscreenPanel cardClassName="rounded border border-[#2A3A37] bg-[#0D1412] p-6" contentClassName="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-start justify-center gap-4">
                <Cell
                  electrolyte={electrolyte}
                  reaction={reaction}
                  speedMultiplier={speedMultiplier}
                  voltageV={voltageV}
                  copperFraction={massDepositedG !== null ? massDepositedG / COPPER_VISUAL_MAX_G : 0}
                  anodeDissolveFraction={anodeDissolvedG !== null ? anodeDissolvedG / ANODE_VISUAL_MAX_G : 0}
                  started={started}
                />
                <IonLegend electrolyte={electrolyte} />
              </div>
              {!started && (
                <p className="max-w-sm text-center text-xs text-[#8FA39D]">
                  Set your electrodes, electrolyte, and voltage on the left, then press Start — ions stay put and
                  no reaction runs until you do.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {!started ? (
                  <button
                    onClick={() => {
                      setStarted(true);
                      setRunning(true);
                    }}
                    className="rounded border border-[#5FC7B8] bg-[#5FC7B8] px-4 py-1.5 text-sm font-medium text-[#0D1412] hover:opacity-90 transition-opacity"
                  >
                    ▶ Start simulation
                  </button>
                ) : (
                  <button
                    onClick={() => setRunning((r) => !r)}
                    className="rounded border border-[#2A3A37] bg-[#17211F] px-3 py-1.5 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors"
                  >
                    {running ? "Pause timer" : "Resume timer"}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="rounded border border-[#2A3A37] bg-[#17211F] px-3 py-1.5 text-sm text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setZoom("cathode")}
                  className="rounded border border-dashed border-[#3A4B48] px-3 py-1.5 text-sm text-[#8FA39D] hover:border-[#5FC7B8] hover:text-[#5FC7B8] transition-colors"
                >
                  🔬 Zoom cathode
                </button>
                <button
                  onClick={() => setZoom("anode")}
                  className="rounded border border-dashed border-[#3A4B48] px-3 py-1.5 text-sm text-[#8FA39D] hover:border-[#5FC7B8] hover:text-[#5FC7B8] transition-colors"
                >
                  🔬 Zoom anode
                </button>
              </div>
            </FullscreenPanel>

            <ReactionDisplay reaction={reaction} />

            <Dashboard
              currentA={currentA}
              elapsedS={elapsedS}
              massDepositedG={massDepositedG}
              gasVolumeCm3={gasCm3}
              gasLabel={reaction.anodeGasLabel}
              reaction={reaction}
            />

            <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-[#8FA39D]">
                {chartMode === "mass" ? "Copper deposited vs. time" : chartMode === "gas" ? "Gas volume vs. time" : "Nothing to plot"}
              </div>
              {chartMode !== "none" ? (
                <QuantityChart
                  points={chartPoints}
                  yLabel={chartMode === "mass" ? "grams" : "cm³"}
                />
              ) : (
                <div className="py-8 text-center text-xs text-[#5C726C]">
                  This electrode combination doesn't deposit metal or evolve a tracked gas at the anode.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setZoom(null)}
        >
          <div
            className="max-w-md rounded border border-[#2A3A37] bg-[#121A18] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#ECF2F0]">
                {zoom === "cathode" ? "At the cathode" : "At the anode"}
              </h2>
              <button onClick={() => setZoom(null)} className="text-[#8FA39D] hover:text-[#E8A33D]">
                ✕
              </button>
            </div>
            <p className="font-mono text-xs text-[#5FC7B8] mb-2">
              {zoom === "cathode" ? reaction.cathodeEquation : reaction.anodeEquation}
            </p>
            <p className="text-sm text-[#8FA39D] leading-relaxed">
              {zoom === "cathode"
                ? reaction.copperDeposits
                  ? "Cu²⁺ ions arrive at the cathode surface and each gains two electrons from the electrode, becoming a neutral copper atom that joins the growing metal layer."
                  : "H⁺ ions arrive at the cathode surface and each gains an electron, pairing up to form H₂ gas that escapes as bubbles."
                : reaction.anodeDissolves
                ? "Copper atoms at the electrode surface each lose two electrons, entering the solution as Cu²⁺ ions — the electrode itself is consumed."
                : "Ions or water molecules at the anode surface lose electrons to the electrode, forming gas molecules that escape as bubbles."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
