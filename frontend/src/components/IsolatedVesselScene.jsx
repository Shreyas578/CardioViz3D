import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Isolated Vessel 3D Renderer with exact bounding-box centering & scale normalization
 */
function IsolatedMesh({ activeVessel, predictions, isRotating, scaleMultiplier = 1 }) {
  const groupRef = useRef()
  const { scene } = useGLTF('/models/heart.glb')

  const { displayGroup, hasMeshes } = useMemo(() => {
    if (!scene || !activeVessel) return { displayGroup: null, hasMeshes: false }

    const container = new THREE.Group()
    let found = 0

    scene.traverse((child) => {
      if (child.isMesh) {
        const rawName = child.name
        const cleanName = rawName.includes('_') ? rawName.split('_').pop() : rawName
        const nameLower = rawName.toLowerCase()

        let isMatch = false
        if (activeVessel === 'LAD') {
          if (
            nameLower.includes('anterior interventricular') ||
            nameLower.includes('anterior descending') ||
            nameLower.includes('diagonal branch') ||
            nameLower.includes('anterior septal') ||
            nameLower.includes('left anterior branch') ||
            nameLower.includes('lad')
          ) isMatch = true
        } else if (activeVessel === 'LCX') {
          if (
            nameLower.includes('circumflex') ||
            nameLower.includes('left marginal') ||
            nameLower.includes('posterior ventricular branch of circumflex') ||
            nameLower.includes('lcx')
          ) isMatch = true
        } else if (activeVessel === 'RCA') {
          if (
            nameLower.includes('right coronary') ||
            nameLower.includes('right marginal') ||
            nameLower.includes('conus branch') ||
            nameLower.includes('sinoatrial nodal branch of right coronary') ||
            nameLower.includes('atrioventricular node branch of right coronary') ||
            nameLower.includes('anterior ventricular branch of right coronary') ||
            nameLower.includes('posterior ventricular branch of right coronary') ||
            nameLower.includes('rca')
          ) isMatch = true
        } else if (cleanName === activeVessel) {
          isMatch = true
        } else if (activeVessel === 'CAD') {
          isMatch = true
        }

        if (isMatch) {
          // Clone geometry to guarantee unique attributes and valid normals
          const clonedGeo = child.geometry.clone()
          clonedGeo.computeVertexNormals()
          const mesh = new THREE.Mesh(clonedGeo)

          if (activeVessel === 'CAD') {
            let vMatch = null
            if (
              nameLower.includes('anterior interventricular') ||
              nameLower.includes('anterior descending') ||
              nameLower.includes('diagonal branch') ||
              nameLower.includes('anterior septal') ||
              nameLower.includes('left anterior branch') ||
              nameLower.includes('lad')
            ) vMatch = 'LAD'
            if (
              nameLower.includes('circumflex') ||
              nameLower.includes('left marginal') ||
              nameLower.includes('posterior ventricular branch of circumflex') ||
              nameLower.includes('lcx')
            ) vMatch = 'LCX'
            if (
              nameLower.includes('right coronary') ||
              nameLower.includes('right marginal') ||
              nameLower.includes('conus branch') ||
              nameLower.includes('rca')
            ) vMatch = 'RCA'

            if (vMatch) {
              const prob = predictions?.[vMatch]?.probability ?? 0.3
              const color = prob > 0.65 ? '#E11D48' : prob > 0.35 ? '#F97316' : '#EF4444'
              const emissive = prob > 0.65 ? '#881337' : prob > 0.35 ? '#7C2D12' : '#991B1B'

              mesh.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                emissive: new THREE.Color(emissive),
                emissiveIntensity: 0.5,
                roughness: 0.2,
                metalness: 0.05,
                side: THREE.DoubleSide
              })
            } else {
              // Non-coronary background structure
              mesh.material = new THREE.MeshStandardMaterial({
                color: '#334155',
                transparent: true,
                opacity: 0.15,
                roughness: 0.6,
                metalness: 0.05,
                side: THREE.DoubleSide
              })
            }
          } else {
            // Target Isolated Vessel: Pure, vivid arterial red
            const isTarget = ['CAD', 'LAD', 'LCX', 'RCA'].includes(activeVessel)
            const prob = predictions?.[activeVessel]?.probability ?? (isTarget ? 0.25 : null)
            
            let vesselHex = '#EF4444' // Vibrant arterial red
            let emissiveHex = '#991B1B' // Luminous warm arterial glow
            
            if (prob !== null) {
              if (prob > 0.65) {
                vesselHex = '#F43F5E' // High stenosis alert ruby
                emissiveHex = '#9F1239'
              } else if (prob > 0.35) {
                vesselHex = '#FB923C' // Borderline ischemic warm coral
                emissiveHex = '#9A3412'
              } else {
                vesselHex = '#EF4444' // Patent arterial red
                emissiveHex = '#991B1B'
              }
            }

            mesh.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(vesselHex),
              emissive: new THREE.Color(emissiveHex),
              emissiveIntensity: 0.55,
              roughness: 0.2,
              metalness: 0.05,
              side: THREE.DoubleSide
            })
          }

          container.add(mesh)
          found++
        }
      }
    })

    if (found === 0) return { displayGroup: null, hasMeshes: false }

    // Compute bounding box of all matched meshes combined
    container.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(container)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // Center the geometry within container
    container.children.forEach((mesh) => {
      mesh.position.sub(center)
    })

    // Scale normalization: make the vessel occupy a standard prominent size
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001)
    const targetSize = activeVessel === 'CAD' ? 24 : 22
    const normalizationFactor = targetSize / maxDimension

    container.scale.setScalar(normalizationFactor)

    return { displayGroup: container, hasMeshes: true }
  }, [scene, activeVessel, predictions])

  // Optional manual auto-rotation
  useFrame(() => {
    if (groupRef.current && isRotating) {
      groupRef.current.rotation.y += 0.008
    }
  })

  if (!hasMeshes || !displayGroup) return null

  return (
    <group ref={groupRef} scale={[scaleMultiplier, scaleMultiplier, scaleMultiplier]}>
      <primitive object={displayGroup} />
    </group>
  )
}

