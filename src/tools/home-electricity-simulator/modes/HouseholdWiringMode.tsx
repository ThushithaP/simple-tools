import { useState } from "react";
import { WIRE_GAUGES, wireHeatLabel } from "../physics";
import { SliderField, SegmentedField, StatGrid, EquationBox, MisconceptionTip } from "../components/Controls";

const ROOM_OPTIONS = [1, 2, 3, 4] as const;

export default function HouseholdWiringMode() {
  const [numRooms, setNumRooms] = useState(2);
  const [supplyV, setSupplyV] = useState(230);
  const [lightingMcbA, setLightingMcbA] = useState(6);
  const [socketMcbA, setSocketMcbA] = useState(32);
  const [applianceMcbA, setApplianceMcbA] = useState(32);
  const lightingGaugeIdx = 1; // 1.5mm2, standard for lighting circuits
  const socketGaugeIdx = 2; // 2.5mm2, standard for radial/ring socket circuits
  const applianceGaugeIdx = 4; // 6mm2, for high-power circuits
  const [socketsLoadedFraction, setSocketsLoadedFraction] = useState(0.4);
  const [highPowerApplianceOn, setHighPowerApplianceOn] = useState(false);
  const [highPowerW, setHighPowerW] = useState(3000);

  const lightingGauge = WIRE_GAUGES[lightingGaugeIdx];
  const socketGauge = WIRE_GAUGES[socketGaugeIdx];
  const applianceGauge = WIRE_GAUGES[applianceGaugeIdx];

  const lightingWattsPerRoom = 2 * 60; // 2 lights x 60W
  const socketWattsPerRoomMax = 2 * 1000; // 2 sockets x up to 1000W each when "fully loaded"

  const lightingTotalW = numRooms * lightingWattsPerRoom;
  const socketTotalW = numRooms * socketWattsPerRoomMax * socketsLoadedFraction;
  const applianceTotalW = highPowerApplianceOn ? highPowerW : 0;

  const lightingA = lightingTotalW / supplyV;
  const socketA = socketTotalW / supplyV;
  const applianceA = applianceTotalW / supplyV;
  const totalA = lightingA + socketA + applianceA;
  const totalW = lightingTotalW + socketTotalW + applianceTotalW;

  const lightingHeat = wireHeatLabel(lightingA, lightingGauge.maxA);
  const socketHeat = wireHeatLabel(socketA, socketGauge.maxA);
  const applianceHeat = wireHeatLabel(applianceA, applianceGauge.maxA);

  const lightingTripped = lightingA > lightingMcbA;
  const socketTripped = socketA > socketMcbA;
  const applianceTripped = applianceA > applianceMcbA;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-5">
        <SegmentedField
          label="Rooms"
          value={String(numRooms) as "1" | "2" | "3" | "4"}
          onChange={(v) => setNumRooms(Number(v))}
          options={ROOM_OPTIONS.map((n) => ({ value: String(n) as "1" | "2" | "3" | "4", label: `${n}` }))}
        />
        <SegmentedField
          label="Supply voltage"
          value={String(supplyV) as "120" | "230" | "240"}
          onChange={(v) => setSupplyV(Number(v))}
          options={[
            { value: "120", label: "120V" },
            { value: "230", label: "230V" },
            { value: "240", label: "240V" },
          ]}
        />
        <SliderField label="Sockets loaded" unit="%" min={0} max={100} step={5} value={Math.round(socketsLoadedFraction * 100)} onChange={(v) => setSocketsLoadedFraction(v / 100)} />
        <button
          onClick={() => setHighPowerApplianceOn((v) => !v)}
          className={`w-full rounded border py-2 text-sm min-h-[44px] transition-colors ${
            highPowerApplianceOn ? "bg-[#5FC7B8] border-[#5FC7B8] text-[#0D1412]" : "bg-[#0F1614] border-[#2A3A37] text-[#8FA39D]"
          }`}
        >
          High-power appliance: {highPowerApplianceOn ? "ON" : "OFF"}
        </button>
        {highPowerApplianceOn && <SliderField label="Appliance power" unit=" W" min={1000} max={10000} step={100} value={highPowerW} onChange={setHighPowerW} />}

        <div className="rounded border border-[#2A3A37] bg-[#121A18] p-3 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-[#8FA39D]">MCB ratings</div>
          <SliderField label="Lighting MCB" unit=" A" min={6} max={20} step={1} value={lightingMcbA} onChange={setLightingMcbA} />
          <SliderField label="Socket MCB" unit=" A" min={16} max={32} step={1} value={socketMcbA} onChange={setSocketMcbA} />
          <SliderField label="Appliance MCB" unit=" A" min={20} max={63} step={1} value={applianceMcbA} onChange={setApplianceMcbA} />
        </div>

        <EquationBox lines={[`Each circuit: V = ${supplyV} V (parallel)`, `I = P/V per circuit`, `I_total = I_light + I_socket + I_appliance = ${totalA.toFixed(2)} A`]} />
        <MisconceptionTip
          wrong="A 32A MCB means you can draw 32A safely from one socket."
          right="32A is the total for the whole circuit — individual sockets are typically rated 13–16A."
        />
      </div>

      <div className="space-y-6">
        <div className="rounded border border-[#2A3A37] bg-[#0D1412] p-4">
          <WiringDiagram
            numRooms={numRooms}
            lightingTripped={lightingTripped}
            socketTripped={socketTripped}
            applianceTripped={applianceTripped}
            applianceOn={highPowerApplianceOn}
          />
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px]">
            <span className="text-[#B5652A]">━ Live (Brown)</span>
            <span className="text-[#4A90E2]">━ Neutral (Blue)</span>
            <span className="text-[#B8C24A]">━ Earth (Green-Yellow)</span>
          </div>
        </div>

        <StatGrid
          stats={[
            { label: "Total power", value: `${(totalW / 1000).toFixed(2)} kW` },
            { label: "Total current", value: `${totalA.toFixed(2)} A` },
            { label: "Lighting circuit", value: `${lightingA.toFixed(2)} A`, warn: lightingTripped },
            { label: "Socket circuit", value: `${socketA.toFixed(2)} A`, warn: socketTripped },
            { label: "Appliance circuit", value: `${applianceA.toFixed(2)} A`, warn: applianceTripped },
            { label: "Lighting wire", value: `${lightingHeat} (${lightingGauge.mm2}mm²)`, warn: lightingHeat !== "Normal" },
            { label: "Socket wire", value: `${socketHeat} (${socketGauge.mm2}mm²)`, warn: socketHeat !== "Normal" },
            { label: "Appliance wire", value: `${applianceHeat} (${applianceGauge.mm2}mm²)`, warn: applianceHeat !== "Normal" },
          ]}
        />
      </div>
    </div>
  );
}

