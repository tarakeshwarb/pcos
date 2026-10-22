import * as THREE from 'three'
import { DNA_CONFIG } from './dnaConfig'

/**
 * Creates a high-definition radial glow particle sprite texture.
 * Produces crisp, luminous circular orbs with a dense core and soft anti-aliased corona.
 */
export function createGlowingParticleTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const center = size / 2
  const grad = ctx.createRadialGradient(center, center, 0, center, center, center)

  // Pure white core with smooth radial alpha falloff
  // Enables 100% accurate, vivid purple, magenta, and rose vertex coloring
  grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)')
  grad.addColorStop(0.30, 'rgba(255, 255, 255, 0.98)')
  grad.addColorStop(0.60, 'rgba(255, 255, 255, 0.75)')
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.28)')
  grad.addColorStop(1.00, 'rgba(255, 255, 255, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

/**
 * Interpolates color along the vertical DNA gradient.
 * Progress 0.0 = bottom (luminous pink), 1.0 = top (deep midnight purple).
 */
export function sampleGradientColor(progress, customConfig = DNA_CONFIG) {
  const clamped = Math.max(0, Math.min(1, progress))
  const stops = customConfig.colors.gradient

  let lower = stops[0]
  let upper = stops[stops.length - 1]

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].stop && clamped <= stops[i + 1].stop) {
      lower = stops[i]
      upper = stops[i + 1]
      break
    }
  }

  const range = upper.stop - lower.stop
  const factor = range > 0 ? (clamped - lower.stop) / range : 0

  const colorA = new THREE.Color(lower.color)
  const colorB = new THREE.Color(upper.color)
  return colorA.lerp(colorB, factor)
}

/**
 * Builds the entire high-density 3D DNA Double Helix scene graph:
 * - Thick, dense volumetric particle ribbons (30,000+ particles)
 * - Structured transverse base-pair ladder rungs with dual struts and beads
 * - Delicate diagonal molecular lattice network lines
 * - Luminous jewel sparkle highlights and atmospheric floating dust
 */