/**
 * Interactive Luminal Cross-Section Cutaway Component
 */
function LumenCrossSection({ stenosisPct, vesselName }) {
  const R_outer = 42
  const residualRatio = Math.sqrt(Math.max(0.04, 1 - (stenosisPct / 100)))
  const R_inner = Math.max(6, R_outer * residualRatio)
  
  const isSignificant = stenosisPct >= 50
  const plaqueColor = isSignificant ? '#EF4444' : stenosisPct > 30 ? '#F59E0B' : '#94A3B8'

  return (
    <div className="bg-[#121620] border border-[#1E2536] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-5 shadow-sm">
      <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center bg-[#0E1118] rounded-xl p-2 border border-[#242C3E]">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
          {/* Adventitia / External vessel wall */}
          <circle cx="50" cy="50" r="46" fill="#0B0E14" stroke="#2D374D" strokeWidth="3" />
          {/* Media / Smooth muscle wall */}
          <circle cx="50" cy="50" r="42" fill="#1C2232" stroke="#333E56" strokeWidth="1" />
          
          {/* Atheroma / Plaque Accumulation Layer */}
          <circle cx="50" cy="50" r="38" fill={plaqueColor} opacity="0.85" />
          
          {/* Patent Residual Lumen */}
          <circle
            cx={50 + (stenosisPct > 40 ? 6 : 0)}
            cy="50"
            r={R_inner}
            fill="#090C12"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          {/* Blood Flow Core */}
          <circle
            cx={50 + (stenosisPct > 40 ? 6 : 0)}
            cy="50"
            r={Math.max(2, R_inner - 2)}
            fill="#E11D48"
            opacity="0.95"
          />
        </svg>
        <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">IVUS SIM</span>
      </div>

      <div className="flex-1 min-w-0 text-left space-y-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              {vesselName} Histological Cross-Section
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Intravascular Lumen &amp; Atheroma Area</span>
          </div>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
            isSignificant 
              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {stenosisPct}% Luminal Loss
          </span>
        </div>

        <div className="text-xs text-slate-700 leading-relaxed">
          {isSignificant ? (
            <span className="text-rose-700 font-medium flex items-center gap-1.5">
              <span>⚠️</span>
              Significant Hemodynamic Stenosis (≥50% cutoff met). High risk of demand ischemia.
            </span>
          ) : (
            <span className="text-slate-700 flex items-center gap-1.5 font-medium">
              <span>✓</span>
              Sub-critical Narrowing (&lt;50%). Distal microvascular perfusion preserved.
            </span>
          )}
        </div>

        {/* Caliber bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Patent Lumen</span>
            <span>{Math.round(100 - stenosisPct)}% Open</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isSignificant ? 'bg-gradient-to-r from-rose-500 to-red-600' : stenosisPct > 30 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${stenosisPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function IsolatedCameraController({ targetPosition, resetKey, controlsRef }) {
  const { camera } = useThree()

  useEffect(() => {
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

export default function IsolatedVesselScene({ activeVessel, predictions }) {
  const [viewMode, setViewMode] = useState('3d') // '3d' | 'cross-section'
  const [isRotating, setIsRotating] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [cameraPosition, setCameraPosition] = useState([0, 2, 32])
  const [resetKey, setResetKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const controlsRef = useRef()

  if (!activeVessel) return null

  const rawProb = predictions?.[activeVessel]?.probability ?? 0.25
  const stenosisPercentage = Math.round(Math.min(95, Math.max(10, rawProb * 100)))

  // Auto-switch optimal angiographic projection based on active vessel
  useEffect(() => {
    if (activeVessel === 'RCA') {
      setCameraPosition([-16, 6, 26]) // RAO projection for RCA C-loop
    } else if (activeVessel === 'LCX') {
      setCameraPosition([18, 8, 24]) // LAO projection for Circumflex groove
    } else {
      setCameraPosition([0, 2, 32]) // Anterior for LAD and CAD
    }
    setResetKey(prev => prev + 1)
  }, [activeVessel])

  const setViewAngle = (view) => {
    setIsRotating(false)
    let pos = [0, 2, 32]
    if (view === 'anterior') pos = [0, 2, 32]
    else if (view === 'rao') pos = [-18, 6, 26]
    else if (view === 'lao') pos = [18, 8, 24]
    else if (view === 'lateral') pos = [-26, 0, 14]
    else if (view === 'posterior') pos = [0, 2, -32]

    setCameraPosition(pos)
    setResetKey(prev => prev + 1)
  }

  const handleResetCamera = () => {
    setZoomLevel(1.0)
    setIsRotating(false)
    if (activeVessel === 'RCA') {
      setViewAngle('rao')
    } else if (activeVessel === 'LCX') {
      setViewAngle('lao')
    } else {
      setViewAngle('anterior')
    }
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  return (
    <div className={`w-full ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-[#0F172A] w-screen h-screen flex flex-col p-4' 
        : 'bg-white rounded-xl border border-slate-200 overflow-hidden relative mb-4 shadow-sm'
    }`}>
      {/* CAD/Workstation Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            {activeVessel} Anatomical Isolation
          </span>
          <span className="text-[10px] font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
            FMA MESH
          </span>
        </div>

        {/* View Mode Toggle & Fullscreen Button */}
        <div className="flex items-center gap-2">
          {/* Angiographic Projections */}
          {viewMode === '3d' && (
            <div className="hidden sm:flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs shadow-sm">
              <span className="text-[10px] text-slate-400 font-mono px-1">View:</span>
              <button
                type="button"
                onClick={() => setViewAngle('anterior')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('rao')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                RAO
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('lao')}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              >
                LAO
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              3D Vessel
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cross-section')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                viewMode === 'cross-section'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Lumen Cross-Section
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Viewer"}
            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-slate-50 shadow-sm flex items-center gap-1 text-xs font-semibold"
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

      {/* Main View Area */}
      {viewMode === '3d' ? (
        <div className={`w-full relative select-none ${isFullscreen ? 'flex-1 min-h-[500px]' : 'h-72'} bg-[#0B1120]`}>
          {/* Subtle Studio CAD Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(rgba(248, 250, 252, 0.35) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Interactive Floating Toolbar */}
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 shadow-sm text-xs">
            {/* Play/Pause Rotation */}
            <button
              type="button"
              onClick={() => setIsRotating(prev => !prev)}
              title={isRotating ? "Pause rotation" : "Start smooth rotation"}
              className={`p-1.5 rounded transition-colors ${
                isRotating 
                  ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {isRotating ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
              title="Zoom In"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
              title="Zoom Out"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>

            {/* Reset */}
            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset View"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>

          {/* Left Guidance Badge */}
          <div className="absolute top-2.5 left-2.5 z-20 text-[11px] font-mono font-medium text-slate-600 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
            <span>Drag to rotate · Scroll to zoom</span>
          </div>

          {/* Three.js Canvas with 360-degree studio lighting */}
          <Canvas 
            camera={{ position: cameraPosition, fov: 40 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, alpha: false }}
          >
            <IsolatedCameraController targetPosition={cameraPosition} resetKey={resetKey} controlsRef={controlsRef} />

            {/* Complete 360 Studio Lighting */}
            <ambientLight intensity={1.5} />
            <hemisphereLight skyColor="#ffffff" groundColor="#475569" intensity={1.4} />
            <directionalLight position={[20, 25, 30]} intensity={2.0} color="#ffffff" />
            <directionalLight position={[-20, 20, 30]} intensity={1.8} color="#ffffff" />
            <directionalLight position={[0, -20, -30]} intensity={1.5} color="#94a3b8" />
            <directionalLight position={[0, 25, -30]} intensity={1.2} color="#cbd5e1" />
            <pointLight position={[0, 0, 35]} intensity={1.5} color="#ffffff" />

            <React.Suspense fallback={null}>
              <IsolatedMesh 
                activeVessel={activeVessel} 
                predictions={predictions} 
                isRotating={isRotating}
                scaleMultiplier={zoomLevel}
              />
            </React.Suspense>

            <OrbitControls 
              ref={controlsRef}
              enableZoom={true} 
              enablePan={true} 
              enableDamping={true}
              dampingFactor={0.1}
            />
          </Canvas>
        </div>
      ) : (
        <div className="p-4 bg-[#0E1118]">
          <LumenCrossSection stenosisPct={stenosisPercentage} vesselName={activeVessel} />
        </div>
      )}
    </div>
  )
}
