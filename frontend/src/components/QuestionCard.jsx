import { motion } from 'framer-motion'

function NumberInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">
        {field.label} {field.unit && <span className="text-slate-500 normal-case font-normal">({field.unit})</span>}
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
      <div className="grid grid-cols-2 gap-3">
        {['yes', 'no'].map((opt) => {
          const isActive = value === opt
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(field.key, opt)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                isActive
                  ? 'border-rose-300 bg-rose-50/70 text-[#202321] font-semibold shadow-xs ring-1 ring-rose-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm capitalize">{opt}</span>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                  isActive
                    ? 'border-[#E11D48] bg-[#E11D48] ring-2 ring-rose-200'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SelectInput({ field, value, onChange }) {
  return (
    <div>
      <label className="field-label">{field.label}</label>
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => {
          const isActive = value === opt
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(field.key, opt)}
              className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                isActive
                  ? 'border-rose-300 bg-rose-50 text-rose-800 font-semibold shadow-xs ring-1 ring-rose-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScaleInput({ field, value, onChange }) {
  const hasValue = value !== '' && value !== undefined
  const v = hasValue ? Number(value) : field.min
  const liveLabel = field.labels?.[v]

  return (
    <div>
      <div className="field-label flex items-center justify-between">
        <span>{field.label}</span>
        <span className="font-mono text-xs font-bold text-[#E11D48]">
          {hasValue ? v : '—'}
          {hasValue && liveLabel && <span className="ml-1.5 font-sans font-normal text-slate-600">({liveLabel})</span>}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        value={v}
        onChange={(e) => onChange(field.key, Number(e.target.value))}
        className="w-full accent-[#E11D48] cursor-pointer"
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 font-medium">
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
        placeholder="Enter details…"
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
  'Clinical Evaluation': 'text-slate-700 border-slate-200 bg-slate-100',
  'Biochemical Evaluation': 'text-rose-700 border-rose-200 bg-rose-50',
  'Root Cause Analysis': 'text-amber-800 border-amber-200 bg-amber-50',
}

const FLAG_STYLE = {
  normal: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  overriding: 'text-rose-700 border-rose-200 bg-rose-50',
  unknown: 'text-slate-600 border-slate-200 bg-slate-50',
}

const FLAG_LABEL = {
  normal: 'From your report · within reference range',
  overriding: 'From your report · outside reference range',
  unknown: 'From your report',
}

export default function QuestionCard({ question, index, answers, onChange, carriedOver, reportFlag }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-600 border border-slate-200">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-heading text-base font-semibold text-[#202321] sm:text-lg tracking-[-0.015em]">
              {question.label}
            </h3>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLE[question.category] || 'text-slate-700 border-slate-200 bg-slate-100'}`}>
            {question.category}
          </span>
        </div>

        {question.reference && (
          <div className="mb-4 inline-flex items-center gap-1.5 text-xs text-rose-700 font-mono font-medium bg-rose-50/60 border border-rose-100 px-2.5 py-1 rounded-lg">
            Reference: {question.reference}
          </div>
        )}
        
        {question.description && (
          <div className="mb-4 text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl leading-relaxed">
            {question.description}
          </div>
        )}

        {reportFlag && (
          <div className={`mb-4 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${FLAG_STYLE[reportFlag.flag] || FLAG_STYLE.unknown}`}>
            {FLAG_LABEL[reportFlag.flag] || FLAG_LABEL.unknown}
          </div>
        )}

        {carriedOver ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 font-medium">
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
