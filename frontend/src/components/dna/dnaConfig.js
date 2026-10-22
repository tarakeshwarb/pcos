/**
 * DNA Helix 3D Configuration
 * Calibrated directly against the reference MYDNA particle visualization.
 * Creates a thick, volumetric particle double helix with dense molecular clusters,
 * structured base-pair rungs, and rich purple-to-magenta-to-pink color gradient.
 */
export const DNA_CONFIG = {
  helix: {
    radius: 2.9,                 // Natural radius matching reference sweep
    height: 14.8,                // Calibrated height so full purple-magenta-rose gradient is visible in viewport
    turns: 1.85,                 // Beautiful balanced double helix twist in hero viewport
    strandsPhase: Math.PI,       // 180-degree phase difference between strands
    strandThickness: 0.44,       // Volumetric thickness of each outer ribbon
    tiltAngleX: 0.20,            // Forward 3D perspective tilt
    tiltAngleZ: -0.32,           // Distinctive lateral tilt to the left (-18 deg)
    positionX: 2.5,              // Positioned on right half of hero section
    positionY: 0.1,              // Vertical centering
    positionZ: 0.0,
  },

  // Dense volumetric strand particles (replaces thin wireframe dots)
  strandParticles: {
    spineSteps: 950,             // Number of steps along helical curve
    particlesPerStep: 18,        // Particles distributed in cross-sectional tube per step (~34,200 total)
    baseSize: 0.19,              // Size of individual particle nodes
    coreDensity: 0.78,           // Concentration towards center of ribbon
    sprayJitter: 0.24,           // Granular outer dust spray
    opacity: 0.95,               // Dense, vibrant, fully saturated particles
  },

  // Base-pair ladder rungs (connecting lines & nucleotide nodes)
  rungs: {
    count: 38,                   // Rhythmic ladder steps across the double helix
    particlesPerRung: 14,        // Nodes along each transverse rung
    particleSize: 0.15,
    opacity: 0.90,
    lineOpacity: 0.58,           // Distinct, visible connecting lines matching reference
    lineWidth: 1.5,
    dualLineOffset: 0.07,        // Double-strut base-pair thickness
    latticeConnections: true,    // Cross-connecting micro-lines between rungs
    latticeOpacity: 0.32,        // Clearly visible purple/magenta lattice cross-links
  },

  // Floating ambient molecular dust
  ambientParticles: {
    count: 240,
    boxSize: { x: 16, y: 18, z: 12 },
    size: 0.14,
    opacity: 0.45,
  },

  // Exact reference color palette: Deep Royal Purple -> Electric Violet -> Magenta / Fuchsia -> Reddish Pink / Rose
  colors: {
    gradient: [
      { stop: 0.00, color: '#FB7185' }, // Radiant luminous rose at bottom edge
      { stop: 0.14, color: '#E11D48' }, // True Reddish Pink / Rose
      { stop: 0.30, color: '#F43F5E' }, // Coral rose
      { stop: 0.45, color: '#E879F9' }, // Bright magenta-pink transition
      { stop: 0.58, color: '#D946EF' }, // Vibrant rich fuchsia / magenta
      { stop: 0.70, color: '#C026D3' }, // Deep violet-magenta
      { stop: 0.82, color: '#8B5CF6' }, // Electric violet
      { stop: 0.92, color: '#7C3AED' }, // Deep royal purple
      { stop: 1.00, color: '#6D28D9' }, // Midnight purple apex
    ],
    highlight: '#FFFFFF',
    lavender: '#E9D5FF',
    purpleGlow: '#8B5CF6',
  },

  // Smooth rotational motion
  animation: {
    rotationSpeedY: 0.32,        // Continuous rotation around central cylinder axis
    undulateSpeed: 0.45,         // Organic vertical hover
    undulateAmplitude: 0.14,
    rockSpeed: 0.35,             // Subtle sway
    rockAmplitude: 0.03,
    mouseParallaxFactor: 0.35,
  },

  camera: {
    fov: 38,
    near: 0.1,
    far: 100,
    defaultPosition: [0, 0, 16.8],
  },
}
