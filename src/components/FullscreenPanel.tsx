import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from "react";

/**
 * Global fullscreen wrapper for any simulator visual (canvas, SVG diagram, 3D scene).
 * Copy to: src/components/FullscreenPanel.tsx
 *
 * Usage (typical): replace the card <div> around a visual with <FullscreenPanel>:
 *
 *   <FullscreenPanel aspect={W / H} controls={<PlaybackControls ... />}>
 *     <canvas ... />
 *   </FullscreenPanel>
 *
 * Sizing in fullscreen (pick what matches the child):
 *  - `aspect` set         -> content is as wide as fits in the viewport height at that
 *                            width/height ratio. Use for <canvas> (keeps click mapping exact).
 *  - default              -> responsive <svg viewBox> children are capped to the stage height.
 *  - fit="height"         -> fixed-size <svg> children are scaled up to `fitHeight`.
 *  - children that size themselves from `var(--fs-h)` (e.g. 3D scenes) get the full stage height.
 *
 * Uses the Fullscreen API where available (Android, desktop, iPad) and falls back to a
 * fixed full-viewport overlay where it is not (iPhone Safari).
 */
export interface FullscreenPanelProps {
  children: ReactNode;
  /** canvas width / height. Keeps a canvas undistorted in fullscreen. */
  aspect?: number;
  /** "svg" (default): cap responsive SVGs to the stage height. "height": scale fixed-size SVGs to `fitHeight`. */
  fit?: "svg" | "height";
  /** CSS length used when fit="height", e.g. "40dvh". */
  fitHeight?: string;
  /** Rendered under the visual in both modes (playback buttons etc.). */
  controls?: ReactNode;
  /** Small hint text under the visual. */
  caption?: ReactNode;
  /** Normal-mode card styling. Default = the standard dark card. Pass "" for no card. */
  cardClassName?: string;
  /** Layout classes for the content wrapper (e.g. "flex flex-col items-center gap-4"). */
  contentClassName?: string;
}

const DEFAULT_CARD = "rounded border border-[#2A3A37] bg-[#0D1412] p-4";
const STAGE_H = "70dvh";

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function nativeFullscreenElement(): Element | null {
  const d = document as FsDocument;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

async function exitNative() {
  const d = document as FsDocument;
  try {
    await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
  } catch {
    /* already exited */
  }
}

export default function FullscreenPanel({
  children,
  aspect,
  fit = "svg",
  fitHeight = "40dvh",
  controls,
  caption,
  cardClassName = DEFAULT_CARD,
  contentClassName = "",
}: FullscreenPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const usingFallbackRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exit = useCallback(async () => {
    if (nativeFullscreenElement()) await exitNative();
    usingFallbackRef.current = false;
    setIsFullscreen(false);
  }, []);

  const enter = useCallback(async () => {
    const el = panelRef.current as FsElement | null;
    if (!el) return;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request) {
      try {
        await request();
        usingFallbackRef.current = false;
        setIsFullscreen(true);
        // best effort: wide visuals suit landscape (Android only; ignored elsewhere)
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        orientation?.lock?.("landscape").catch(() => {});
        return;
      } catch {
        /* fall through to the CSS fallback */
      }
    }
    usingFallbackRef.current = true;
    setIsFullscreen(true);
  }, []);

  // keep state in sync when the user leaves via the back gesture / Esc
  useEffect(() => {
    function onChange() {
      if (usingFallbackRef.current) return;
      const active = nativeFullscreenElement() === panelRef.current;
      setIsFullscreen(active);
      if (!active) screen.orientation?.unlock?.();
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  // fallback mode: lock page scroll, allow Esc
  useEffect(() => {
    if (!isFullscreen || !usingFallbackRef.current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") void exit();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen, exit]);

  // leaving the mode/tab while fullscreen must not leave the page stuck
  useEffect(() => {
    return () => {
      if (nativeFullscreenElement()) void exitNative();
    };
  }, []);

  const fitClass =
    fit === "height"
      ? "[&_svg]:!h-[var(--fs-svg-h)] [&_svg]:!w-auto"
      : "[&_svg]:max-h-[var(--fs-h)]";
  const canvasClass = aspect ? "[&_canvas]:!h-auto [&_canvas]:!w-full" : "";

  const contentStyle: CSSProperties | undefined = isFullscreen
    ? {
        "--fs-h": STAGE_H,
        "--fs-svg-h": fitHeight,
        ...(aspect ? { width: `min(100%, calc(${STAGE_H} * ${aspect}))` } : {}),
      } as CSSProperties
    : undefined;

  return (
    <div
      ref={panelRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col items-center gap-3 overflow-auto bg-[#0D1412] p-3 pt-14"
          : `relative ${cardClassName}`
      }
    >
      <button
        type="button"
        onClick={isFullscreen ? exit : enter}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded border border-[#2A3A37] bg-[#121A18]/80 text-lg text-[#ECF2F0] hover:border-[#5FC7B8]"
      >
        {isFullscreen ? "✕" : "⛶"}
      </button>

      <div
        className={`${isFullscreen ? `my-auto w-full ${fitClass} ${canvasClass}` : "w-full"} ${contentClassName}`}
        style={contentStyle}
      >
        {children}
      </div>

      {caption && <div className="text-center text-[10px] text-[#5C726C]">{caption}</div>}

      {controls && <div className={isFullscreen ? "w-full max-w-2xl" : "mt-3"}>{controls}</div>}
    </div>
  );
}
