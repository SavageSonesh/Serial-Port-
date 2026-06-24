"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   Types & Props
   ================================================================ */

export interface RoundaboutSceneProps {
  onCarClick?: (carId: string) => void;
  selectedCar?: string | null;
  showResult?: boolean;
  isCorrect?: boolean;
}

/* ================================================================
   Constants
   ================================================================ */

const ROUNDABOUT_OUTER = 5;
const ROUNDABOUT_INNER = 3;
const ROAD_WIDTH = 3.2;
const APPROACH_LENGTH = 12;
const ASPHALT = "#2a2a2a";
const MARKING = "#e0e0e0";

interface CarConfig {
  id: string;
  color: string;
  angle: number; // radians around roundabout
  state: "entering" | "inside" | "exiting";
  approachIndex: number; // which approach road (0-3)
}

const CAR_CONFIGS: CarConfig[] = [
  { id: "car-a", color: "#ef4444", angle: Math.PI, state: "entering", approachIndex: 2 },
  { id: "car-b", color: "#3b82f6", angle: Math.PI / 2, state: "inside", approachIndex: 1 },
  { id: "car-c", color: "#eab308", angle: 0, state: "exiting", approachIndex: 0 },
];

/* Approach road angles (0=East, PI/2=North, PI=West, 3PI/2=South) */
const APPROACH_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

/* ================================================================
   Utility
   ================================================================ */

function getPositionForState(car: CarConfig): [number, number, number] {
  const a = APPROACH_ANGLES[car.approachIndex];
  const r = (ROUNDABOUT_OUTER + ROUNDABOUT_INNER) / 2;

  switch (car.state) {
    case "entering": {
      const dist = ROUNDABOUT_OUTER + 2;
      return [Math.cos(a) * dist, 0, Math.sin(a) * dist];
    }
    case "inside": {
      return [Math.cos(car.angle) * r, 0, Math.sin(car.angle) * r];
    }
    case "exiting": {
      const dist = ROUNDABOUT_OUTER + 2.5;
      return [Math.cos(a) * dist, 0, Math.sin(a) * dist];
    }
  }
}

function getRotationForState(car: CarConfig): number {
  const a = APPROACH_ANGLES[car.approachIndex];
  switch (car.state) {
    case "entering":
      return -a + Math.PI;
    case "inside":
      return -car.angle - Math.PI / 2;
    case "exiting":
      return -a;
  }
}

/* Build a curved path from approach road through roundabout */
function buildAnimationPath(car: CarConfig): THREE.Vector3[] {
  const approachAngle = APPROACH_ANGLES[car.approachIndex];
  const r = (ROUNDABOUT_OUTER + ROUNDABOUT_INNER) / 2;
  const points: THREE.Vector3[] = [];

  if (car.state === "entering") {
    /* Start outside, drive to roundabout, curve through, exit opposite */
    const startDist = ROUNDABOUT_OUTER + 3;
    for (let i = 0; i <= 15; i++) {
      const t = i / 15;
      const dist = startDist - t * (startDist - r);
      const angle = approachAngle;
      points.push(new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist));
    }
    /* Curve through roundabout (clockwise for Portugal) */
    const exitAngle = approachAngle - Math.PI;
    const startA = approachAngle;
    const totalArc = -Math.PI; // half circle clockwise
    for (let i = 1; i <= 20; i++) {
      const t = i / 20;
      const a = startA + totalArc * t;
      points.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    /* Exit */
    const normalizedExit = startA + totalArc;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const dist = r + t * 5;
      points.push(new THREE.Vector3(Math.cos(normalizedExit) * dist, 0, Math.sin(normalizedExit) * dist));
    }
  } else if (car.state === "inside") {
    /* Already inside; curve through rest and exit */
    const totalArc = -Math.PI * 0.75;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const a = car.angle + totalArc * t;
      points.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const exitA = car.angle + totalArc;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const dist = r + t * 5;
      points.push(new THREE.Vector3(Math.cos(exitA) * dist, 0, Math.sin(exitA) * dist));
    }
  } else {
    /* Exiting: just drive outward */
    const dist0 = ROUNDABOUT_OUTER + 2.5;
    for (let i = 0; i <= 15; i++) {
      const t = i / 15;
      const dist = dist0 + t * 6;
      points.push(
        new THREE.Vector3(Math.cos(approachAngle) * dist, 0, Math.sin(approachAngle) * dist)
      );
    }
  }

  return points;
}

