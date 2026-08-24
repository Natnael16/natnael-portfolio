import { clients } from "@/lib/data";
import Reveal from "./Reveal";

export default function Clients() {
  return (
    <section className="border-y border-white/[0.05] bg-white/[0.015] py-10">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="mb-7 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Trusted by teams across three continents
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {clients.map((c) => (
              <div key={c.name} className="text-center">
                <div className="font-display text-lg font-semibold tracking-tight text-slate-300">{c.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{c.meta}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
