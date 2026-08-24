import { projects, alsoShipped } from "@/lib/data";
import Reveal from "./Reveal";

const accentStyles: Record<string, string> = {
  cyan: "from-cyan-400/60",
  violet: "from-violet-400/60",
  emerald: "from-emerald-400/60",
  amber: "from-amber-400/60",
  rose: "from-rose-400/60",
};

export default function Projects() {
  return (
    <section id="work" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">Selected work</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Products I&apos;ve architected, led, and shipped.
          </h2>
        </Reveal>

        <div className="mt-12 space-y-5">
          {projects.map((p, i) => (
            <Reveal key={p.name} delay={Math.min(i, 2) * 60}>
              <article className="panel panel-hover relative overflow-hidden p-7 sm:p-9">
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentStyles[p.accent] ?? "from-cyan-400/60"} via-transparent to-transparent`}
                />
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-white">{p.name}</h3>
                      <span className="font-mono text-xs text-slate-500">{p.period}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-accent-soft/90">{p.role}</p>
                    <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-[15px]">{p.description}</p>
                  </div>
                  <div className="flex max-w-xs flex-wrap gap-2 md:justify-end">
                    {p.tags.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Shorter engagements: deliberately lighter than the cards above. */}
        <Reveal delay={80}>
          <div className="mt-14 border-t border-white/[0.06] pt-10">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">Also shipped</p>
            <div className="mt-6 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {alsoShipped.map((s) => (
                <div key={s.name}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-[15px] font-semibold text-white">{s.name}</h3>
                    <span className="font-mono text-[11px] text-slate-600">{s.period}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