export function buildDnaStructure(config = DNA_CONFIG) {
  const group = new THREE.Group()
  const particleTexture = createGlowingParticleTexture()

  const {
    radius,
    height,
    turns,
    strandsPhase,
    strandThickness,
  } = config.helix

  const {
    spineSteps,
    particlesPerStep,
    baseSize,
    sprayJitter,
    opacity: strandOpacity,
  } = config.strandParticles

  // ============================================================
  // 1. THICK VOLUMETRIC STRAND PARTICLES (30,000+ Particles)
  // ============================================================
  const particlesPerStrand = spineSteps * particlesPerStep
  const totalStrandParticles = particlesPerStrand * 2
  const strandPositions = new Float32Array(totalStrandParticles * 3)
  const strandColors = new Float32Array(totalStrandParticles * 3)
  const strandSizes = new Float32Array(totalStrandParticles)

  let pIdx = 0

  const populateVolumetricStrand = (isSecondary = false) => {
    const phaseOffset = isSecondary ? strandsPhase : 0

    for (let step = 0; step < spineSteps; step++) {
      const progress = step / (spineSteps - 1)
      const angle = progress * turns * Math.PI * 2 + phaseOffset
      const ySpine = (progress - 0.5) * height

      // Spine position
      const xSpine = radius * Math.cos(angle)
      const zSpine = radius * Math.sin(angle)

      // Radial outward unit vector from cylinder axis
      const ux = Math.cos(angle)
      const uz = Math.sin(angle)

      // Tangent direction along helix
      const pitch = height / (turns * Math.PI * 2)
      const tx = -radius * Math.sin(angle)
      const ty = pitch
      const tz = radius * Math.cos(angle)
      const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz)
      const ntx = tx / tLen
      const nty = ty / tLen
      const ntz = tz / tLen

      // Binormal vector = u x t
      const bx = -uz * nty
      const by = uz * ntx - ux * ntz
      const bz = ux * nty
      const bLen = Math.sqrt(bx * bx + by * by + bz * bz) || 1
      const nbx = bx / bLen
      const nby = by / bLen
      const nbz = bz / bLen

      // Base color for this vertical slice
      const sliceColor = sampleGradientColor(progress, config)

      // Generate particles across the ribbon cross-section
      for (let p = 0; p < particlesPerStep; p++) {
        // Organic radial distribution (denser at core, soft dispersion at edge)
        const uRand = Math.random()
        const rDist = strandThickness * Math.sqrt(uRand)
        const thetaRibbon = Math.random() * Math.PI * 2

        // Granular outer dust spray for occasional particles
        const isStray = Math.random() < 0.12
        const spray = isStray ? (Math.random() - 0.5) * sprayJitter * 2.5 : (Math.random() - 0.5) * 0.06

        const offU = (rDist * Math.cos(thetaRibbon) + spray)
        const offB = (rDist * Math.sin(thetaRibbon) + spray)
        const offT = (Math.random() - 0.5) * 0.12

        const px = xSpine + offU * ux + offB * nbx + offT * ntx
        const py = ySpine + offB * nby + offT * nty
        const pz = zSpine + offU * uz + offB * nbz + offT * ntz

        strandPositions[pIdx * 3] = px
        strandPositions[pIdx * 3 + 1] = py
        strandPositions[pIdx * 3 + 2] = pz

        // Subtle per-particle color variance for iridescent shimmer
        const pColor = sliceColor.clone()
        const colorVar = (Math.random() - 0.5) * 0.08
        pColor.r = Math.min(1, Math.max(0, pColor.r + colorVar))
        pColor.b = Math.min(1, Math.max(0, pColor.b + colorVar))

        // Luminous highlight sparks (brilliant white and lavender nodes)
        if (Math.random() < 0.10) {
          pColor.lerp(new THREE.Color(config.colors.highlight), 0.75)
        } else if (Math.random() < 0.15) {
          pColor.lerp(new THREE.Color(config.colors.lavender), 0.55)
        }

        strandColors[pIdx * 3] = pColor.r
        strandColors[pIdx * 3 + 1] = pColor.g
        strandColors[pIdx * 3 + 2] = pColor.b

        // Size variation: core particles are slightly larger and punchier
        const sizeFactor = isStray ? (0.6 + Math.random() * 0.5) : (0.85 + Math.random() * 0.6)
        strandSizes[pIdx] = baseSize * sizeFactor

        pIdx++
      }
    }
  }

  // Generate both strands
  populateVolumetricStrand(false)
  populateVolumetricStrand(true)

  const strandGeometry = new THREE.BufferGeometry()
  strandGeometry.setAttribute('position', new THREE.BufferAttribute(strandPositions, 3))
  strandGeometry.setAttribute('color', new THREE.BufferAttribute(strandColors, 3))
  strandGeometry.setAttribute('size', new THREE.BufferAttribute(strandSizes, 1))

  const strandMaterial = new THREE.PointsMaterial({
    size: baseSize,
    vertexColors: true,
    map: particleTexture,
    transparent: true,
    opacity: strandOpacity,
    blending: THREE.NormalBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const strandPoints = new THREE.Points(strandGeometry, strandMaterial)
  group.add(strandPoints)

  // ============================================================
  // 2. BASE-PAIR LADDER RUNGS (Cross Struts & Nucleotide Beads)
  // ============================================================
  const {
    count: rungsCount,
    particlesPerRung,
    particleSize: rungParticleSize,
    opacity: rungOpacity,
    lineOpacity: rungLineOpacity,
    dualLineOffset,
    latticeConnections,
    latticeOpacity,
  } = config.rungs

  const rungLinePositions = []
  const rungLineColors = []

  const latticePositions = []
  const latticeColors = []

  const totalRungNodes = rungsCount * particlesPerRung
  const rungNodePositions = new Float32Array(totalRungNodes * 3)
  const rungNodeColors = new Float32Array(totalRungNodes * 3)
  const rungNodeSizes = new Float32Array(totalRungNodes)

  let nodeIdx = 0
  const rungAnchors = []

  for (let r = 0; r < rungsCount; r++) {
    const progress = r / (rungsCount - 1)
    const angle = progress * turns * Math.PI * 2
    const y = (progress - 0.5) * height

    // Inner anchor on Strand 1
    const x1 = radius * Math.cos(angle)
    const z1 = radius * Math.sin(angle)

    // Inner anchor on Strand 2
    const x2 = radius * Math.cos(angle + strandsPhase)
    const z2 = radius * Math.sin(angle + strandsPhase)

    rungAnchors.push({ x1, y, z1, x2, z2, progress })

    const rungColor = sampleGradientColor(progress, config)

    // Primary rung connecting line: (x1, y, z1) -> (x2, y, z2)
    rungLinePositions.push(x1, y, z1, x2, y, z2)
    rungLineColors.push(rungColor.r, rungColor.g, rungColor.b)
    rungLineColors.push(rungColor.r, rungColor.g, rungColor.b)

    // Secondary parallel strut for visible structural thickness
    rungLinePositions.push(x1, y + dualLineOffset, z1, x2, y + dualLineOffset, z2)
    rungLineColors.push(rungColor.r * 0.9, rungColor.g * 0.9, rungColor.b * 0.9)
    rungLineColors.push(rungColor.r * 0.9, rungColor.g * 0.9, rungColor.b * 0.9)

    // Beads / nucleotide base pairs distributed along the rung
    for (let k = 0; k < particlesPerRung; k++) {
      const t = (k + 1) / (particlesPerRung + 1)
      const nx = THREE.MathUtils.lerp(x1, x2, t) + (Math.random() - 0.5) * 0.05
      const ny = y + (Math.random() - 0.5) * 0.05
      const nz = THREE.MathUtils.lerp(z1, z2, t) + (Math.random() - 0.5) * 0.05

      rungNodePositions[nodeIdx * 3] = nx
      rungNodePositions[nodeIdx * 3 + 1] = ny
      rungNodePositions[nodeIdx * 3 + 2] = nz

      const nodeCol = rungColor.clone()
      // Center junction highlight (hydrogen bonds)
      if (Math.abs(t - 0.5) < 0.18) {
        nodeCol.lerp(new THREE.Color(config.colors.lavender), 0.55)
      }

      rungNodeColors[nodeIdx * 3] = nodeCol.r
      rungNodeColors[nodeIdx * 3 + 1] = nodeCol.g
      rungNodeColors[nodeIdx * 3 + 2] = nodeCol.b

      rungNodeSizes[nodeIdx] = rungParticleSize * (0.8 + Math.random() * 0.5)
      nodeIdx++
    }
  }

  // Diagonal molecular lattice connections between adjacent rungs
  if (latticeConnections) {
    for (let r = 0; r < rungAnchors.length - 1; r++) {
      const a = rungAnchors[r]
      const b = rungAnchors[r + 1]

      // Diagonal cross-link: Strand 1 of rung r -> Center of rung r+1
      const mx = (b.x1 + b.x2) * 0.5
      const mz = (b.z1 + b.z2) * 0.5
      const my = b.y

      latticePositions.push(a.x1, a.y, a.z1, mx, my, mz)
      const colA = sampleGradientColor(a.progress, config)
      latticeColors.push(colA.r, colA.g, colA.b, colA.r, colA.g, colA.b)

      latticePositions.push(a.x2, a.y, a.z2, mx, my, mz)
      latticeColors.push(colA.r, colA.g, colA.b, colA.r, colA.g, colA.b)
    }

    const latticeGeometry = new THREE.BufferGeometry()
    latticeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(latticePositions, 3))
    latticeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(latticeColors, 3))

    const latticeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: latticeOpacity,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })

    const latticeLines = new THREE.LineSegments(latticeGeometry, latticeMaterial)
    group.add(latticeLines)
  }

  // Rung Lines Mesh
  const rungLineGeometry = new THREE.BufferGeometry()
  rungLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rungLinePositions, 3))
  rungLineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(rungLineColors, 3))

  const rungLineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: rungLineOpacity,
    blending: THREE.NormalBlending,
    depthWrite: false,
  })

  const rungLines = new THREE.LineSegments(rungLineGeometry, rungLineMaterial)
  group.add(rungLines)

  // Rung Nodes Mesh
  const rungNodeGeometry = new THREE.BufferGeometry()
  rungNodeGeometry.setAttribute('position', new THREE.BufferAttribute(rungNodePositions, 3))
  rungNodeGeometry.setAttribute('color', new THREE.BufferAttribute(rungNodeColors, 3))
  rungNodeGeometry.setAttribute('size', new THREE.BufferAttribute(rungNodeSizes, 1))

  const rungNodeMaterial = new THREE.PointsMaterial({
    size: rungParticleSize,
    vertexColors: true,
    map: particleTexture,
    transparent: true,
    opacity: rungOpacity,
    blending: THREE.NormalBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const rungNodePoints = new THREE.Points(rungNodeGeometry, rungNodeMaterial)
  group.add(rungNodePoints)

  // ============================================================
  // 3. AMBIENT ATMOSPHERIC MOLECULAR DUST
  // ============================================================
  const {
    count: ambCount,
    boxSize,
    size: ambSize,
    opacity: ambOpacity,
  } = config.ambientParticles

  const ambPositions = new Float32Array(ambCount * 3)
  const ambColors = new Float32Array(ambCount * 3)

  for (let a = 0; a < ambCount; a++) {
    // Cylindrical dispersion around the helix
    const rAmb = radius * 0.4 + Math.random() * (boxSize.x * 0.4)
    const thetaAmb = Math.random() * Math.PI * 2
    const yAmb = (Math.random() - 0.5) * boxSize.y

    ambPositions[a * 3] = rAmb * Math.cos(thetaAmb)
    ambPositions[a * 3 + 1] = yAmb
    ambPositions[a * 3 + 2] = rAmb * Math.sin(thetaAmb)

    const prog = (yAmb + boxSize.y * 0.5) / boxSize.y
    const c = sampleGradientColor(prog, config)
    c.lerp(new THREE.Color(config.colors.lavender), 0.45)

    ambColors[a * 3] = c.r
    ambColors[a * 3 + 1] = c.g
    ambColors[a * 3 + 2] = c.b
  }

  const ambGeometry = new THREE.BufferGeometry()
  ambGeometry.setAttribute('position', new THREE.BufferAttribute(ambPositions, 3))
  ambGeometry.setAttribute('color', new THREE.BufferAttribute(ambColors, 3))

  const ambMaterial = new THREE.PointsMaterial({
    size: ambSize,
    vertexColors: true,
    map: particleTexture,
    transparent: true,
    opacity: ambOpacity,
    blending: THREE.NormalBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  const ambPoints = new THREE.Points(ambGeometry, ambMaterial)
  group.add(ambPoints)

  // Set initial position and tilt from config
  group.rotation.x = config.helix.tiltAngleX
  group.rotation.z = config.helix.tiltAngleZ
  group.position.set(config.helix.positionX, config.helix.positionY, config.helix.positionZ)

  return {
    group,
    texture: particleTexture,
    dispose: () => {
      particleTexture.dispose()
      strandGeometry.dispose()
      strandMaterial.dispose()
      rungLineGeometry.dispose()
      rungLineMaterial.dispose()
      rungNodeGeometry.dispose()
      rungNodeMaterial.dispose()
      ambGeometry.dispose()
      ambMaterial.dispose()
    },
  }
}
