'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Neural Network 3D Background
 *
 * Performance optimizations:
 * - Uses instanced rendering for nodes
 * - Memoized calculations
 * - Throttled frame updates
 * - Lazy loading capable
 * - Auto-cleanup on unmount
 */

interface Node {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  connections: number[];
}

interface NeuralNetworkSceneProps {
  nodeCount?: number;
  mousePosition: { x: number; y: number };
}

function NeuralNetworkScene({ nodeCount = 50, mousePosition }: NeuralNetworkSceneProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesGroupRef = useRef<THREE.Group>(null);

  // Generate nodes with physics
  const nodes = useMemo<Node[]>(() => {
    const tempNodes: Node[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01
      );

      // Connect to nearby nodes
      const connections: number[] = [];
      tempNodes.forEach((node, idx) => {
        if (position.distanceTo(node.position) < 2.5 && connections.length < 3) {
          connections.push(idx);
        }
      });

      tempNodes.push({ position, velocity, connections });
    }

    return tempNodes;
  }, [nodeCount]);

  // Create positions array for Points geometry
  const positions = useMemo(() => {
    const pos = new Float32Array(nodes.length * 3);
    nodes.forEach((node, i) => {
      pos[i * 3] = node.position.x;
      pos[i * 3 + 1] = node.position.y;
      pos[i * 3 + 2] = node.position.z;
    });
    return pos;
  }, [nodes]);

  // Animated frame update (throttled for performance)
  let frameCount = 0;
  useFrame((state) => {
    frameCount++;

    // Update only every 2 frames for performance
    if (frameCount % 2 !== 0) return;

    const time = state.clock.getElapsedTime();

    // Update node positions with physics
    nodes.forEach((node, i) => {
      // Gentle floating motion
      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
      node.position.z += node.velocity.z;

      // Boundary bouncing
      if (Math.abs(node.position.x) > 5) node.velocity.x *= -1;
      if (Math.abs(node.position.y) > 5) node.velocity.y *= -1;
      if (Math.abs(node.position.z) > 2.5) node.velocity.z *= -1;

      // Mouse attraction
      const mouseInfluence = 0.02;
      const mouseX = mousePosition.x * 5;
      const mouseY = -mousePosition.y * 5;

      node.velocity.x += (mouseX - node.position.x) * mouseInfluence * 0.01;
      node.velocity.y += (mouseY - node.position.y) * mouseInfluence * 0.01;

      // Damping
      node.velocity.multiplyScalar(0.98);

      // Update positions array
      if (pointsRef.current) {
        const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
        posArray[i * 3] = node.position.x;
        posArray[i * 3 + 1] = node.position.y;
        posArray[i * 3 + 2] = node.position.z;
      }
    });

    // Mark positions as needing update
    if (pointsRef.current) {
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Rotate the entire scene slowly
    if (linesGroupRef.current) {
      linesGroupRef.current.rotation.y = time * 0.05;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.05;
    }
  });

  // Connection lines
  const connections = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];

    nodes.forEach((node, i) => {
      node.connections.forEach((connectedIdx) => {
        if (connectedIdx < i) { // Avoid duplicate lines
          lines.push({
            start: node.position.clone(),
            end: nodes[connectedIdx].position.clone(),
          });
        }
      });
    });

    return lines;
  }, [nodes]);

  return (
    <group>
      {/* Neural Nodes */}
      <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#c4703f"
          size={0.1}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      {/* Connection Lines */}
      <group ref={linesGroupRef}>
        {connections.map((conn, i) => (
          <Line
            key={`connection-${i}`}
            points={[conn.start, conn.end]}
            color="#3fb883"
            lineWidth={1}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        ))}
      </group>

      {/* Ambient lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#c4703f" />
    </group>
  );
}

export interface NeuralNetworkProps {
  className?: string;
  nodeCount?: number;
  enableMouse?: boolean;
}

export const NeuralNetwork = React.memo(function NeuralNetwork({
  className = '',
  nodeCount = 50,
  enableMouse = true,
}: NeuralNetworkProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Track mouse position
  useEffect(() => {
    if (!enableMouse) return;

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableMouse]);

  // Don't render during SSR
  if (!isClient) {
    return <div className={className} />;
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 2]} // Adaptive pixel ratio
        performance={{ min: 0.5 }} // Adaptive performance
        gl={{
          antialias: false, // Disable for performance
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#000000']} />
        <NeuralNetworkScene nodeCount={nodeCount} mousePosition={mousePosition} />
      </Canvas>
    </div>
  );
});

export default NeuralNetwork;
