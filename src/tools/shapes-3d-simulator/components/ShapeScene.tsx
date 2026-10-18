import { useMemo, useRef } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { ShapeDimensions, ShapeKind, RenderMode } from "../types";
import { buildFaceGroups, FaceGroup } from "../geometryBuilders";

interface ShapeSceneProps {
  shapeKind: ShapeKind;
  dimensions: ShapeDimensions;
  renderMode: RenderMode;
  baseColor: string;
  faceColors: Record<string, string>;
  selectedFaceId: string | null;
  onSelectFace: (group: FaceGroup | null) => void;
  showEdges: boolean;
  showAxes: boolean;
}

function FaceMesh({
  group,
  color,
  renderMode,
  selected,
  onSelect,
}: {
  group: FaceGroup;
  color: string;
  renderMode: RenderMode;
  selected: boolean;
  onSelect: () => void;
}) {
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(group.geometry, 20), [group.geometry]);

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onSelect();
  }

  return (
    <group>
      <mesh geometry={group.geometry} onClick={handleClick} castShadow receiveShadow>
        <meshStandardMaterial
          color={selected ? "#E8A33D" : color}
          wireframe={renderMode === "wireframe"}
          transparent={renderMode === "transparent" || selected}
          opacity={renderMode === "transparent" ? 0.45 : selected ? 0.9 : 1}
          side={THREE.DoubleSide}
          emissive={selected ? new THREE.Color("#E8A33D") : new THREE.Color(0, 0, 0)}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color="#1A2422" />
      </lineSegments>
    </group>
  );
}

function ShapeGroup(props: Omit<ShapeSceneProps, "onSelectFace"> & { onSelectFace: (g: FaceGroup | null) => void }) {
  const groups = useMemo(() => buildFaceGroups(props.shapeKind, props.dimensions), [props.shapeKind, props.dimensions]);

  return (
    <group>
      {groups.map((g) => (
        <FaceMesh
          key={g.id}
          group={g}
          color={props.faceColors[g.id] ?? props.baseColor}
          renderMode={props.renderMode}
          selected={props.selectedFaceId === g.id}
          onSelect={() => props.onSelectFace(g)}
        />
      ))}
    </group>
  );
}

export default function ShapeScene(props: ShapeSceneProps) {
  const controlsRef = useRef(null);

  return (
    <div className="rounded border border-[#2A3A37] bg-[#0D1412]" style={{ height: "var(--fs-h, 420px)" }}>
      <Canvas shadows camera={{ position: [4, 3.2, 5], fov: 45 }} onPointerMissed={() => props.onSelectFace(null)}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 4]} intensity={1} castShadow />
        <directionalLight position={[-4, -2, -4]} intensity={0.25} />

        <ShapeGroup {...props} />

        {props.showAxes && (
          <group>
            <axesHelper args={[2.5]} />
          </group>
        )}
        <Grid args={[10, 10]} cellColor="#2A3A37" sectionColor="#3A4B48" position={[0, -1.8, 0]} fadeDistance={12} />
        <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
