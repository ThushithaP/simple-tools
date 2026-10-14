import { useMemo } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";

const LAYER_COLORS = ["#5FC7B8", "#E8A33D", "#4A90E2", "#E85A4A", "#6FCF7A", "#B98BD9", "#F2D14E"];

// THREE.BoxGeometry's default material groups, in order: +x, -x, +y, -y, +z, -z
export const BOX_FACE_NAMES = ["Right", "Left", "Top", "Bottom", "Front", "Back"];

export function cubeKey(ix: number, iy: number, iz: number): string {
  return `${ix}-${iy}-${iz}`;
}

export function faceKey(cubeKeyStr: string, faceIndex: number): string {
  return `${cubeKeyStr}:${faceIndex}`;
}

interface UnitCubesSceneProps {
  x: number;
  y: number;
  z: number;
  explodeFactor: number; // 0..1
  cubeSize?: number;
  removedCubes: Set<string>;
  customFaceColors: Record<string, string>;
  onCubeClick: (cubeKeyStr: string, faceIndex: number, ix: number, iy: number, iz: number) => void;
}

function Cube({
  cubeKeyStr,
  position,
  layerColor,
  customFaceColors,
  size,
  onClick,
}: {
  cubeKeyStr: string;
  position: [number, number, number];
  layerColor?: string;
  customFaceColors: Record<string, string>;
  size: number;
  onClick: (faceIndex: number) => void;
}) {
  const geometry = useMemo(() => new THREE.BoxGeometry(size * 0.94, size * 0.94, size * 0.94), [size]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    const faceIndex = e.face?.materialIndex ?? 0;
    onClick(faceIndex);
  }

  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow receiveShadow onClick={handleClick}>
        {BOX_FACE_NAMES.map((_, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={customFaceColors[faceKey(cubeKeyStr, i)] ?? layerColor} />
        ))}
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#1A2422" />
      </lineSegments>
    </group>
  );
}

export default function UnitCubesScene({ x, y, z, explodeFactor, cubeSize = 0.6, removedCubes, customFaceColors, onCubeClick }: UnitCubesSceneProps) {
  const gap = cubeSize * (1 + explodeFactor * 1.8);
  const cubes = useMemo(() => {
    const list: { key: string; ix: number; iy: number; iz: number; position: [number, number, number]; layerColor: string }[] = [];
    const originX = ((x - 1) * gap) / 2;
    const originY = ((y - 1) * gap) / 2;
    const originZ = ((z - 1) * gap) / 2;
    for (let iy = 0; iy < y; iy++) {
      const layerColor = LAYER_COLORS[iy % LAYER_COLORS.length];
      for (let ix = 0; ix < x; ix++) {
        for (let iz = 0; iz < z; iz++) {
          list.push({
            key: cubeKey(ix, iy, iz),
            ix,
            iy,
            iz,
            position: [ix * gap - originX, iy * gap - originY, iz * gap - originZ],
            layerColor,
          });
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y, z, gap]);

  const camDist = Math.max(4, (Math.max(x, y, z) * gap) / 1.3);

  return (
    <div className="rounded border border-[#2A3A37] bg-[#0D1412]" style={{ height: 420 }}>
      <Canvas shadows camera={{ position: [camDist, camDist * 0.8, camDist], fov: 45 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 4]} intensity={1} castShadow />
        <directionalLight position={[-4, -2, -4]} intensity={0.25} />
        {cubes
          .filter((c) => !removedCubes.has(c.key))
          .map((c) => (
            <Cube
              key={c.key}
              cubeKeyStr={c.key}
              position={c.position}
              // layerColor={c.layerColor}
              customFaceColors={customFaceColors}
              size={cubeSize}
              onClick={(faceIndex) => onCubeClick(c.key, faceIndex, c.ix, c.iy, c.iz)}
            />
          ))}
        <Grid args={[20, 20]} cellColor="#2A3A37" sectionColor="#3A4B48" position={[0, -((y - 1) * gap) / 2 - cubeSize, 0]} fadeDistance={20} />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
