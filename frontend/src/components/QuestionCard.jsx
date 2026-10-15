import { motion } from 'framer-motion'

function NumberInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">
        {field.label} {field.unit && <span className="text-slate-500">({field.unit})</span>}
      </label>
      <input
        type="number"
        step={field.step ?? 'any'}
        min={field.min}
        max={field.max}
        className="input-glass"
        placeholder="Optional — leave blank if unknown"
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
      />
    </div>
  )
}

function YesNoInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">{field.label}</label>
      <div className="grid grid-cols-2 gap-2.5">
        {['yes', 'no'].map((opt) => (
          <button
            type="button"
            key={opt}
            className="tick-toggle"
            data-active={value === opt}
            onClick={() => onChange(field.key, opt)}
          >
            <span className="text-sm font-medium capitalize text-slate-200">{opt}</span>
            <span
              className={`h-4 w-4 rounded-full border transition-all ${
                value === opt ? 'border-bio-300 bg-bio-300 shadow-glow' : 'border-white/20'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function SelectInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">{field.label}</label>
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(field.key, opt)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
              value === opt
                ? 'border-bio-300/60 bg-bio-400/15 text-bio-100 shadow-glow'
                : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScaleInput({ field, value, onChange }) {
  const hasValue = value !== '' && value !== undefined
  const v = hasValue ? Number(value) : field.min
  // Plain-language meaning of the current value (mentor feedback: any scale
  // used needs a plain-language definition shown to the user -- "what does
  // a 7 mean?"), e.g. PSS-10's Never/Sometimes/Very Often anchors.
  const liveLabel = field.labels?.[v]
  return (
    <div>
      <div className="field-label flex items-center justify-between">
        <span>{field.label}</span>
        <span className="font-mono text-bio-300">
          {hasValue ? v : '—'}
          {hasValue && liveLabel && <span className="ml-1.5 font-sans text-slate-400">({liveLabel})</span>}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        value={v}
        onChange={(e) => onChange(field.key, Number(e.target.value))}
        className="w-full accent-bio-400"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{field.labels ? field.labels[field.min] : field.min}</span>
        <span>{field.labels ? field.labels[field.max] : field.max}</span>
      </div>
    </div>
  )
}

function TextInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">{field.label}</label>
      <input
        type="text"
        className="input-glass"
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    </div>
  )
}

function FieldRenderer({ field, value, onChange }) {
  if (field.type === 'number') return <NumberInput field={field} value={value} onChange={onChange} />
  if (field.type === 'yesno') return <YesNoInput field={field} value={value} onChange={onChange} />
  if (field.type === 'select') return <SelectInput field={field} value={value} onChange={onChange} />
  if (field.type === 'scale') return <ScaleInput field={field} value={value} onChange={onChange} />
  return <TextInput field={field} value={value} onChange={onChange} />
}

const CATEGORY_STYLE = {
  'Clinical Evaluation': 'text-bio-300 border-bio-300/30 bg-bio-400/10',
  'Biochemical Evaluation': 'text-plasma-400 border-plasma-400/30 bg-plasma-500/10',
  'Root Cause Analysis': 'text-amber-300 border-amber-300/30 bg-amber-400/10',
}

const FLAG_STYLE = {
  normal: 'text-bio-300 border-bio-300/30 bg-bio-400/10',
  overriding: 'text-alert-400 border-alert-500/30 bg-alert-500/10',
  unknown: 'text-slate-400 border-white/10 bg-white/5',
}
const FLAG_LABEL = {
  normal: 'From your report · within reference range',
  overriding: 'From your report · outside reference range',
  unknown: 'From your report',
}

export default function QuestionCard({ question, index, answers, onChange, carriedOver, reportFlag }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.03 }}
    >
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 font-mono text-[11px] text-slate-400">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-display text-sm font-semibold text-slate-100 sm:text-base">{question.label}</h3>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${CATEGORY_STYLE[question.category] || ''}`}>
            {question.category}
          </span>
        </div>

        {question.reference && (
          <div className="mb-4 field-ref">Reference: {question.reference}</div>
        )}
        
        {question.description && (
          <div className="mb-4 text-xs text-slate-400 bg-white/5 p-2 rounded-lg">
            {question.description}
          </div>
        )}

        {reportFlag && (
          <div className={`mb-4 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${FLAG_STYLE[reportFlag.flag] || FLAG_STYLE.unknown}`}>
            {FLAG_LABEL[reportFlag.flag] || FLAG_LABEL.unknown}
          </div>
        )}

        {carriedOver ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
            Already answered in an earlier section — reused here automatically.
          </div>
        ) : (
          <div className={`grid gap-4 ${question.fields.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {question.fields.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={answers[field.key]}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
