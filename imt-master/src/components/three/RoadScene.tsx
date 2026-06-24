"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   Types & Props
   ================================================================ */

export interface RoadSceneProps {
  viewMode: "driver" | "topdown" | "aerial";
  onCarClick?: (carId: string) => void;
  animatingCar?: string | null;
  correctCar?: string | null;
  showResult?: boolean;
}

/* ================================================================
   Constants
   ================================================================ */

const ROAD_WIDTH = 3.6;
const ROAD_LENGTH = 20;
const ASPHALT_COLOR = "#2a2a2a";
const MARKING_COLOR = "#e0e0e0";
const EDGE_LINE_COLOR = "#ffffff";

const CAR_CONFIGS: {
  id: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  direction: [number, number, number];
}[] = [
  {
    id: "car-north",
    color: "#ef4444",
    position: [0.9, 0, -7],
    rotation: 0,
    direction: [0, 0, 1],
  },
  {
    id: "car-south",
    color: "#3b82f6",
    position: [-0.9, 0, 7],
    rotation: Math.PI,
    direction: [0, 0, -1],
  },
  {
    id: "car-east",
    color: "#eab308",
    position: [7, 0, 0.9],
    rotation: -Math.PI / 2,
    direction: [-1, 0, 0],
  },
  {
    id: "car-west",
    color: "#22c55e",
    position: [-7, 0, -0.9],
    rotation: Math.PI / 2,
    direction: [1, 0, 0],
  },
];

/* ================================================================
   Sub-components
   ================================================================ */

/* ---------- Car Mesh ---------- */

