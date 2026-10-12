import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Bounds, Center, ContactShadows, Html, useBounds } from '@react-three/drei'
import * as THREE from 'three'

function CameraController({ targetPosition, resetKey, controlsRef }) {
  const { camera } = useThree()

  useMemo(() => {
    if (targetPosition) {
      camera.position.set(...targetPosition)
      camera.lookAt(0, 0, 0)
      if (controlsRef?.current) {
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
    }
  }, [targetPosition, resetKey, camera, controlsRef])

  return null
}

function HeartMesh({ 
  predictions, 
  patientData, 
  onVesselClick, 
  hoveredVessel, 
  setHoveredVessel,
  isAutoRotating,
  isBeating,
  myoOpacity,
  selectedPart,
  setSelectedPart,
  activeVessel
}) {
  const heartRef = useRef()
  const { scene } = useGLTF('/models/heart.glb')
  
  const [hoveredPart, setHoveredPart] = useState(null)
  const [tooltipPos, setTooltipPos] = useState([0, 0, 0])

  useFrame(({ clock }) => {
    if (heartRef.current) {
      if (isAutoRotating) {
        heartRef.current.rotation.y += 0.005
      }

      if (isBeating) {
        const bpm = patientData?.PR || 70
        const bps = bpm / 60
        const beat = Math.pow(Math.abs(Math.sin(clock.elapsedTime * Math.PI * bps)), 8)
        const scale = 1.0 + (beat * 0.035)
        heartRef.current.scale.setScalar(scale)
      } else {
        heartRef.current.scale.setScalar(1.0)
      }
    }
  })

  // Refined realistic clinical materials
  useMemo(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          if (!child.geometry.userData.normalsComputed) {
            child.geometry.computeVertexNormals()
            child.geometry.userData.normalsComputed = true
          }

          const rawName = child.name
          const cleanName = rawName.includes('_') ? rawName.split('_').pop() : rawName
          const nameLower = rawName.toLowerCase()

          // Detect vessel targets with comprehensive branch mapping
          let targetVessel = null
          if (
            nameLower.includes('anterior interventricular') ||
            nameLower.includes('anterior descending') ||
            nameLower.includes('diagonal branch') ||
            nameLower.includes('anterior septal') ||
            nameLower.includes('left anterior branch') ||
            nameLower.includes('lad')
          ) targetVessel = 'LAD'
          else if (
            nameLower.includes('circumflex') ||
            nameLower.includes('left marginal') ||
            nameLower.includes('posterior ventricular branch of circumflex') ||
            nameLower.includes('lcx')
          ) targetVessel = 'LCX'
          else if (
            nameLower.includes('right coronary') ||
            nameLower.includes('right marginal') ||
            nameLower.includes('conus branch') ||
            nameLower.includes('sinoatrial nodal branch of right coronary') ||
            nameLower.includes('atrioventricular node branch of right coronary') ||
            nameLower.includes('anterior ventricular branch of right coronary') ||
            nameLower.includes('posterior ventricular branch of right coronary') ||
            nameLower.includes('rca')
          ) targetVessel = 'RCA'

          // Conduction system & Great vessels
          const isConduction = nameLower.includes('node') || nameLower.includes('bundle') || nameLower.includes('tract')
          const isGreatVessel = nameLower.includes('aorta') || nameLower.includes('pulmonary') || nameLower.includes('cava')

          if (targetVessel) {
            // Realistic arterial hues (natural arterial crimson / amber / critical ruby)
            const prob = predictions?.[targetVessel]?.probability ?? 0.25
            
            let vesselColor = 0xC24141 // Healthy patent arterial crimson
            let emissiveColor = 0x2A080C
            
            if (prob > 0.65) {
              vesselColor = 0xE11D48 // Severe stenosis alert ruby
              emissiveColor = 0x5C091D
            } else if (prob > 0.35) {
              vesselColor = 0xD97706 // Borderline ischemic amber
              emissiveColor = 0x451A03
            }

            child.material = new THREE.MeshStandardMaterial({
              color: vesselColor,
              emissive: emissiveColor,
              roughness: 0.35,
              metalness: 0.15,
              side: THREE.DoubleSide
            })
          } else if (isConduction) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xD97706,
              emissive: 0x351402,
              roughness: 0.5,
              metalness: 0.1,
              side: THREE.DoubleSide
            })
          } else if (isGreatVessel) {
            const isAorta = nameLower.includes('aorta')
            child.material = new THREE.MeshStandardMaterial({
              color: isAorta ? '#5A1E24' : '#2A3546',
              roughness: 0.65,
              metalness: 0.05,
              transparent: myoOpacity < 0.95,
              opacity: myoOpacity,
              side: THREE.DoubleSide
            })
          } else {
            // Myocardium: Dignified anatomical deep cardiac wine
            const isTransparent = myoOpacity < 0.95
            child.material = new THREE.MeshStandardMaterial({
              color: '#4C1D23',
              roughness: 0.72,
              metalness: 0.04,
              transparent: isTransparent,
              opacity: myoOpacity,
              depthWrite: !isTransparent,
              side: THREE.DoubleSide
            })
          }

          // Highlight selected vessel or anatomical part in glowing arterial red
          let isSelected = false
          const currentTarget = activeVessel || selectedPart
          if (currentTarget === 'LAD' && targetVessel === 'LAD') isSelected = true
          else if (currentTarget === 'LCX' && targetVessel === 'LCX') isSelected = true
          else if (currentTarget === 'RCA' && targetVessel === 'RCA') isSelected = true
          else if (currentTarget === 'CAD' && targetVessel !== null) isSelected = true
          else if (cleanName === selectedPart) isSelected = true

          if (isSelected) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xEF4444, // Vibrant arterial scarlet red
              emissive: 0x991B1B, // Luminous glow
              emissiveIntensity: 0.8,
              roughness: 0.2,
              metalness: 0.05,
              side: THREE.DoubleSide
            })
          }
        }
      })
    }
  }, [scene, predictions, selectedPart, activeVessel, myoOpacity])

  const handlePointerDown = (e) => {
    e.stopPropagation()
    if (!e.object) return
    
    const rawName = e.object.name
    const cleanName = rawName.includes('_') ? rawName.split('_').pop() : rawName
    setSelectedPart(cleanName)

    const nameLower = rawName.toLowerCase()
    let targetVessel = null
    if (
      nameLower.includes('anterior interventricular') ||
      nameLower.includes('anterior descending') ||
      nameLower.includes('diagonal branch') ||
      nameLower.includes('anterior septal') ||
      nameLower.includes('left anterior branch') ||
      nameLower.includes('lad')
    ) targetVessel = 'LAD'
    else if (
      nameLower.includes('circumflex') ||
      nameLower.includes('left marginal') ||
      nameLower.includes('posterior ventricular branch of circumflex') ||
      nameLower.includes('lcx')
    ) targetVessel = 'LCX'
    else if (
      nameLower.includes('right coronary') ||
      nameLower.includes('right marginal') ||
      nameLower.includes('conus branch') ||
      nameLower.includes('sinoatrial nodal branch of right coronary') ||
      nameLower.includes('atrioventricular node branch of right coronary') ||
      nameLower.includes('anterior ventricular branch of right coronary') ||
      nameLower.includes('posterior ventricular branch of right coronary') ||
      nameLower.includes('rca')
    ) targetVessel = 'RCA'
    
    if (onVesselClick) {
      onVesselClick(targetVessel || cleanName)
    }
  }

  const handlePointerOver = (e) => {
    e.stopPropagation()
    if (!e.object) return
    
    const rawName = e.object.name
    const cleanName = rawName.includes('_') ? rawName.split('_').pop() : rawName
    setHoveredPart(cleanName)
    setTooltipPos(e.point)

    const nameLower = rawName.toLowerCase()
    let targetVessel = null
    if (nameLower.includes('anterior interventricular') || nameLower.includes('anterior descending') || nameLower.includes('lad')) targetVessel = 'LAD'
    if (nameLower.includes('circumflex') || nameLower.includes('left marginal') || nameLower.includes('lcx')) targetVessel = 'LCX'
    if (nameLower.includes('right coronary') || nameLower.includes('right marginal') || nameLower.includes('rca')) targetVessel = 'RCA'
    
    if (targetVessel) {
      setHoveredPart(`${targetVessel} Coronary Artery`)
      if (setHoveredVessel) setHoveredVessel(targetVessel)
    } else {
      setHoveredPart(cleanName)
    }
    document.body.style.cursor = 'pointer'
  }

  const handlePointerMove = (e) => {
    e.stopPropagation()
    setTooltipPos(e.point)
  }

  const handlePointerOut = () => {
    setHoveredPart(null)
    if (setHoveredVessel) setHoveredVessel(null)
    document.body.style.cursor = 'auto'
  }

  const handlePointerMissed = (e) => {
    if (e.type === 'click') {
      setSelectedPart(null)
    }
  }

  return (
    <group ref={heartRef} position={[0, 0, 0]} onPointerMissed={handlePointerMissed}>
      <Center>
        <primitive 
          object={scene} 
          onPointerDown={handlePointerDown}
          onPointerOver={handlePointerOver}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        />
      </Center>
      {hoveredPart && (
        <Html position={tooltipPos} style={{ pointerEvents: 'none' }}>
          <div className="bg-[#121620]/95 text-slate-100 text-xs font-medium px-2.5 py-1 rounded-md border border-[#2A334A] shadow-xl whitespace-nowrap backdrop-blur-md transform -translate-x-1/2 -translate-y-full mt-[-10px]">
            {hoveredPart}
          </div>
        </Html>
      )}
    </group>
  )
}

