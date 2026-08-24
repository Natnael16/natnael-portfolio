import { services } from "@/lib/data";
import Reveal from "./Reveal";
import { ServiceIcon } from "./Icons";

export default function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">What I do</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Four capabilities, one engineer who owns the whole stack.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="panel panel-hover h-full p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.08] text-accent">
                  <ServiceIcon name={s.icon} />
                </div>
                <h3 className="font-display mt-5 text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{s.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <span key={p} className="chip">{p}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
