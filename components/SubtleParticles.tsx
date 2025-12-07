'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

/**
 * SubtleParticles - Lightweight Three.js particle effect
 *
 * Design philosophy:
 * - Extremely subtle and non-intrusive
 * - Low particle count for performance
 * - Minimal GPU usage
 * - No mouse interaction (saves resources)
 * - Graceful degradation
 */

interface ParticleFieldProps {
  count?: number;
  color?: string;
  speed?: number;
}

function ParticleField({ count = 30, color = '#00d9ff', speed = 0.3 }: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random positions
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20; // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5; // z
    }
    return pos;
  }, [count]);

  // Animate
  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;

    // Gentle floating animation
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Slow sine wave motion
      posArray[i3 + 1] += Math.sin(time * speed + i) * 0.002;
      posArray[i3] += Math.cos(time * speed * 0.5 + i) * 0.001;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Slow rotation
    pointsRef.current.rotation.y = time * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.4}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export interface SubtleParticlesProps {
  className?: string;
  particleCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const SubtleParticles = React.memo(function SubtleParticles({
  className = '',
  particleCount = 25,
  primaryColor = '#00d9ff',
  secondaryColor = '#00ff88',
}: SubtleParticlesProps) {
  const [isClient, setIsClient] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  // Only render on client
  useEffect(() => {
    setIsClient(true);

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setShouldRender(false);
    }

    // Check for low-end device (less than 4GB RAM or mobile)
    const isLowEnd =
      (navigator as any).deviceMemory < 4 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isLowEnd) {
      setShouldRender(false);
    }
  }, []);

  // Don't render on server or if conditions not met
  if (!isClient || !shouldRender) {
    return <div className={className} />;
  }

  return (
    <div className={`${className} pointer-events-none`}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={1} // Fixed 1x for performance
        performance={{ min: 0.3 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
          stencil: false,
          depth: false,
        }}
        style={{ background: 'transparent' }}
      >
        <ParticleField count={particleCount} color={primaryColor} speed={0.2} />
        <ParticleField count={Math.floor(particleCount * 0.6)} color={secondaryColor} speed={0.3} />
      </Canvas>
    </div>
  );
});

export default SubtleParticles;
