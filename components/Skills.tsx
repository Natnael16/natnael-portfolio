import { skills } from "@/lib/data";
import Reveal from "./Reveal";

export default function Skills() {
  return (
    <section id="skills" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">Toolbox</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The stack behind the results.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((g, i) => (
            <Reveal key={g.group} delay={Math.min(i, 2) * 70}>
              <div className="panel panel-hover h-full p-6">
                <h3 className="font-mono text-xs uppercase tracking-[0.22em] text-accent">{g.group}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((item) => (
                    <span key={item} className="chip">{item}</span>
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
