import { motion } from 'framer-motion'

const AXES = [
  { id: 'adrenal', label: 'Adrenal', color: '#a78bfa' },
  { id: 'hormonal', label: 'Hormonal', color: '#4bf3d6' },
  { id: 'inflammatory', label: 'Inflammatory', color: '#ff8a80' },
  { id: 'metabolic', label: 'Metabolic', color: '#fbbf24' },
]

const SIZE = 320
const CENTER = SIZE / 2
const MAX_R = SIZE / 2 - 56

function pointFor(index, value) {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2
  const r = (value / 100) * MAX_R
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

function labelPointFor(index) {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2
  const r = MAX_R + 34
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)]
}

export default function PhenotypeRadar({ scores, primaryPhenotype }) {
  const values = AXES.map((a) => scores[a.id]?.percentage ?? 0)
  const polygonPoints = AXES.map((a, i) => pointFor(i, scores[a.id]?.percentage ?? 0))
  const polygonStr = polygonPoints.map((p) => p.join(',')).join(' ')

  const rings = [25, 50, 75, 100]

  return (
    <div className="flex justify-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#4bf3d6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
          </radialGradient>
          <filter id="radarGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={AXES.map((_, i) => pointFor(i, r).join(',')).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* axes */}
        {AXES.map((a, i) => {
          const [x, y] = pointFor(i, 100)
          return <line key={a.id} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}

        {/* data polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          points={polygonStr}
          fill="url(#radarFill)"
          stroke="#4bf3d6"
          strokeWidth="2"
          filter="url(#radarGlow)"
        />

        {/* data points */}
        {polygonPoints.map(([x, y], i) => (
          <circle key={AXES[i].id} cx={x} cy={y} r={primaryPhenotype === AXES[i].id ? 6 : 4} fill={AXES[i].color}
            stroke="#050810" strokeWidth="1.5" />
        ))}

        {/* labels */}
        {AXES.map((a, i) => {
          const [x, y] = labelPointFor(i)
          return (
            <g key={a.id}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-display text-[13px] font-semibold"
                fill={primaryPhenotype === a.id ? a.color : '#94a3b8'}
              >
                {a.label}
              </text>
              <text
                x={x}
                y={y + 15}
                textAnchor="middle"
                className="font-mono text-[11px]"
                fill="#64748b"
              >
                {values[i]}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
