import { useEffect, useMemo, useRef, useState } from "react";
import TitrationRig from "./components/TitrationRig";
import PHChart from "./components/PHChart";
import {
  INDICATORS,
  IndicatorId,
  TitrationPoint,
  calcTitrationPH,
  equivalenceVolumeMl,
  formatNumber,
  indicatorColor,
} from "./chemistry";
import FullscreenPanel from "../../components/FullscreenPanel";

const BURETTE_CAPACITY_ML = 50;
const DRIP_INCREMENT_ML = 0.1;
const DRIP_INTERVAL_MS = 120;

export default function TitrationMode() {
  const [analyteConc, setAnalyteConc] = useState(0.1);
  const [analyteVol, setAnalyteVol] = useState(25);
  const [analyteIsAcid, setAnalyteIsAcid] = useState(true);
  const [titrantConc, setTitrantConc] = useState(0.1);
  const [indicatorId, setIndicatorId] = useState<IndicatorId>("phenolphthalein");

  const [volumeAdded, setVolumeAdded] = useState(0);
  const [history, setHistory] = useState<TitrationPoint[]>([]);
  const [isAutoAdding, setIsAutoAdding] = useState(false);
  const [markedEndpointMl, setMarkedEndpointMl] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const indicator = INDICATORS[indicatorId];
  const veq = useMemo(
    () => equivalenceVolumeMl(analyteConc, analyteVol, titrantConc),
    [analyteConc, analyteVol, titrantConc]
  );

  const currentPh = useMemo(
    () => calcTitrationPH(analyteConc, analyteVol, titrantConc, volumeAdded, analyteIsAcid),
    [analyteConc, analyteVol, titrantConc, volumeAdded, analyteIsAcid]
  );

  // seed history when the setup changes
  useEffect(() => {
    const startPh = calcTitrationPH(analyteConc, analyteVol, titrantConc, 0, analyteIsAcid);
    setVolumeAdded(0);
    setHistory([{ volumeMl: 0, pH: startPh }]);
    setMarkedEndpointMl(null);
    setIsAutoAdding(false);
  }, [analyteConc, analyteVol, titrantConc, analyteIsAcid]);

  function addTitrant(amountMl: number) {
    setVolumeAdded((prev) => {
      const next = Math.min(BURETTE_CAPACITY_ML, prev + amountMl);
      const ph = calcTitrationPH(analyteConc, analyteVol, titrantConc, next, analyteIsAcid);
      setHistory((h) => [...h, { volumeMl: next, pH: ph }]);
      if (next >= BURETTE_CAPACITY_ML) setIsAutoAdding(false);
      return next;
    });
  }

  useEffect(() => {
    if (isAutoAdding) {
      intervalRef.current = window.setInterval(() => addTitrant(DRIP_INCREMENT_ML), DRIP_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoAdding, analyteConc, analyteVol, titrantConc, analyteIsAcid]);

  function reset() {
    setIsAutoAdding(false);
    setVolumeAdded(0);
    setMarkedEndpointMl(null);
    setHistory([{ volumeMl: 0, pH: calcTitrationPH(analyteConc, analyteVol, titrantConc, 0, analyteIsAcid) }]);
  }

  function markEndpoint() {
    setIsAutoAdding(false);
    setMarkedEndpointMl(volumeAdded);
  }

  const measuredConc =
    markedEndpointMl !== null && analyteVol > 0 ? (titrantConc * markedEndpointMl) / analyteVol : null;
  const percentError =
    measuredConc !== null ? (Math.abs(measuredConc - analyteConc) / analyteConc) * 100 : null;

  const flaskColorHex = indicatorColor(indicator, currentPh);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#8FA39D] mb-1">Analyte conc. (mol/L)</label>
            <input
              type="number"
              step="0.01"
              min="0.001"
              value={analyteConc}
              onChange={(e) => setAnalyteConc(Math.max(0.001, Number(e.target.value)))}
              className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8FA39D] mb-1">Analyte volume (mL)</label>
            <input
              type="number"
              step="1"
              min="1"
              value={analyteVol}
              onChange={(e) => setAnalyteVol(Math.max(1, Number(e.target.value)))}
              className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#8FA39D] mb-1">Analyte in flask is a...</label>
          <div className="flex rounded border border-[#2A3A37] overflow-hidden text-sm">
            <button
              onClick={() => setAnalyteIsAcid(true)}
              className={`flex-1 py-1.5 transition-colors ${
                analyteIsAcid ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] text-[#8FA39D]"
              }`}
            >
              Strong acid
            </button>
            <button
              onClick={() => setAnalyteIsAcid(false)}
              className={`flex-1 py-1.5 transition-colors ${
                !analyteIsAcid ? "bg-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] text-[#8FA39D]"
              }`}
            >
              Strong base
            </button>
          </div>
          <div className="mt-1 text-[11px] text-[#5C726C]">Titrant in the burette is the opposite.</div>
        </div>

        <div>
          <label className="block text-[11px] text-[#8FA39D] mb-1">Titrant conc. (mol/L)</label>
          <input
            type="number"
            step="0.01"
            min="0.001"
            value={titrantConc}
            onChange={(e) => setTitrantConc(Math.max(0.001, Number(e.target.value)))}
            className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 font-mono text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] text-[#8FA39D] mb-1">Indicator</label>
          <select
            value={indicatorId}
            onChange={(e) => setIndicatorId(e.target.value as IndicatorId)}
            className="w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none"
          >
            {Object.values(INDICATORS).map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.label} (transitions pH {ind.lowPh}–{ind.highPh})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => addTitrant(0.1)}
            className="flex-1 rounded bg-[#17211F] border border-[#2A3A37] py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors"
          >
            + 1 drop (0.1 mL)
          </button>
          <button
            onClick={() => addTitrant(1)}
            className="flex-1 rounded bg-[#17211F] border border-[#2A3A37] py-2 text-sm text-[#ECF2F0] hover:border-[#5FC7B8] transition-colors"
          >
            + 1 mL
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAutoAdding((v) => !v)}
            className={`flex-1 rounded py-2 text-sm border transition-colors ${
              isAutoAdding
                ? "bg-[#E8A33D] border-[#E8A33D] text-[#0D1412]"
                : "bg-[#17211F] border-[#2A3A37] text-[#ECF2F0] hover:border-[#5FC7B8]"
            }`}
          >
            {isAutoAdding ? "Stop drip" : "Continuous drip"}
          </button>
          <button
            onClick={reset}
            className="flex-1 rounded bg-[#17211F] border border-[#2A3A37] py-2 text-sm text-[#8FA39D] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors"
          >
            Reset
          </button>
        </div>

        <button
          onClick={markEndpoint}
          className="w-full rounded border border-dashed border-[#3A4B48] py-2 text-sm text-[#8FA39D] hover:border-[#5FC7B8] hover:text-[#5FC7B8] transition-colors"
        >
          Mark endpoint (color change observed)
        </button>

        {markedEndpointMl !== null && (
          <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 font-mono text-xs text-[#ECF2F0] space-y-1">
            <div>Endpoint volume: {formatNumber(markedEndpointMl, 2)} mL</div>
            <div>Back-calculated analyte conc.: {formatNumber(measuredConc ?? 0, 4)} mol/L</div>
            <div className={percentError !== null && percentError > 5 ? "text-[#E8A33D]" : "text-[#5FC7B8]"}>
              Error vs. true value: {formatNumber(percentError ?? 0, 2)}%
            </div>
          </div>
        )}
      </div>

      {/* Visual + chart */}
      <div className="space-y-6">
        <FullscreenPanel fit="height" fitHeight="45dvh" cardClassName="rounded border border-[#2A3A37] bg-[#0D1412] p-6" contentClassName="flex flex-col items-center justify-center gap-4">
          <TitrationRig
            buretteRemaining={1 - volumeAdded / BURETTE_CAPACITY_ML}
            flaskFill={0.35 + volumeAdded / BURETTE_CAPACITY_ML}
            flaskColor={flaskColorHex}
            isDripping={isAutoAdding}
          />
          <div className="grid grid-cols-3 gap-6 text-center font-mono">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Added</div>
              <div className="text-lg text-[#ECF2F0]">{formatNumber(volumeAdded, 2)} mL</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">pH</div>
              <div className="text-lg text-[#ECF2F0]">{formatNumber(currentPh, 2)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">Theoretical Veq</div>
              <div className="text-lg text-[#ECF2F0]">{formatNumber(veq, 2)} mL</div>
            </div>
          </div>
        </FullscreenPanel>

        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-[#8FA39D]">pH vs. volume added</div>
          <PHChart
            points={history}
            maxVolumeMl={BURETTE_CAPACITY_ML}
            equivalenceVolumeMl={veq}
            currentVolumeMl={volumeAdded}
          />
        </div>
      </div>
    </div>
  );
}
