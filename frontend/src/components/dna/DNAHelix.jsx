import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DNA_CONFIG } from './dnaConfig'
import { buildDnaStructure } from './dnaGeometry'

/**
 * DNAHelix Component
 * Real-time WebGL 3D DNA Double Helix rendered with Three.js.
 * Features:
 * - Mathematical parametric double-helix geometry
 * - Glowing particle strands with purple, violet, magenta, and pink gradient
 * - Transverse base-pair rungs and nucleotide nodes
 * - Smooth continuous 3D rotation and organic vertical hover
 * - Interactive mouse parallax with gentle easing
 * - Responsive layout adaptation across desktop, tablet, and mobile
 */
export default function DNAHelix({ className = '', style = {} }) {
  const mountRef = useRef(null)
  const [webGlSupported, setWebGlSupported] = useState(true)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // Verify WebGL availability
    try {
      const testCanvas = document.createElement('canvas')
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
      if (!gl) {
        setWebGlSupported(false)
        return
      }
    } catch (e) {
      setWebGlSupported(false)
      return
    }

    let animationFrameId
    let isVisible = true

    // ============================================================
    // 1. SCENE & RENDERER SETUP
    // ============================================================
    const scene = new THREE.Scene()

    const width = container.clientWidth || 600
    const height = container.clientHeight || 700

    const camera = new THREE.PerspectiveCamera(
      DNA_CONFIG.camera.fov,
      width / height,
      DNA_CONFIG.camera.near,
      DNA_CONFIG.camera.far
    )
    camera.position.set(...DNA_CONFIG.camera.defaultPosition)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0) // Pure transparent canvas
    container.appendChild(renderer.domElement)

    // ============================================================
    // 2. BUILD DNA STRUCTURE
    // ============================================================
    const dna = buildDnaStructure(DNA_CONFIG)
    scene.add(dna.group)

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    // ============================================================
    // 3. MOUSE PARALLAX & INTERACTIVITY
    // ============================================================
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }

    const onPointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0
      const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0

      // Normalized coordinates (-1 to 1)
      mouse.targetX = (clientX / window.innerWidth) * 2 - 1
      mouse.targetY = -(clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })

    // ============================================================
    // 4. RESPONSIVE RESIZE HANDLING
    // ============================================================
    const handleResize = () => {
      if (!container || !renderer) return
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight

      camera.aspect = newWidth / newHeight

      // Responsive framing: scale model or adjust camera for narrow screens
      if (newWidth < 640) {
        // Mobile: center DNA and push camera back slightly
        camera.position.z = 19.5
        dna.group.position.x = 0.2
        dna.group.scale.set(0.78, 0.78, 0.78)
      } else if (newWidth < 1024) {
        // Tablet: gentle offset
        camera.position.z = 17.0
        dna.group.position.x = 0.6
        dna.group.scale.set(0.9, 0.9, 0.9)
      } else {
        // Desktop: reference framing on the right side
        camera.position.z = DNA_CONFIG.camera.defaultPosition[2]
        dna.group.position.x = DNA_CONFIG.helix.positionX
        dna.group.scale.set(1.0, 1.0, 1.0)
      }

      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    const resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(container)
    handleResize()

    // Pause rendering when tab is hidden or element is offscreen
    const onVisibilityChange = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // ============================================================
    // 5. ANIMATION LOOP
    // ============================================================
    const clock = new THREE.Clock()

    const baseTiltX = DNA_CONFIG.helix.tiltAngleX
    const baseTiltZ = DNA_CONFIG.helix.tiltAngleZ
    const basePosY = DNA_CONFIG.helix.positionY

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      if (!isVisible) return

      const delta = Math.min(clock.getDelta(), 0.1) // guard against tab inactive delta spikes
      const elapsed = clock.getElapsedTime()

      // 1. Continuous axial rotation
      dna.group.rotation.y += DNA_CONFIG.animation.rotationSpeedY * delta

      // 2. Gentle organic hover / floating on Y axis
      const floatY = Math.sin(elapsed * DNA_CONFIG.animation.undulateSpeed) * DNA_CONFIG.animation.undulateAmplitude
      dna.group.position.y = basePosY + floatY

      // 3. Smooth mouse parallax interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // 4. Subtle dynamic tilt rocking
      const rockAmp = DNA_CONFIG.animation.rockAmplitude || DNA_CONFIG.animation.tiltRockAmplitude || 0.03
      const rockZ = Math.sin(elapsed * (DNA_CONFIG.animation.rockSpeed || 0.4)) * rockAmp
      dna.group.rotation.z = baseTiltZ + rockZ + mouse.x * 0.08 * DNA_CONFIG.animation.mouseParallaxFactor
      dna.group.rotation.x = baseTiltX + mouse.y * 0.06 * DNA_CONFIG.animation.mouseParallaxFactor

      renderer.render(scene, camera)
    }

    animate()

    // ============================================================
    // 6. TEARDOWN & CLEANUP
    // ============================================================
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver.disconnect()

      dna.dispose()
      renderer.dispose()
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  if (!webGlSupported) {
    return (
      <div className={`flex items-center justify-center p-8 text-slate-400 text-sm ${className}`}>
        WebGL 3D acceleration is disabled or unsupported in this browser.
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full pointer-events-none select-none overflow-hidden ${className}`}
      style={style}
    />
  )
}
