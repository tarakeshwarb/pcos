export default function ProgressRail({ steps, currentIndex }) {
  const pct = ((currentIndex) / (steps.length - 1)) * 100

  return (
    <div className="mb-10">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono">
          STEP {String(currentIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </span>
        <span className="font-display font-medium text-bio-300">{steps[currentIndex].label}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bio-400 to-plasma-500 shadow-glow transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
              i === currentIndex
                ? 'border-bio-300/50 bg-bio-400/10 text-bio-200'
                : i < currentIndex
                ? 'border-white/10 bg-white/[0.03] text-slate-500 line-through decoration-white/20'
                : 'border-white/5 bg-transparent text-slate-600'
            }`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
