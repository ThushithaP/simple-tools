export default function BandBendingDiagram({ builtInV, biasV }: { builtInV: number; biasV: number }) {
  const W = 480;
  const H = 150;
  const barrier = Math.max(0.05, builtInV - biasV);
  const bendPx = Math.min(70, barrier * 50);
  const baseY = 50;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="Junction band bending diagram">
      <rect x={0} y={0} width={W} height={H} fill="#0D1412" />
      <polyline points={`20,${baseY} 190,${baseY} 290,${baseY + bendPx} ${W - 20},${baseY + bendPx}`} fill="none" stroke="#4A90E2" strokeWidth={2.2} />
      <polyline
        points={`20,${baseY + 70} 190,${baseY + 70} 290,${baseY + 70 + bendPx} ${W - 20},${baseY + 70 + bendPx}`}
        fill="none"
        stroke="#E85A4A"
        strokeWidth={2.2}
      />
      <line x1={20} x2={W - 20} y1={baseY + 35 + bendPx / 2} y2={baseY + 35 + bendPx / 2} stroke="#ECF2F0" strokeWidth={1} strokeDasharray="5 3" opacity={0.6} />
      <text x={22} y={baseY - 6} fontSize="9" fill="#8FA39D">
        p-side
      </text>
      <text x={W - 60} y={baseY + bendPx - 6} fontSize="9" fill="#8FA39D">
        n-side
      </text>
      <text x={200} y={baseY + bendPx / 2 + 40} fontSize="9" fill="#E8A33D">
        q(V_bi−V) = {barrier.toFixed(2)} eV
      </text>
    </svg>
  );
}
