import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import * as THREE from "three";

// Internal test (never posted): can headless rendering produce a convincing clay look?
export const ClayTest: React.FC = () => {
  const frame = useCurrentFrame();
  const stepped = Math.floor(frame / 2) * 2; // stop-motion 15fps
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1.2, 48);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) * Math.sin(v.z * 3.7) * 0.08 + Math.sin(v.x * 17 + v.y * 13) * 0.006;
      v.multiplyScalar(1 + n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <AbsoluteFill style={{ background: "#E9DCC9" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ position: [0, 0, 6], fov: 35 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} castShadow />
        <directionalLight position={[-4, -2, 2]} intensity={0.5} color="#ffd9b0" />
        <mesh geometry={geo} rotation={[0.2, stepped * 0.04, 0.1 + Math.sin(stepped / 9) * 0.05]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#C65D3B" roughness={0.88} metalness={0} />
        </mesh>
        <mesh position={[1.3, -1.6, 0.4]} rotation={[0.5, stepped * -0.05, 0]}>
          <torusGeometry args={[0.45, 0.2, 48, 96]} />
          <meshStandardMaterial color="#6B705C" roughness={0.9} />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
