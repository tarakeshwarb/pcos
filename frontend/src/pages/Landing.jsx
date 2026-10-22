import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import DNAHelix from '../components/dna/DNAHelix.jsx'
import { getCurrentUser } from '../lib/api.js'

const PHENOTYPES = [
  {
    id: 'metabolic',
    num: '01',
    name: 'Metabolic',
    tag: 'Insulin-Resistant',
    desc: 'Insulin resistance (HOMA-IR) is the dominant driver of androgen excess, weight gain, and cycle irregularities.',
    badge: 'bg-[#F9F6EE] text-[#8C6D1F] border-[#E8DFC8]',
    color: 'from-amber-500/20 to-amber-500/0',
    icon: (
      <path d="M4 14h4l2-6 4 12 2-8h4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    id: 'hormonal',
    num: '02',
    name: 'Hormonal',
    tag: 'Ovarian / Post-Pill',
    desc: 'Elevated LH:FSH ratio and androgen surge disrupt follicular maturation, leading to ovulatory arrest and acne.',
    badge: 'bg-[#FDF2F4] text-[#9E2A3E] border-[#F5D5DC]',
    color: 'from-rose-500/20 to-rose-500/0',
    icon: (
      <path d="M9 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM9 13v8M6 18h6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    id: 'inflammatory',
    num: '03',
    name: 'Inflammatory',
    tag: 'Immune / Gut-Driven',
    desc: 'Gut dysbiosis and elevated systemic inflammation (hs-CRP) impair ovarian signaling and trigger hormonal imbalance.',
    badge: 'bg-[#F0F7FB] text-[#1E6B96] border-[#D0E5F2]',
    color: 'from-sky-500/20 to-sky-500/0',
    icon: (
      <path d="M12 21s-7-4.35-9.5-8.8C.5 8.4 2.6 4.6 6.2 4.2c2-.2 3.6.8 5.8 3 2.2-2.2 3.8-3.2 5.8-3 3.6.4 5.7 4.2 3.7 8-2.5 4.45-9.5 8.8-9.5 8.8Z" strokeLinejoin="round" />
    ),
  },
  {
    id: 'adrenal',
    num: '04',
    name: 'Adrenal',
    tag: 'Stress / HPA-Axis',
    desc: 'Chronic stress and HPA-axis overactivation elevate DHEA-S and cortisol, stimulating androgenic symptoms.',
    badge: 'bg-[#F6F2FA] text-[#6D3899] border-[#E3D6F0]',
    color: 'from-purple-500/20 to-purple-500/0',
    icon: (
      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" strokeLinecap="round" />
    ),
  },
]

export default function Landing() {
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' })
        }, 150)
      }
    }
  }, [])

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 bg-[#F5F6F4]">
      {/* ============================================================ */}
      {/* HERO SECTION (Minimal Editorial Layout with 3D DNA Helix)    */}
      {/* ============================================================ */}
      <section id="home" className="scroll-mt-24 relative min-h-[640px] lg:h-[calc(100vh-80px)] lg:max-h-[860px] flex flex-col justify-between overflow-hidden pt-6 sm:pt-10 px-4 sm:px-8 bg-[#F5F6F4]">
        {/* Real-time 3D DNA Double Helix WebGL Visualization (Three.js) */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-8/12 xl:w-9/12 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <DNAHelix className="w-full h-full min-h-[600px] lg:min-h-[820px]" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 mx-auto max-w-7xl w-full my-auto py-12 lg:py-16">
          <div className="max-w-2xl space-y-6 sm:space-y-8">
            
            {/* Eyebrow - Small medium uppercase with refined letter tracking */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-purple-50/70 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-900 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#7C3AED] animate-pulse" />
                PURPOSE OF HELIXDX
              </span>
            </div>

            {/* Main Headline - Helvetica Neue Light 300, 52-64px desktop, uppercase, solid charcoal */}
            <h1
              className="font-heading text-[38px] sm:text-[50px] lg:text-[60px] font-light tracking-[-0.035em] text-[#202321] leading-[1.08] uppercase"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 300, color: '#202321', letterSpacing: '-0.035em' }}
            >
              Detailed diagnostic <br />
              <span className="text-[#202321]">of your body</span>
            </h1>

            {/* Clean Subtitle Paragraph in Inter 400 Regular font, 15px, line-height 1.65 */}
            <p
              className="text-[15px] sm:text-[16px] text-[#626762] max-w-md leading-[1.65] font-normal"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 400, color: '#626762' }}
            >
              Health is the most important thing. So don't put it off for later. Think about your future today.
            </p>

            {/* Action Buttons - Inter 500, 14px, minimal rounded pill style */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to={currentUser ? "/assessment" : "/login?redirect=/assessment"}
                className="inline-flex items-center justify-center rounded-full border border-[#202321] bg-transparent px-7 py-3 text-[14px] font-medium tracking-[0.02em] text-[#202321] transition-all duration-300 hover:bg-[#202321] hover:text-white active:scale-95 shadow-xs"
              >
                Make an Appointment
              </Link>

              {currentUser ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-[#D5D7D1] bg-white px-6 py-3 text-[14px] font-medium text-[#202321] hover:border-[#202321] transition-all shadow-xs"
                >
                  My Dashboard
                </Link>
              ) : (
                <Link
                  to="/registration"
                  className="inline-flex items-center justify-center rounded-full border border-[#D5D7D1] bg-white px-6 py-3 text-[14px] font-medium text-[#202321] hover:border-[#202321] transition-all shadow-xs"
                >
                  Register Free
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Scroll Indicator */}
        <div className="relative z-10 mx-auto max-w-7xl w-full pb-4 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#7A7F7A]">
            <span>ROTTERDAM CONSENSUS v3.1</span>
            <span>&bull;</span>
            <span>4 PHENOTYPIC AXES</span>
          </div>

          <a
            href="#about"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#202321] px-5 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-[#404541] transition-colors"
          >
            <span>&darr;</span>
            <span>Scroll for more</span>
          </a>
        </div>
      </section>

      {/* ============================================================ */}
      {/* ABOUT US                                                     */}
      {/* ============================================================ */}
      <section id="about" className="scroll-mt-24 relative mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-[#E5E7E2] bg-white p-8 sm:p-12 text-center shadow-xs">
          <SectionHeading
            eyebrow="Who We Are"
            title="About Us"
            desc="Evidence-based PCOS analysis and targeted clinical guidance designed to identify your root cause."
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* INTRODUCTION TO PCOS                                         */}
      {/* ============================================================ */}
      <section id="pcos" className="scroll-mt-24 relative mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-[#E5E7E2] bg-white p-8 sm:p-12 shadow-xs">
          <SectionHeading
            eyebrow="The Basics"
            title="Introduction to PCOS"
            desc="PCOS affects cycles, androgens, and metabolism differently in every individual. Effective management requires identifying your specific phenotype."
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* AWARENESS                                                    */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-[#E5E7E2] bg-white p-8 sm:p-12 text-center shadow-xs">
          <SectionHeading
            eyebrow="Why It Matters"
            title="Why PCOS Should Be Treated"
            desc="Early identification prevents metabolic complications, restores ovulatory rhythm, and improves overall wellbeing."
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/* 01-04 NUMBERED PHENOTYPES CARD STRIP                         */}
      {/* ============================================================ */}
      <section id="phenotypes" className="scroll-mt-24 relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#E5E7E2] bg-white p-6 sm:p-10 shadow-xs">
          
          {/* 01 Banner Card */}
          <div className="grid md:grid-cols-12 gap-6 sm:gap-8 items-start sm:items-center pb-10 border-b border-[#EFEFEA]">
            <div className="md:col-span-2 flex items-start">
              <span className="font-heading text-6xl sm:text-7xl font-light tracking-tighter text-[#202321] leading-none">
                01
              </span>
            </div>
            <div className="md:col-span-5 space-y-2">
              <span className="text-[11px] font-medium text-[#7A7F7A] tracking-[0.14em] uppercase block">
                ROTTERDAM CONSENSUS CRITERIA
              </span>
              <h2 className="font-heading text-[26px] sm:text-[32px] font-normal tracking-[-0.035em] text-[#202321] leading-[1.15] uppercase">
                First Evidence-Based Phenotype Intelligence in PCOS Care
              </h2>
            </div>
            <div className="md:col-span-5">
              <p className="font-body text-[14px] sm:text-[15px] text-[#626762] leading-[1.65] font-normal">
                HelixDx maps the 4 distinct root drivers of PCOS. We evaluate biomarkers, metabolic panels, and cycle parameters to deliver precision lifestyle protocols.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PHENOTYPES.map((p) => (
              <div
                key={p.id}
                className="group relative rounded-2xl border border-[#E5E7E2] bg-white p-6 transition-all duration-300 hover:border-[#202321] hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-heading text-3xl font-light text-slate-300 group-hover:text-[#202321] transition-colors">
                    {p.num}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F6F4] border border-[#E5E7E2] text-[#202321] shadow-xs">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      {p.icon}
                    </svg>
                  </div>
                </div>

                <h3 className="font-heading text-[18px] sm:text-[20px] font-medium text-[#202321] tracking-[-0.025em]">
                  {p.name}
                </h3>
                <span className={`inline-block mt-1 text-[11px] font-medium tracking-[0.04em] px-2.5 py-0.5 rounded-full border ${p.badge}`}>
                  {p.tag}
                </span>

                <p className="mt-3 text-[14px] text-[#626762] leading-[1.65] font-normal">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* BOTTOM CTA CARD                                             */}
      {/* ============================================================ */}
      <section className="relative mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#202321] bg-[#202321] p-10 text-center sm:p-16 text-white shadow-xl">
          <h2 className="font-heading text-[26px] sm:text-[34px] font-light text-white tracking-[-0.035em] uppercase">
            Ready to find your root cause?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] sm:text-[15px] text-[#A6ABA5] leading-[1.65] font-normal">
            Join us to get a personalized assessment. Upload your reports or answer a few questions to get started.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to={currentUser ? "/assessment" : "/login?redirect=/assessment"}
              className="inline-flex items-center justify-center rounded-full border border-white bg-white px-8 py-3.5 text-[14px] font-medium tracking-wide text-[#202321] transition-all duration-300 hover:bg-[#F5F6F4] shadow-md active:scale-95"
            >
              Take Assessment
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[#E5E7E2] bg-[#F5F6F4] px-6 py-8 text-center text-xs text-[#7A7F7A] font-normal">
        Built for the PCOS management project &bull; Rotterdam Consensus Phenotype Framework.
      </footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, desc }) {
  return (
    <div className="mx-auto max-w-2xl text-center space-y-3">
      <span className="chip mx-auto text-[11px] font-medium tracking-[0.1em] uppercase">{eyebrow}</span>
      <h2 className="font-heading text-[28px] sm:text-[36px] font-normal text-[#202321] tracking-[-0.035em] leading-[1.15] uppercase">{title}</h2>
      <p className="text-[14px] sm:text-[15px] text-[#626762] leading-[1.65] font-normal">{desc}</p>
    </div>
  )
}
