import { results } from "@/lib/data";
import Reveal from "./Reveal";

export default function Results() {
  return (
    <section id="results" className="scroll-mt-20 border-y border-white/[0.05] bg-white/[0.015] py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">Measured impact</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Numbers from live systems, not side projects.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {results.map((r, i) => (
            <Reveal key={r.headline} delay={i * 80}>
              <div className="panel panel-hover h-full p-7">
                <div className="flex items-baseline gap-3">
                  <span className="text-gradient font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                    {r.metric}
                  </span>
                  <span className="font-display text-lg font-medium text-white">{r.headline}</span>
                </div>
                <p className="mt-3.5 text-sm leading-relaxed text-slate-400">{r.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
