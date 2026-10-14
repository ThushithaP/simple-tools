import { Electrolyte, ElectrodeMaterial } from "../types";

interface ControlPanelProps {
  anodeMaterial: ElectrodeMaterial;
  cathodeMaterial: ElectrodeMaterial;
  electrolyte: Electrolyte;
  voltageV: number;
  concentrationM: number;
  speedMultiplier: number;
  onAnodeMaterialChange: (v: ElectrodeMaterial) => void;
  onCathodeMaterialChange: (v: ElectrodeMaterial) => void;
  onElectrolyteChange: (v: Electrolyte) => void;
  onVoltageChange: (v: number) => void;
  onConcentrationChange: (v: number) => void;
  onSpeedChange: (v: number) => void;
}

const selectClass =
  "w-full rounded border border-[#2A3A37] bg-[#0F1614] px-2 py-1.5 text-sm text-[#ECF2F0] focus:border-[#5FC7B8] focus:outline-none";
const labelClass = "block text-[11px] text-[#8FA39D] mb-1";

export default function ControlPanel({
  anodeMaterial,
  cathodeMaterial,
  electrolyte,
  voltageV,
  concentrationM,
  speedMultiplier,
  onAnodeMaterialChange,
  onCathodeMaterialChange,
  onElectrolyteChange,
  onVoltageChange,
  onConcentrationChange,
  onSpeedChange,
}: ControlPanelProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Electrolyte</label>
        <select
          value={electrolyte}
          onChange={(e) => onElectrolyteChange(e.target.value as Electrolyte)}
          className={selectClass}
        >
          <option value="CuSO4">Copper(II) sulfate, CuSO4 (aq)</option>
          <option value="NaCl">Sodium chloride, NaCl (aq)</option>
          <option value="H2SO4-water">Water, acidified with H2SO4</option>
          {/* <option value="molten-CuSO4">Molten CuSO4 (simplified)</option> */}
        </select>
      </div>

      <div>
        <label className={labelClass}>Anode material</label>
        <select
          value={anodeMaterial}
          onChange={(e) => onAnodeMaterialChange(e.target.value as ElectrodeMaterial)}
          className={selectClass}
        >
          <option value="Graphite">Graphite (inert)</option>
          <option value="Copper">Copper (active)</option>
          <option value="Platinum">Platinum (inert)</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Cathode material</label>
        <select
          value={cathodeMaterial}
          onChange={(e) => onCathodeMaterialChange(e.target.value as ElectrodeMaterial)}
          className={selectClass}
        >
          <option value="Graphite">Graphite</option>
          <option value="Copper">Copper</option>
          <option value="Iron">Iron</option>
        </select>
      </div>

      <SliderField
        label="Voltage"
        unit="V"
        min={0}
        max={12}
        step={0.5}
        value={voltageV}
        onChange={onVoltageChange}
      />
      <SliderField
        label="Concentration"
        unit="M"
        min={0.1}
        max={2.0}
        step={0.1}
        value={concentrationM}
        onChange={onConcentrationChange}
      />
      <SliderField
        label="Animation speed"
        unit="x"
        min={0.5}
        max={3}
        step={0.5}
        value={speedMultiplier}
        onChange={onSpeedChange}
      />
    </div>
  );
}

function SliderField({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] text-[#8FA39D]">{label}</label>
        <span className="font-mono text-xs text-[#ECF2F0]">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#5FC7B8]"
      />
    </div>
  );
}