function WiringDiagram({
  numRooms,
  lightingTripped,
  socketTripped,
  applianceTripped,
  applianceOn,
}: {
  numRooms: number;
  lightingTripped: boolean;
  socketTripped: boolean;
  applianceTripped: boolean;
  applianceOn: boolean;
}) {
  const W = 720;
  const H = 260;
  const LIVE = "#B5652A";
  const NEUTRAL = "#4A90E2";
  const EARTH = "#B8C24A";

  const circuits = [
    { label: "Lighting", y: 60, tripped: lightingTripped, active: true },
    { label: "Sockets", y: 130, tripped: socketTripped, active: true },
    { label: "Appliance", y: 200, tripped: applianceTripped, active: applianceOn },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Household wiring diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      {/* meter + consumer unit */}
      <rect x={20} y={100} width={50} height={60} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={16} y={95} fontSize="9" fill="#8FA39D">
        Meter
      </text>
      <rect x={110} y={40} width={40} height={180} fill="none" stroke="#8FA39D" strokeWidth={2} />
      <text x={104} y={35} fontSize="9" fill="#8FA39D">
        Consumer unit
      </text>
      <line x1={70} y1={130} x2={110} y2={130} stroke={LIVE} strokeWidth={2} />

      {circuits.map((c, i) => (
        <g key={i} opacity={c.active ? 1 : 0.35}>
          <line x1={150} y1={c.y} x2={220} y2={c.y} stroke={c.tripped ? "#5C726C" : LIVE} strokeWidth={2} strokeDasharray={c.tripped ? "3 3" : undefined} />
          <rect x={220} y={c.y - 12} width={44} height={24} fill={c.tripped ? "#E85A4A33" : "#5FC7B833"} stroke={c.tripped ? "#E85A4A" : "#5FC7B8"} strokeWidth={1.5} />
          <text x={224} y={c.y + 4} fontSize="9" fill={c.tripped ? "#E85A4A" : "#5FC7B8"}>
            MCB
          </text>
          <text x={150} y={c.y - 16} fontSize="10" fill="#8FA39D">
            {c.label} {c.tripped ? "(TRIPPED)" : ""}
          </text>
          {!c.tripped && (
            <>
              <line x1={264} y1={c.y} x2={620} y2={c.y} stroke={LIVE} strokeWidth={1.5} />
              <line x1={264} y1={c.y + 4} x2={620} y2={c.y + 4} stroke={NEUTRAL} strokeWidth={1.2} />
              <line x1={264} y1={c.y + 8} x2={620} y2={c.y + 8} stroke={EARTH} strokeWidth={1.2} />
            </>
          )}
          {Array.from({ length: numRooms }).map((_, r) => {
            const rx = 300 + r * (300 / Math.max(1, numRooms));
            return (
              <g key={r}>
                <circle cx={rx} cy={c.y - 20} r={5} fill={c.tripped ? "#3A4B48" : "#E8A33D"} />
                <text x={rx - 16} y={c.y - 28} fontSize="8" fill="#5C726C">
                  Room {r + 1}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