/* ================================================================
   Sub-components
   ================================================================ */

/* ---------- Car ---------- */

function RoundaboutCar({
  config,
  onClick,
  isSelected,
  animating,
  showResult,
  isCorrect,
}: {
  config: CarConfig;
  onClick?: (id: string) => void;
  isSelected: boolean;
  animating: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  const path = useMemo(() => buildAnimationPath(config), [config]);
  const startPos = useMemo(() => getPositionForState(config), [config]);
  const startRot = useMemo(() => getRotationForState(config), [config]);

  useEffect(() => {
    progressRef.current = 0;
  }, [animating]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (animating && progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta * 0.3, 1);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const idx = Math.min(Math.floor(ease * (path.length - 1)), path.length - 2);
      const frac = ease * (path.length - 1) - idx;
      const p = new THREE.Vector3().lerpVectors(path[idx], path[idx + 1], frac);
      groupRef.current.position.set(p.x, p.y, p.z);

      /* Face direction of travel */
      if (idx < path.length - 2) {
        const dir = new THREE.Vector3().subVectors(path[idx + 1], path[idx]).normalize();
        const angle = Math.atan2(dir.x, dir.z);
        groupRef.current.rotation.y = angle;
      }
    }
  });

  const emissiveColor = hovered || isSelected ? "#ffffff" : "#000000";
  const emissiveIntensity = hovered ? 0.2 : isSelected ? 0.15 : 0;

  return (
    <group
      ref={groupRef}
      position={startPos}
      rotation={[0, startRot, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(config.id);
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
          color={config.color}
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
          color={config.color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Windshield */}
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
      {/* Selection ring */}
      {(isSelected || (showResult && isCorrect !== undefined)) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.4, 1.7, 32]} />
          <meshStandardMaterial
            color={
              showResult
                ? isCorrect
                  ? "#22c55e"
                  : "#ef4444"
                : "#6366f1"
            }
            emissive={
              showResult
                ? isCorrect
                  ? "#22c55e"
                  : "#ef4444"
                : "#6366f1"
            }
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

/* ---------- Roundabout Road ---------- */

function RoundaboutRoad() {
  /* Create the circular road as a ring */
  const circleSegments = 64;

  /* Approach roads */
  const approaches = APPROACH_ANGLES.map((angle) => {
    const cx = Math.cos(angle) * (ROUNDABOUT_OUTER + APPROACH_LENGTH / 2);
    const cz = Math.sin(angle) * (ROUNDABOUT_OUTER + APPROACH_LENGTH / 2);
    const rotation = angle;
    return { cx, cz, rotation };
  });

  /* Roundabout direction arrows (clockwise markings) */
  const arrowAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const arrowR = (ROUNDABOUT_OUTER + ROUNDABOUT_INNER) / 2;

  return (
    <group>
      {/* Roundabout ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[ROUNDABOUT_INNER, ROUNDABOUT_OUTER, circleSegments]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.85} />
      </mesh>

      {/* Center island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[ROUNDABOUT_INNER - 0.3, circleSegments]} />
        <meshStandardMaterial color="#4a7c4a" roughness={0.9} />
      </mesh>

      {/* Center island curb */}
      <mesh position={[0, 0.12, 0]}>
        <torusGeometry args={[ROUNDABOUT_INNER - 0.15, 0.12, 8, circleSegments]} />
        <meshStandardMaterial color="#cccccc" roughness={0.6} />
      </mesh>

      {/* Outer edge curb */}
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[ROUNDABOUT_OUTER + 0.1, 0.08, 8, circleSegments]} />
        <meshStandardMaterial color="#cccccc" roughness={0.6} />
      </mesh>

      {/* Inner lane marking (dashed circle) */}
      {Array.from({ length: 24 }).map((_, i) => {
        if (i % 2 !== 0) return null;
        const a1 = (i / 24) * Math.PI * 2;
        const a2 = ((i + 0.6) / 24) * Math.PI * 2;
        const midA = (a1 + a2) / 2;
        const midR = (ROUNDABOUT_OUTER + ROUNDABOUT_INNER) / 2;
        return (
          <mesh
            key={`dash-${i}`}
            position={[Math.cos(midA) * midR, 0.015, Math.sin(midA) * midR]}
            rotation={[-Math.PI / 2, 0, -midA + Math.PI / 2]}
          >
            <planeGeometry args={[0.6, 0.08]} />
            <meshStandardMaterial color={MARKING} />
          </mesh>
        );
      })}

      {/* Direction arrows on road surface */}
      {arrowAngles.map((a, i) => {
        const x = Math.cos(a) * arrowR;
        const z = Math.sin(a) * arrowR;
        return (
          <mesh
            key={`arrow-${i}`}
            position={[x, 0.016, z]}
            rotation={[-Math.PI / 2, 0, -a - Math.PI / 4]}
          >
            <planeGeometry args={[0.5, 0.15]} />
            <meshStandardMaterial color={MARKING} transparent opacity={0.7} />
          </mesh>
        );
      })}

      {/* Approach roads */}
      {approaches.map((ap, i) => {
        const angle = APPROACH_ANGLES[i];
        return (
          <group key={`approach-${i}`}>
            <mesh
              position={[ap.cx, 0.005, ap.cz]}
              rotation={[-Math.PI / 2, 0, angle]}
              receiveShadow
            >
              <planeGeometry args={[APPROACH_LENGTH, ROAD_WIDTH]} />
              <meshStandardMaterial color={ASPHALT} roughness={0.85} />
            </mesh>
            {/* Center dashed line on approach */}
            {Array.from({ length: 5 }).map((_, j) => {
              const dist = ROUNDABOUT_OUTER + 1.5 + j * 2;
              return (
                <mesh
                  key={`apdash-${i}-${j}`}
                  position={[
                    Math.cos(angle) * dist,
                    0.015,
                    Math.sin(angle) * dist,
                  ]}
                  rotation={[-Math.PI / 2, 0, angle]}
                >
                  <planeGeometry args={[1, 0.1]} />
                  <meshStandardMaterial color={MARKING} />
                </mesh>
              );
            })}
            {/* Solid edge lines */}
            {[-ROAD_WIDTH / 2, ROAD_WIDTH / 2].map((offset) => (
              <mesh
                key={`edge-${i}-${offset}`}
                position={[
                  ap.cx + Math.cos(angle + Math.PI / 2) * offset,
                  0.015,
                  ap.cz + Math.sin(angle + Math.PI / 2) * offset,
                ]}
                rotation={[-Math.PI / 2, 0, angle]}
              >
                <planeGeometry args={[APPROACH_LENGTH, 0.1]} />
                <meshStandardMaterial color={MARKING} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------- Path Indicator ---------- */

function CurvedPathIndicator({
  config,
  isCorrect,
}: {
  config: CarConfig;
  isCorrect: boolean;
}) {
  const points = useMemo(() => {
    const path = buildAnimationPath(config);
    return path.map((v) => [v.x, 0.06, v.z] as [number, number, number]);
  }, [config]);

  return (
    <Line
      points={points}
      color={isCorrect ? "#22c55e" : "#ef4444"}
      lineWidth={4}
      transparent
      opacity={0.7}
    />
  );
}

/* ---------- Ground ---------- */

function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#3d5c3a" roughness={1} />
    </mesh>
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
      <hemisphereLight args={["#87ceeb", "#3d5c3a", 0.4]} />
    </>
  );
}

/* ================================================================
   Main Component
   ================================================================ */

export default function RoundaboutScene({
  onCarClick,
  selectedCar,
  showResult = false,
  isCorrect = false,
}: RoundaboutSceneProps) {
  return (
    <group>
      <SceneLighting />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
      />
      <Ground />
      <RoundaboutRoad />

      {CAR_CONFIGS.map((car) => (
        <React.Fragment key={car.id}>
          <RoundaboutCar
            config={car}
            onClick={onCarClick}
            isSelected={selectedCar === car.id}
            animating={selectedCar === car.id && !showResult}
            showResult={showResult && selectedCar === car.id}
            isCorrect={showResult && selectedCar === car.id ? isCorrect : undefined}
          />
          {showResult && selectedCar === car.id && (
            <CurvedPathIndicator config={car} isCorrect={isCorrect} />
          )}
        </React.Fragment>
      ))}

      <fog attach="fog" args={["#1a1a2e", 25, 55]} />
    </group>
  );
}