export default function HeartScene({ 
  predictions, 
  patientData, 
  onVesselClick, 
  hoveredVessel, 
  setHoveredVessel,
  activeVessel 
}) {
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [isBeating, setIsBeating] = useState(true)
  const [myoOpacity, setMyoOpacity] = useState(0.85)
  const [cameraPosition, setCameraPosition] = useState([0, 0, 150])
  const [resetKey, setResetKey] = useState(0)
  const [selectedPart, setSelectedPart] = useState(activeVessel)
  const controlsRef = useRef()

  useEffect(() => {
    if (activeVessel) {
      setSelectedPart(activeVessel)
      if (activeVessel === 'RCA') {
        setViewAngle('rao')
      } else if (activeVessel === 'LCX') {
        setViewAngle('lao')
      } else if (activeVessel === 'LAD' || activeVessel === 'CAD') {
        setViewAngle('anterior')
      }
    }
  }, [activeVessel])

  const setViewAngle = (view) => {
    setIsAutoRotating(false)
    let pos = [0, 0, 150]
    if (view === 'anterior') pos = [0, 0, 150]
    else if (view === 'posterior') pos = [0, 0, -150]
    else if (view === 'lao') pos = [-120, 20, 80]
    else if (view === 'rao') pos = [120, 20, 80]
    else if (view === 'superior') pos = [0, 150, 0.01]

    setCameraPosition(pos)
    setResetKey(prev => prev + 1)
  }

  const handleResetCamera = () => {
    setIsAutoRotating(false)
    setViewAngle('anterior')
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const handleZoom = (delta) => {
    if (controlsRef.current) {
      const zoomFactor = delta > 0 ? 0.8 : 1.25
      const cam = controlsRef.current.object
      cam.position.multiplyScalar(zoomFactor)
      controlsRef.current.update()
    }
  }

  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev)
  }

  return (
    <div className={`${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-[#0F172A] w-screen h-screen' 
        : 'relative w-full h-full min-h-[520px] bg-[#0F172A]'
    }`}>
      {/* Top CAD Toolbar */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Anatomical Camera Views */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 shadow-sm text-xs">
          <span className="text-[10px] text-slate-500 px-1 font-mono uppercase font-bold">Angle:</span>
          {['Anterior', 'Posterior', 'LAO', 'RAO', 'Superior'].map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() => setViewAngle(angle.toLowerCase())}
              className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {angle}
            </button>
          ))}
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 shadow-sm text-xs">
          <button
            type="button"
            onClick={() => setIsAutoRotating(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              isAutoRotating 
                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>{isAutoRotating ? '⏸ Pause' : '▶ Auto-Rotate'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBeating(prev => !prev)}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              isBeating 
                ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {isBeating ? `Pulse: ${patientData?.PR || 70} bpm` : 'Pulse: Static'}
          </button>

          <button
            type="button"
            onClick={() => handleZoom(1)}
            title="Zoom In"
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>

          <button
            type="button"
            onClick={() => handleZoom(-1)}
            title="Zoom Out"
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Orientation"
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>

          <div className="h-3 w-[1px] bg-slate-200 mx-0.5" />

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen CAD View"}
            className="p-1.5 text-slate-700 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            {isFullscreen ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Bar: Muscle Opacity & Vessel Focus */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <span>Muscle Opacity:</span>
            <span className="font-mono text-slate-900">{Math.round(myoOpacity * 100)}%</span>
          </span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={myoOpacity}
            onChange={(e) => setMyoOpacity(parseFloat(e.target.value))}
            className="w-24 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setMyoOpacity(myoOpacity < 0.5 ? 0.85 : 0.25)}
            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          >
            {myoOpacity < 0.5 ? 'Solid' : 'Ghost / X-Ray'}
          </button>
        </div>

        {/* Vessel Target Focus Tabs */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1 text-xs">
          {['CAD', 'LAD', 'LCX', 'RCA'].map((vessel) => {
            const prob = predictions?.[vessel]?.probability
            const isHigh = prob > 0.65
            const isMod = prob > 0.35 && prob <= 0.65
            const isActive = activeVessel === vessel

            return (
              <button
                key={vessel}
                type="button"
                onClick={() => onVesselClick && onVesselClick(vessel)}
                className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{vessel}</span>
                {prob !== undefined && (
                  <span className={`w-2 h-2 rounded-full ${
                    isHigh ? 'bg-rose-500' : isMod ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: cameraPosition, fov: 40 }}
        style={{ width: '100%', height: '100%', minHeight: '520px' }}
        gl={{ antialias: true, alpha: false }}
      >
        <CameraController targetPosition={cameraPosition} resetKey={resetKey} controlsRef={controlsRef} />

        <ambientLight intensity={0.9} />
        <hemisphereLight skyColor="#ffffff" groundColor="#475569" intensity={1.2} />
        <directionalLight position={[25, 25, 25]} intensity={1.6} color="#ffffff" />
        <directionalLight position={[-25, -20, -20]} intensity={0.8} color="#cbd5e1" />
        <directionalLight position={[0, -25, 20]} intensity={0.6} color="#94a3b8" />
        <pointLight position={[0, 40, 40]} intensity={0.8} color="#ffffff" />
        
        <React.Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <HeartMesh
              predictions={predictions}
              patientData={patientData}
              onVesselClick={onVesselClick}
              hoveredVessel={hoveredVessel}
              setHoveredVessel={setHoveredVessel}
              isAutoRotating={isAutoRotating}
              isBeating={isBeating}
              myoOpacity={myoOpacity}
              selectedPart={selectedPart}
              setSelectedPart={setSelectedPart}
              activeVessel={activeVessel}
            />
          </Bounds>
          <ContactShadows position={[0, -45, 0]} opacity={0.3} scale={90} blur={2.5} far={90} />
        </React.Suspense>
        
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          makeDefault
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/heart.glb')
