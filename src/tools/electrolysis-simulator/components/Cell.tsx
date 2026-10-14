import { useEffect, useRef } from "react";
import { Electrolyte, ReactionResult } from "../types";
import { ionSpecies } from "./ionSpecies";

interface CellProps {
  electrolyte: Electrolyte;
  reaction: ReactionResult;
  speedMultiplier: number;
  voltageV: number;
  /** 0..1, how full the copper layer on the cathode is (illustrative, not to scale) */
  copperFraction: number;
  /** 0..1, how much of the copper anode has dissolved away (illustrative) */
  anodeDissolveFraction: number;
  /** false = setup phase: ions sit still, no bubbles, no deposit — waiting for the user to press Start */
  started: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  r: number;
  label: string;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  vy: number;
  opacity: number;
  color: string;
}

const W = 420;
const H = 320;
const ANODE_X = 110;
const CATHODE_X = 310;
const ELECTRODE_TOP = 60;
const ELECTRODE_BOTTOM = 250;
const ELECTRODE_W = 16;
const SOLUTION_TOP = 40;
const SOLUTION_BOTTOM = 270;

export default function Cell({
  electrolyte,
  reaction,
  speedMultiplier,
  voltageV,
  copperFraction,
  anodeDissolveFraction,
  started,
}: CellProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
  const propsRef = useRef({ reaction, speedMultiplier, voltageV, copperFraction, anodeDissolveFraction, electrolyte, started });
  const rafRef = useRef<number | null>(null);
  const bubbleTimerRef = useRef(0);

  propsRef.current = { reaction, speedMultiplier, voltageV, copperFraction, anodeDissolveFraction, electrolyte, started };

  // (re)seed particles whenever the electrolyte's ion species change
  useEffect(() => {
    const species = ionSpecies(electrolyte);
    const particles: Particle[] = [];
    species.forEach((sp) => {
      for (let i = 0; i < sp.count; i++) {
        const startX = sp.toCathode ? ANODE_X + 30 + Math.random() * 140 : CATHODE_X - 30 - Math.random() * 140;
        particles.push({
          x: startX,
          y: SOLUTION_TOP + 15 + Math.random() * (SOLUTION_BOTTOM - SOLUTION_TOP - 30),
          vx: sp.toCathode ? 1 : -1,
          vy: (Math.random() - 0.5) * 0.3,
          color: sp.color,
          r: 5,
          label: sp.toCathode ? "+" : "-",
        });
      }
    });
    particlesRef.current = particles;
  }, [electrolyte]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function drawBattery() {
      if (!ctx) return;
      const midX = (ANODE_X + CATHODE_X) / 2;
      ctx.strokeStyle = "#8FA39D";
      ctx.lineWidth = 2;
      // wires
      ctx.beginPath();
      ctx.moveTo(ANODE_X + ELECTRODE_W / 2, ELECTRODE_TOP);
      ctx.lineTo(ANODE_X + ELECTRODE_W / 2, 18);
      ctx.lineTo(midX - 22, 18);
      ctx.moveTo(CATHODE_X + ELECTRODE_W / 2, ELECTRODE_TOP);
      ctx.lineTo(CATHODE_X + ELECTRODE_W / 2, 18);
      ctx.lineTo(midX + 22, 18);
      ctx.stroke();
      // battery symbol: long line (+) short line (-)
      ctx.beginPath();
      ctx.moveTo(midX - 22, 8);
      ctx.lineTo(midX - 22, 28);
      ctx.moveTo(midX - 6, 2);
      ctx.lineTo(midX - 6, 34);
      ctx.moveTo(midX + 6, 8);
      ctx.lineTo(midX + 6, 28);
      ctx.moveTo(midX + 22, 2);
      ctx.lineTo(midX + 22, 34);
      ctx.stroke();
      ctx.fillStyle = "#8FA39D";
      ctx.font = "11px monospace";
      ctx.fillText("+", midX - 26, 46);
      ctx.fillText("-", midX + 18, 46);
    }

    function drawElectrodes() {
      if (!ctx) return;
      const { reaction: r, anodeDissolveFraction: adf, copperFraction: cf } = propsRef.current;

      // anode
      const anodeH = ELECTRODE_BOTTOM - ELECTRODE_TOP - (r.anodeDissolves ? adf * 120 : 0);
      const anodeBaseColor = r.anodeDissolves ? "#B87333" : "#4A4A4A";
      ctx.fillStyle = anodeBaseColor;
      ctx.fillRect(ANODE_X, ELECTRODE_TOP, ELECTRODE_W, Math.max(10, anodeH));

      // cathode
      ctx.fillStyle = "#4A4A4A";
      ctx.fillRect(CATHODE_X, ELECTRODE_TOP, ELECTRODE_W, ELECTRODE_BOTTOM - ELECTRODE_TOP);
      if (r.copperDeposits) {
        const layerH = (ELECTRODE_BOTTOM - ELECTRODE_TOP) * Math.min(1, cf);
        ctx.fillStyle = "#B87333";
        ctx.fillRect(CATHODE_X - 3, ELECTRODE_BOTTOM - layerH, ELECTRODE_W + 6, layerH);
      }

      ctx.fillStyle = "#8FA39D";
      ctx.font = "11px sans-serif";
      ctx.fillText("Anode (+)", ANODE_X - 18, ELECTRODE_TOP - 8);
      ctx.fillText("Cathode (-)", CATHODE_X - 12, ELECTRODE_TOP - 8);
    }

    function step() {
      if (!ctx || !canvas) return;
      const { reaction: r, speedMultiplier: speed, voltageV: v, started: isStarted } = propsRef.current;
      const driftSpeed = isStarted ? 0.25 * speed * (0.6 + v / 12) : 0;

      // background
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0D1412";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#DCEFFB";
      ctx.globalAlpha = 0.14;
      ctx.fillRect(ANODE_X - 40, SOLUTION_TOP, CATHODE_X - ANODE_X + 80, SOLUTION_BOTTOM - SOLUTION_TOP);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#2A3A37";
      ctx.lineWidth = 2;
      ctx.strokeRect(ANODE_X - 40, SOLUTION_TOP, CATHODE_X - ANODE_X + 80, SOLUTION_BOTTOM - SOLUTION_TOP);

      drawBattery();
      drawElectrodes();

      // particles
      const minX = ANODE_X - 30;
      const maxX = CATHODE_X + 30;
      particlesRef.current.forEach((p) => {
        p.x += p.vx * driftSpeed;
        p.y += p.vy;
        if (p.y < SOLUTION_TOP + 12 || p.y > SOLUTION_BOTTOM - 12) p.vy *= -1;
        if (p.x > maxX || p.x < minX) {
          p.x = p.vx > 0 ? minX + 10 : maxX - 10;
          p.y = SOLUTION_TOP + 15 + Math.random() * (SOLUTION_BOTTOM - SOLUTION_TOP - 30);
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.fillStyle = "#0D1412";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.label, p.x, p.y + 3);
      });
      ctx.textAlign = "left";

      // bubbles
      bubbleTimerRef.current += 1;
      const spawnEvery = Math.max(6, 22 - speed * 4);
      if (isStarted && bubbleTimerRef.current % spawnEvery === 0) {
        if (r.anodeBubbles) {
          bubblesRef.current.push({
            x: ANODE_X + ELECTRODE_W / 2 + (Math.random() - 0.5) * 8,
            y: ELECTRODE_BOTTOM - 4,
            r: 2 + Math.random() * 2,
            vy: -0.6 - Math.random() * 0.4,
            opacity: 0.85,
            color: r.anodeBubbleColor || "#EEF2F1",
          });
        }
        if (r.cathodeBubbles) {
          bubblesRef.current.push({
            x: CATHODE_X + ELECTRODE_W / 2 + (Math.random() - 0.5) * 8,
            y: ELECTRODE_BOTTOM - 4,
            r: 2 + Math.random() * 2,
            vy: -0.6 - Math.random() * 0.4,
            opacity: 0.85,
            color: r.cathodeBubbleColor || "#EEF2F1",
          });
        }
      }
      bubblesRef.current.forEach((b) => {
        b.y += b.vy * speed;
        b.opacity -= 0.006 * speed;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = Math.max(0, b.opacity);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      bubblesRef.current = bubblesRef.current.filter((b) => b.opacity > 0 && b.y > SOLUTION_TOP);

      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="max-w-full rounded border border-[#2A3A37]"
      style={{ background: "#0D1412" }}
    />
  );
}
