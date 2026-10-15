const SEVERITY_COLOR = {
  'None / Minimal': '#475569',
  'Mild Driver': '#4bf3d6',
  'Moderate Driver': '#fbbf24',
  'Severe Driver / Primary Target': '#ff5c5c',
}

export default function SeverityRing({ label, percentage, severity, positiveCount, total, highlighted }) {
  const size = 96
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (percentage / 100) * c
  const color = SEVERITY_COLOR[severity] || '#4bf3d6'

  return (
    <div className={`flex flex-col items-center gap-3 rounded-2xl p-4 transition-all ${highlighted ? 'glass-strong shadow-glow' : 'glass'}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}aa)`, transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-white">{positiveCount}</span>
          <span className="text-[10px] text-slate-500">/{total}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-sm font-semibold text-slate-100">{label}</div>
        <div className="mt-0.5 text-[11px] font-medium" style={{ color }}>{severity}</div>
      </div>
    </div>
  )
}
