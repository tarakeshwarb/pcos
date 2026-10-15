import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'

const PHENOTYPES = [
  {
    id: 'adrenal',
    name: 'Adrenal',
    tag: 'Stress-Driven',
    desc: 'HPA-axis overactivation raises DHEA-S and cortisol, pushing androgen production.',
    color: 'from-plasma-500/25 to-plasma-500/0',
    ring: 'ring-plasma-400/30',
    icon: (
      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
    ),
  },
  {
    id: 'hormonal',
    name: 'Hormonal',
    tag: 'Ovarian / Post-Pill',
    desc: 'Elevated LH:FSH ratio and androgens drive irregular cycles, hirsutism, and acne.',
    color: 'from-bio-400/25 to-bio-400/0',
    ring: 'ring-bio-300/30',
    icon: <path d="M9 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM9 13v8M6 18h6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    id: 'inflammatory',
    name: 'Inflammatory',
    tag: 'Immune / Gut-Driven',
    desc: 'Gut dysbiosis and systemic inflammation (hs-CRP) disrupt ovarian signaling.',
    color: 'from-alert-500/20 to-alert-500/0',
    ring: 'ring-alert-400/30',
    icon: <path d="M12 21s-7-4.35-9.5-8.8C.5 8.4 2.6 4.6 6.2 4.2c2-.2 3.6.8 5.8 3 2.2-2.2 3.8-3.2 5.8-3 3.6.4 5.7 4.2 3.7 8-2.5 4.45-9.5 8.8-9.5 8.8Z" strokeLinejoin="round" />,
  },
  {
    id: 'metabolic',
    name: 'Metabolic',
    tag: 'Insulin-Resistant',
    desc: 'Insulin resistance (HOMA-IR) is the dominant driver of androgen excess and weight.',
    color: 'from-amber-400/20 to-amber-400/0',
    ring: 'ring-amber-300/30',
    icon: <path d="M4 14h4l2-6 4 12 2-8h4" strokeLinecap="round" strokeLinejoin="round" />,
  },
]

export default function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-7xl px-6 pb-28 pt-20 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="chip mx-auto mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-bio-300 animate-pulse" />
              Empowering Your Health Journey
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
              Understanding PCOS
              <br className="hidden sm:block" />
              <span className="text-gradient-bio"> beyond the symptoms.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-base text-slate-300 sm:text-lg">
              A comprehensive platform that helps you uncover the root cause of your Polycystic Ovary Syndrome and provides personalized diet & exercise plans tailored to your unique phenotype.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link to="/registration" className="btn-primary">
                Register Now
                <svg viewBox="0 0 24 24" className="h-4 w-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ABOUT US */}
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <GlassCard className="p-8 sm:p-12 text-center">
          <SectionHeading
            eyebrow="Who We Are"
            title="About Us"
            desc="We are a team of researchers and health professionals dedicated to bringing clarity to PCOS diagnosis and management. We believe in data-driven, personalized approaches that look beyond generic advice."
          />
        </GlassCard>
      </section>

      {/* INTRODUCTION TO PCOS */}
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <GlassCard className="p-8 sm:p-12">
          <SectionHeading
            eyebrow="The Basics"
            title="Introduction to PCOS"
            desc="Polycystic Ovary Syndrome (PCOS) is a common hormonal disorder among women of reproductive age. It is characterized by irregular menstrual cycles, excess androgen levels, and polycystic ovaries. But PCOS is not just one condition; it manifests differently in everyone."
          />
        </GlassCard>
      </section>

      {/* AWARENESS */}
      <section className="relative mx-auto max-w-5xl px-6 py-12">
        <GlassCard className="p-8 sm:p-12 text-center">
          <SectionHeading
            eyebrow="Why It Matters"
            title="Why PCOS Should Be Treated"
            desc="Ignoring PCOS can lead to long-term health complications such as type 2 diabetes, cardiovascular issues, and infertility. Early diagnosis and targeted treatment not only manage symptoms but significantly improve your overall quality of life."
          />
        </GlassCard>
      </section>

      {/* ROOT CAUSE (PHENOTYPES) */}
      <section className="relative mx-auto max-w-7xl px-6 py-20">
        <SectionHeading
          eyebrow="The Underlying Drivers"
          title="Understanding Root Causes"
          desc="PCOS is driven by different underlying metabolic and hormonal factors. We categorize these into four primary phenotypes."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PHENOTYPES.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
            >
              <GlassCard className={`group h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1.5 ring-1 ${p.ring}`}>
                <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${p.color} blur-2xl`} />
                <div className="relative">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 text-slate-100" fill="none" stroke="currentColor" strokeWidth="1.6">
                      {p.icon}
                    </svg>
                  </div>
                  <div className="font-display text-lg font-semibold text-white">{p.name}</div>
                  <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-bio-300/80">{p.tag}</div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-5xl px-6 pb-28">
        <GlassCard strong className="relative overflow-hidden p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 scanline-veil" />
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Ready to find your root cause?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-400 sm:text-base">
            Join us to get a personalized assessment. Upload your reports or answer a few questions to get started.
          </p>
          <Link to="/registration" className="btn-primary mt-8">
            Register Now
          </Link>
        </GlassCard>
      </section>

      <footer className="relative border-t border-white/5 px-6 py-8 text-center text-xs text-slate-500">
        Built for the PCOS management project.
      </footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, desc }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="chip mx-auto">{eyebrow}</span>
      <h2 className="mt-4 font-display text-3xl font-bold text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm text-slate-400 sm:text-base">{desc}</p>
    </div>
  )
}

