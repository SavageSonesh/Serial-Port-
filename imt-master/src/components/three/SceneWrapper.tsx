"use client";

import React, { Suspense, Component, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import * as THREE from "three";

/* ---------- Error Boundary ---------- */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center w-full h-full min-h-[300px] bg-gray-900 rounded-2xl border border-gray-700">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                3D View Unavailable
              </h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Your browser does not support WebGL or an error occurred.
                The interactive 3D scene cannot be displayed.
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/* ---------- Loading Fallback ---------- */

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

/* ---------- Props ---------- */

interface SceneWrapperProps {
  children: ReactNode;
  className?: string;
  cameraPosition?: [number, number, number];
  showStats?: boolean;
}

/* ---------- SceneWrapper ---------- */

export default function SceneWrapper({
  children,
  className = "",
  cameraPosition = [0, 8, 12],
  showStats = false,
}: SceneWrapperProps) {
  return (
    <WebGLErrorBoundary>
      <div className={`w-full h-full relative ${className}`}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          camera={{
            position: cameraPosition,
            fov: 50,
            near: 0.1,
            far: 200,
          }}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
          {showStats && <Stats />}
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
