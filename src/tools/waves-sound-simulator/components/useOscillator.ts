import { useEffect, useRef } from "react";

interface UseOscillatorArgs {
  enabled: boolean;
  frequencyHz: number;
  /** 0..100, mapped to gain */
  amplitude: number;
  muted: boolean;
}

export function useOscillator({ enabled, frequencyHz, amplitude, muted }: UseOscillatorArgs) {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!enabled) {
      oscRef.current?.stop();
      oscRef.current = null;
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequencyHz;
    gain.gain.value = muted ? 0 : Math.min(0.25, amplitude / 400);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    ctxRef.current = ctx;
    oscRef.current = osc;
    gainRef.current = gain;

    return () => {
      osc.stop();
      ctx.close();
      ctxRef.current = null;
      oscRef.current = null;
      gainRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (oscRef.current) oscRef.current.frequency.value = frequencyHz;
  }, [frequencyHz]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : Math.min(0.25, amplitude / 400);
  }, [amplitude, muted]);
}