function CarMesh({
  id,
  color,
  position,
  rotation,
  onClick,
  animating,
  direction,
  showResult,
  isCorrect,
}: {
  id: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  onClick?: (id: string) => void;
  animating: boolean;
  direction: [number, number, number];
  showResult?: boolean;
  isCorrect?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  /* Reset progress when animating changes */
  useEffect(() => {
    progressRef.current = 0;
  }, [animating]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (animating && progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta * 0.4, 1);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const travel = ease * 14;
      groupRef.current.position.set(
        position[0] + direction[0] * travel,
        position[1],
        position[2] + direction[2] * travel
      );
    }
  });

  const emissiveColor = hovered ? "#ffffff" : "#000000";
  const emissiveIntensity = hovered ? 0.15 : 0;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(id);
      }}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 2.4]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.65, -0.15]} castShadow>
        <boxGeometry args={[1.0, 0.35, 1.3]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Windshield (front) */}
      <mesh position={[0, 0.65, 0.5]} rotation={[0.25, 0, 0]}>
        <planeGeometry args={[0.9, 0.32]} />
        <meshStandardMaterial
          color="#88ccee"
          transparent
          opacity={0.5}
          metalness={0.9}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 0.65, -0.8]} rotation={[-0.25, Math.PI, 0]}>
        <planeGeometry args={[0.9, 0.32]} />
        <meshStandardMaterial
          color="#88ccee"
          transparent
          opacity={0.5}
          metalness={0.9}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wheels */}
      {[
        [-0.65, 0.15, 0.7],
        [0.65, 0.15, 0.7],
        [-0.65, 0.15, -0.7],
        [0.65, 0.15, -0.7],
      ].map((pos, i) => (
        <mesh
          key={i}
          position={pos as [number, number, number]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.15, 0.15, 0.2, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      ))}
      {/* Headlights */}
      {[
        [-0.4, 0.35, 1.21],
        [0.4, 0.35, 1.21],
      ].map((pos, i) => (
        <mesh key={`hl-${i}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#ffffcc"
            emissive="#ffffaa"
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
      {/* Taillights */}
      {[
        [-0.4, 0.35, -1.21],
        [0.4, 0.35, -1.21],
      ].map((pos, i) => (
        <mesh key={`tl-${i}`} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#ff3333"
            emissive="#ff0000"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      {/* Result indicator ring */}
      {showResult && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.7, 32]} />
          <meshStandardMaterial
            color={isCorrect ? "#22c55e" : "#ef4444"}
            emissive={isCorrect ? "#22c55e" : "#ef4444"}
            emissiveIntensity={1}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/* ---------- Ground / Road ---------- */

function AsphaltGround() {
  return (
    <mesh
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#3d5c3a" roughness={1} />
    </mesh>
  );
}

function RoadSurface({
  width,
  length,
  position,
  rotation,
}: {
  width: number;
  length: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <mesh
      receiveShadow
      position={position}
      rotation={rotation}
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color={ASPHALT_COLOR} roughness={0.85} />
    </mesh>
  );
}

function Intersection() {
  const halfW = ROAD_WIDTH;

  return (
    <group>
      {/* North-South road */}
      <RoadSurface
        width={ROAD_WIDTH * 2}
        length={ROAD_LENGTH}
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* East-West road */}
      <RoadSurface
        width={ROAD_LENGTH}
        length={ROAD_WIDTH * 2}
        position={[0, 0.006, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Center dashed line - North-South */}
      {Array.from({ length: 6 }).map((_, i) => {
        const z = -9 + i * 1.5;
        if (Math.abs(z) < halfW + 0.5) return null;
        return (
          <mesh
            key={`ns-${i}`}
            position={[0, 0.015, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.12, 0.8]} />
            <meshStandardMaterial color={MARKING_COLOR} />
          </mesh>
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const z = 3.5 + i * 1.5;
        if (Math.abs(z) < halfW + 0.5) return null;
        return (
          <mesh
            key={`ns2-${i}`}
            position={[0, 0.015, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.12, 0.8]} />
            <meshStandardMaterial color={MARKING_COLOR} />
          </mesh>
        );
      })}

      {/* Center dashed line - East-West */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -9 + i * 1.5;
        if (Math.abs(x) < halfW + 0.5) return null;
        return (
          <mesh
            key={`ew-${i}`}
            position={[x, 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.8, 0.12]} />
            <meshStandardMaterial color={MARKING_COLOR} />
          </mesh>
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = 3.5 + i * 1.5;
        if (Math.abs(x) < halfW + 0.5) return null;
        return (
          <mesh
            key={`ew2-${i}`}
            position={[x, 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.8, 0.12]} />
            <meshStandardMaterial color={MARKING_COLOR} />
          </mesh>
        );
      })}

      {/* Solid edge lines - North road */}
      {[ROAD_WIDTH, -ROAD_WIDTH].map((xOff) => (
        <React.Fragment key={`edge-n-${xOff}`}>
          <mesh
            position={[xOff, 0.015, -((ROAD_LENGTH + halfW) / 2)]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.1, ROAD_LENGTH / 2 - halfW]} />
            <meshStandardMaterial color={EDGE_LINE_COLOR} />
          </mesh>
          <mesh
            position={[xOff, 0.015, (ROAD_LENGTH + halfW) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.1, ROAD_LENGTH / 2 - halfW]} />
            <meshStandardMaterial color={EDGE_LINE_COLOR} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Solid edge lines - East-West */}
      {[ROAD_WIDTH, -ROAD_WIDTH].map((zOff) => (
        <React.Fragment key={`edge-ew-${zOff}`}>
          <mesh
            position={[-((ROAD_LENGTH + halfW) / 2), 0.015, zOff]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[ROAD_LENGTH / 2 - halfW, 0.1]} />
            <meshStandardMaterial color={EDGE_LINE_COLOR} />
          </mesh>
          <mesh
            position={[(ROAD_LENGTH + halfW) / 2, 0.015, zOff]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[ROAD_LENGTH / 2 - halfW, 0.1]} />
            <meshStandardMaterial color={EDGE_LINE_COLOR} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Stop lines at intersection */}
      {[
        { pos: [0.9, 0.015, -ROAD_WIDTH] as [number, number, number], w: ROAD_WIDTH - 0.2, h: 0.2 },
        { pos: [-0.9, 0.015, ROAD_WIDTH] as [number, number, number], w: ROAD_WIDTH - 0.2, h: 0.2 },
        { pos: [-ROAD_WIDTH, 0.015, 0.9] as [number, number, number], w: 0.2, h: ROAD_WIDTH - 0.2 },
        { pos: [ROAD_WIDTH, 0.015, -0.9] as [number, number, number], w: 0.2, h: ROAD_WIDTH - 0.2 },
      ].map((line, i) => (
        <mesh
          key={`stop-${i}`}
          position={line.pos}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[line.w, line.h]} />
          <meshStandardMaterial color={EDGE_LINE_COLOR} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Path Trail ---------- */

function PathTrail({
  carId,
  position,
  direction,
  isCorrect,
}: {
  carId: string;
  position: [number, number, number];
  direction: [number, number, number];
  isCorrect: boolean;
}) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push([
        position[0] + direction[0] * t * 14,
        0.05,
        position[2] + direction[2] * t * 14,
      ]);
    }
    return pts;
  }, [carId, position, direction]);

  const color = isCorrect ? "#22c55e" : "#ef4444";

  return (
    <Line
      points={points}
      color={color}
      lineWidth={4}
      transparent
      opacity={0.7}
    />
  );
}

/* ---------- Lighting ---------- */

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#b0c4de" />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#ffd4a0" />
      <hemisphereLight
        args={["#87ceeb", "#3d5c3a", 0.4]}
      />
    </>
  );
}

/* ================================================================
   Camera Controller
   ================================================================ */

function CameraController({ viewMode }: { viewMode: "driver" | "topdown" | "aerial" }) {
  const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const isTopDown = viewMode === "topdown" || viewMode === "aerial";

  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;
    if (isTopDown) {
      c.object.position.set(0, 20, 0.1);
      c.target.set(0, 0, 0);
    } else {
      c.object.position.set(-6, 2.5, 8);
      c.target.set(0, 0, 0);
    }
    c.update();
  }, [isTopDown]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={35}
      maxPolarAngle={isTopDown ? Math.PI / 6 : Math.PI / 2.1}
    />
  );
}

/* ================================================================
   Main Scene Component
   ================================================================ */

export default function RoadScene({
  viewMode,
  onCarClick,
  animatingCar,
  correctCar,
  showResult = false,
}: RoadSceneProps) {
  return (
    <group>
      <SceneLighting />
      <CameraController viewMode={viewMode} />
      <AsphaltGround />
      <Intersection />

      {CAR_CONFIGS.map((car) => (
        <React.Fragment key={car.id}>
          <CarMesh
            id={car.id}
            color={car.color}
            position={car.position}
            rotation={car.rotation}
            direction={car.direction}
            onClick={onCarClick}
            animating={animatingCar === car.id}
            showResult={showResult && (animatingCar === car.id || correctCar === car.id)}
            isCorrect={correctCar === car.id}
          />
          {showResult && (animatingCar === car.id || correctCar === car.id) && (
            <PathTrail
              carId={car.id}
              position={car.position}
              direction={car.direction}
              isCorrect={correctCar === car.id}
            />
          )}
        </React.Fragment>
      ))}

      {/* Fog for depth */}
      <fog attach="fog" args={["#1a1a2e", 20, 50]} />
    </group>
  );
}
