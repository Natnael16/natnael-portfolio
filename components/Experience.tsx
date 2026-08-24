import { timeline } from "@/lib/data";
import Reveal from "./Reveal";

export default function Experience() {
  return (
    <section id="experience" className="scroll-mt-20 border-y border-white/[0.05] bg-white/[0.015] py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">Experience</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            From competitive programming to leading production teams.
          </h2>
        </Reveal>

        <div className="relative mt-14 space-y-10 border-l border-white/10 pl-8 sm:pl-10">
          {timeline.map((t, i) => (
            <Reveal key={t.title} delay={Math.min(i, 3) * 60}>
              <div className="relative">
                <span className="absolute -left-[41px] top-1.5 flex h-4 w-4 items-center justify-center sm:-left-[49px]">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_14px_rgba(34,211,238,0.7)]" />
                </span>
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">{t.period}</p>
                <h3 className="font-display mt-1.5 text-lg font-semibold text-white sm:text-xl">{t.title}</h3>
                <p className="mt-0.5 text-sm font-medium text-accent-soft/80">{t.org}</p>
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-400">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
