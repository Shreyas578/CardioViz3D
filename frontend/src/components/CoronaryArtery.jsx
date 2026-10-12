import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function probabilityToColor(prob) {
  if (prob === null) return new THREE.Color('#4B5563')
  if (prob < 0.35)   return new THREE.Color('#10B981')
  if (prob < 0.65)   return new THREE.Color('#F59E0B')
  return new THREE.Color('#EF4444')
}

export default function CoronaryArtery({ name, points, probability, isHovered, onHover, onUnhover, onClick }) {
  const meshRef = useRef()
  const curve   = useMemo(() => new THREE.CatmullRomCurve3(points, false, 'chordal'), [points])
  const color   = useMemo(() => probabilityToColor(probability), [probability])
  const radius  = isHovered ? 0.025 : 0.018

  useFrame(({ clock }) => {
    if (meshRef.current && probability > 0.65) {
      const pulse = 0.018 + 0.007 * Math.abs(Math.sin(clock.elapsedTime * 2.5))
      meshRef.current.scale.setScalar(pulse / 0.018)
    }
  })

  return (
    <mesh
      ref={meshRef}
      onPointerOver={(e) => { e.stopPropagation(); onHover() }}
      onPointerOut={onUnhover}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <tubeGeometry args={[curve, 64, radius, 12, false]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHovered ? 1.2 : (probability > 0.65 ? 0.5 : 0.2)}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={isHovered ? 1.0 : 0.9}
      />
    </mesh>
  )
}
