import { useEffect, useRef, useState } from "react";
import { INTERFERENCE_WAVE_SPEED, interferenceAt, wavelengthFromSpeed } from "../physics";
import { SliderField, StatGrid, EquationBox, PlaybackControls, MisconceptionTip } from "../components/Controls";
import FullscreenPanel from "../../../components/FullscreenPanel";

const NX = 180;
const NY = 100;
const DOMAIN_W_M = 10;
const DOMAIN_H_M = 5.6;
const DISPLAY_W = 720;
const DISPLAY_H = (DISPLAY_W * NY) / NX;

function pxToM(px: number, py: number) {
  return { x: (px / NX) * DOMAIN_W_M, y: (py / NY) * DOMAIN_H_M };
}

export default function InterferenceMode() {
  const [separation, setSeparation] = useState(3);
  const [phaseDiffDeg, setPhaseDiffDeg] = useState(0);
  const [freqA, setFreqA] = useState(1.5);
  const [freqB, setFreqB] = useState(1.5);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [detector, setDetector] = useState({ x: DOMAIN_W_M * 0.7, y: DOMAIN_H_M * 0.5 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const paramsRef = useRef({ separation, phaseDiffDeg, freqA, freqB, running, speed, detector });
  paramsRef.current = { separation, phaseDiffDeg, freqA, freqB, running, speed, detector };

  const wavelength = wavelengthFromSpeed(INTERFERENCE_WAVE_SPEED, (freqA + freqB) / 2);
  const beatFrequency = Math.abs(freqA - freqB);

  const cx = DOMAIN_W_M / 2;
  const cy = DOMAIN_H_M / 2;
  const sourceA = { x: cx - separation / 2, y: cy };
  const sourceB = { x: cx + separation / 2, y: cy };

  const detectorSample = interferenceAt(
    detector.x,
    detector.y,
    sourceA.x,
    sourceA.y,
    sourceB.x,
    sourceB.y,
    1,
    INTERFERENCE_WAVE_SPEED,
    freqA,
    freqB,
    (phaseDiffDeg * Math.PI) / 180,
    timeRef.current
  );

  useEffect(() => {
    let raf: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const imgData = ctx?.createImageData(NX, NY);

    function frame() {
      const p = paramsRef.current;
      if (p.running) timeRef.current += (1 / 60) * p.speed;

      if (ctx && imgData) {
        const sA = { x: DOMAIN_W_M / 2 - p.separation / 2, y: DOMAIN_H_M / 2 };
        const sB = { x: DOMAIN_W_M / 2 + p.separation / 2, y: DOMAIN_H_M / 2 };
        const phaseRad = (p.phaseDiffDeg * Math.PI) / 180;
        const data = imgData.data;
        for (let j = 0; j < NY; j++) {
          for (let i = 0; i < NX; i++) {
            const { x, y } = pxToM(i, j);
            const sample = interferenceAt(x, y, sA.x, sA.y, sB.x, sB.y, 1, INTERFERENCE_WAVE_SPEED, p.freqA, p.freqB, phaseRad, timeRef.current);
            const v = Math.max(-2, Math.min(2, sample.displacement)); // sum of two unit-amplitude sources
            const idx = (j * NX + i) * 4;
            if (v >= 0) {
              const t = v / 2;
              data[idx] = 15 + t * 80; // R
              data[idx + 1] = 20 + t * 180; // G
              data[idx + 2] = 18 + t * 165; // B
            } else {
              const t = -v / 2;
              data[idx] = 15 + t * 210;
              data[idx + 1] = 20 + t * 70;
              data[idx + 2] = 18 + t * 60;
            }
            data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // sources
        drawSourceMarker(ctx, sA, "#E8A33D");
        drawSourceMarker(ctx, sB, "#E8A33D");
        // detector
        const dpx = (p.detector.x / DOMAIN_W_M) * NX;
        const dpy = (p.detector.y / DOMAIN_H_M) * NY;
        ctx.beginPath();
        ctx.arc(dpx, dpy, 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#ECF2F0";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }

    function drawSourceMarker(c: CanvasRenderingContext2D, s: { x: number; y: number }, color: string) {
      const px = (s.x / DOMAIN_W_M) * NX;
      const py = (s.y / DOMAIN_H_M) * NY;
      c.beginPath();
      c.arc(px, py, 2.5, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * NX;
    const py = ((e.clientY - rect.top) / rect.height) * NY;
    setDetector(pxToM(px, py));
  }

  function reset() {
    timeRef.current = 0;
    setRunning(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-5">
        <SliderField label="Source separation" unit=" m" min={0.5} max={8} step={0.1} value={separation} onChange={setSeparation} />
        <SliderField label="Phase difference" unit="°" min={0} max={360} step={5} value={phaseDiffDeg} onChange={setPhaseDiffDeg} />
        <SliderField label="Frequency A" unit=" Hz" min={0.5} max={4} step={0.1} value={freqA} onChange={setFreqA} />
        <SliderField label="Frequency B" unit=" Hz" min={0.5} max={4} step={0.1} value={freqB} onChange={setFreqB} />
        <EquationBox
          lines={[
            `Path diff = nλ → constructive`,
            `Path diff = (n+½)λ → destructive`,
            `f_beat = |f1−f2| = ${beatFrequency.toFixed(2)} Hz`,
          ]}
        />
        <MisconceptionTip
          wrong="Waves move matter from one place to another."
          right="At the detector, only energy/displacement is transferred — nothing physically moves between sources."
        />
      </div>

      <div className="space-y-6">
        <FullscreenPanel
          aspect={NX / NY}
          caption="Click anywhere to move the detector (white ring). Orange dots are the two sources."
          controls={
            <PlaybackControls running={running} onToggleRunning={() => setRunning((r) => !r)} onReset={reset} speed={speed} onSpeedChange={setSpeed} />
          }
        >
          <canvas
            ref={canvasRef}
            width={NX}
            height={NY}
            onClick={handleCanvasClick}
            style={{ width: "100%", height: DISPLAY_H, imageRendering: "auto", cursor: "crosshair" }}
            className="rounded border border-[#2A3A37]"
          />
        </FullscreenPanel>

        <StatGrid
          stats={[
            { label: "Path difference", value: `${detectorSample.pathDifference.toFixed(2)} m` },
            { label: "In wavelengths", value: `${detectorSample.wavelengths.toFixed(2)} λ` },
            { label: "Interference", value: detectorSample.type },
            { label: "Wavelength (avg)", value: `${wavelength.toFixed(2)} m` },
            { label: "Beat frequency", value: `${beatFrequency.toFixed(2)} Hz`, muted: beatFrequency < 0.05 },
          ]}
        />
        {freqA !== freqB && (
          <div className="rounded border border-dashed border-[#3A4B48] p-3 text-xs text-[#8FA39D]">
            Frequencies differ, so the "constructive/destructive" classification above drifts over time — that
            drifting pattern <em>is</em> the beat.
          </div>
        )}
      </div>
    </div>
  );
}
