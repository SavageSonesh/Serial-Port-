"use client";

import React, { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

/* ================================================================
   Types & Props
   ================================================================ */

export type SignShape =
  | "circle"
  | "triangle"
  | "octagon"
  | "rectangle"
  | "inverted-triangle"
  | "diamond";

export interface RoadSignModelProps {
  signType: SignShape;
  primaryColor?: string;
  secondaryColor?: string;
  symbol?: string;
  label?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

/* ================================================================
   Shape Geometry Builders
   ================================================================ */

function useSignShape(signType: SignShape) {
  return useMemo(() => {
    const shape = new THREE.Shape();

    switch (signType) {
      case "circle": {
        const r = 0.55;
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        break;
      }
      case "triangle": {
        const s = 0.65;
        shape.moveTo(0, s);
        shape.lineTo(-s * 0.866, -s * 0.5);
        shape.lineTo(s * 0.866, -s * 0.5);
        shape.closePath();
        break;
      }
      case "inverted-triangle": {
        const s = 0.65;
        shape.moveTo(0, -s);
        shape.lineTo(-s * 0.866, s * 0.5);
        shape.lineTo(s * 0.866, s * 0.5);
        shape.closePath();
        break;
      }
      case "octagon": {
        const r = 0.6;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        shape.closePath();
        break;
      }
      case "rectangle": {
        shape.moveTo(-0.5, -0.35);
        shape.lineTo(0.5, -0.35);
        shape.lineTo(0.5, 0.35);
        shape.lineTo(-0.5, 0.35);
        shape.closePath();
        break;
      }
      case "diamond": {
        const s = 0.55;
        shape.moveTo(0, s);
        shape.lineTo(s, 0);
        shape.lineTo(0, -s);
        shape.lineTo(-s, 0);
        shape.closePath();
        break;
      }
    }

    return new THREE.ShapeGeometry(shape);
  }, [signType]);
}

/* Border geometry (slightly larger) */
function useSignBorderShape(signType: SignShape) {
  return useMemo(() => {
    const shape = new THREE.Shape();
    const scale = 1.12;

    switch (signType) {
      case "circle": {
        const r = 0.55 * scale;
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        break;
      }
      case "triangle": {
        const s = 0.65 * scale;
        shape.moveTo(0, s);
        shape.lineTo(-s * 0.866, -s * 0.5);
        shape.lineTo(s * 0.866, -s * 0.5);
        shape.closePath();
        break;
      }
      case "inverted-triangle": {
        const s = 0.65 * scale;
        shape.moveTo(0, -s);
        shape.lineTo(-s * 0.866, s * 0.5);
        shape.lineTo(s * 0.866, s * 0.5);
        shape.closePath();
        break;
      }
      case "octagon": {
        const r = 0.6 * scale;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        shape.closePath();
        break;
      }
      case "rectangle": {
        const w = 0.5 * scale;
        const h = 0.35 * scale;
        shape.moveTo(-w, -h);
        shape.lineTo(w, -h);
        shape.lineTo(w, h);
        shape.lineTo(-w, h);
        shape.closePath();
        break;
      }
      case "diamond": {
        const s = 0.55 * scale;
        shape.moveTo(0, s);
        shape.lineTo(s, 0);
        shape.lineTo(0, -s);
        shape.lineTo(-s, 0);
        shape.closePath();
        break;
      }
    }

    return new THREE.ShapeGeometry(shape);
  }, [signType]);
}

/* ================================================================
   Main Component
   ================================================================ */

export default function RoadSignModel({
  signType,
  primaryColor = "#cc0000",
  secondaryColor = "#ffffff",
  symbol = "",
  label = "",
  onClick,
  isSelected = false,
}: RoadSignModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const signFaceRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const faceGeometry = useSignShape(signType);
  const borderGeometry = useSignBorderShape(signType);

  /* Idle rotation + hover tilt */
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    /* Slow idle rotation */
    if (!hovered && !isSelected) {
      groupRef.current.rotation.y += delta * 0.15;
    }

    /* Hover tilt */
    if (signFaceRef.current) {
      const targetTiltX = hovered ? 0.08 : 0;
      const targetTiltZ = hovered ? 0.06 : 0;
      signFaceRef.current.rotation.x = THREE.MathUtils.lerp(
        signFaceRef.current.rotation.x,
        targetTiltX,
        0.08
      );
      signFaceRef.current.rotation.z = THREE.MathUtils.lerp(
        signFaceRef.current.rotation.z,
        targetTiltZ,
        0.08
      );
    }

    /* Click scale */
    const targetScale = isSelected ? 1.08 : hovered ? 1.04 : 1;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  /* Text sizing based on sign type */
  const symbolFontSize = signType === "rectangle" ? 0.2 : 0.3;
  const symbolYOffset = label ? 0.08 : 0;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
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
      {/* Sign post (metal cylinder) */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 1.4, 12]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Sign face group (for tilt animation) */}
      <group ref={signFaceRef} position={[0, 1.5, 0]}>
        {/* Border / backing */}
        <mesh position={[0, 0, -0.02]} castShadow>
          <primitive object={borderGeometry} attach="geometry" />
          <meshStandardMaterial
            color={secondaryColor}
            metalness={0.1}
            roughness={0.5}
          />
        </mesh>

        {/* Main sign face */}
        <mesh castShadow>
          <primitive object={faceGeometry} attach="geometry" />
          <meshStandardMaterial
            color={primaryColor}
            metalness={0.1}
            roughness={0.4}
          />
        </mesh>

        {/* Symbol text */}
        {symbol && (
          <Text
            position={[0, symbolYOffset, 0.02]}
            fontSize={symbolFontSize}
            color={secondaryColor}
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
            maxWidth={0.8}
          >
            {symbol}
          </Text>
        )}

        {/* Label text */}
        {label && (
          <Text
            position={[0, -0.2, 0.02]}
            fontSize={0.1}
            color={secondaryColor}
            anchorX="center"
            anchorY="middle"
            maxWidth={0.8}
          >
            {label}
          </Text>
        )}

        {/* Sign back (dark grey) */}
        <mesh position={[0, 0, -0.04]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.3, 1.3]} />
          <meshStandardMaterial color="#555555" roughness={0.8} />
        </mesh>
      </group>

      {/* Selection glow ring at base */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.5, 32]} />
          <meshStandardMaterial
            color="#6366f1"
            emissive="#6366f1"
            emissiveIntensity={1.5}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Hover highlight ring */}
      {hovered && !isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.4, 32]} />
          <meshStandardMaterial
            color="#a5b4fc"
            emissive="#a5b4fc"
            emissiveIntensity={0.8}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
