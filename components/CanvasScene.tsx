'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh } from 'three';

export default function ScenePage() {
  const meshRef = useRef<Mesh>(null);

  return (
    <div className="w-screen h-screen">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={1.0} />
        <pointLight position={[10, 10, 10]} />

        <mesh ref={meshRef} rotation={[0.4, 0.2, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="royalblue" />
        </mesh>

        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}
