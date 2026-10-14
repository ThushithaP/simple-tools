export type SimulatorMode = "dilution" | "titration";

export interface SavedExperiment {
  id: string;
  name: string;
  mode: SimulatorMode;
  savedAt: string;
  payload: unknown;
}
