export type CircuitTopology = "series" | "parallel";
export type FaultType = "none" | "short-circuit" | "overload" | "earth-fault" | "leakage" | "open-circuit" | "loose-connection";
export type ApplianceKey =
  | "led-bulb"
  | "incandescent-bulb"
  | "fan"
  | "fridge-old"
  | "fridge-new"
  | "tv"
  | "heater"
  | "ac"
  | "washing-machine"
  | "iron"
  | "kettle";

export interface Appliance {
  key: ApplianceKey;
  label: string;
  typicalWatts: number;
}

export interface DataPoint {
  x: number;
  y: number;
}
