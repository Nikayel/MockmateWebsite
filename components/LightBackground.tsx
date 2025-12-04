'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Lightweight particle field - much simpler than neural network
 * Optimized for performance with minimal GPU usage
 */

interface ParticleFieldProps {
  count?: number;
  color?: string;
}

function ParticleField({ count = 100, color = '#00d9ff' }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random positions once
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  // Simple rotation animation - very lightweight
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.01) * 0.1;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export interface LightBackgroundProps {
  className?: string;
  particleCount?: number;
  color?: string;
  secondaryColor?: string;
}

export function LightBackground({
  className = '',
  particleCount = 80,
  color = '#00d9ff',
  secondaryColor = '#00ff88',
}: LightBackgroundProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className={className} />;
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={1} // Force low DPR for performance
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['transparent']} />
        <ParticleField count={particleCount} color={color} />
        <ParticleField count={Math.floor(particleCount / 2)} color={secondaryColor} />
      </Canvas>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />
    </div>
  );
}

export default LightBackground;
