import { site, upworkProof } from "@/lib/data";
import Reveal from "./Reveal";
import { UpworkIcon, StarIcon, ArrowIcon } from "./Icons";

export default function Proof() {
  const stats = [
    { value: upworkProof.jss, label: "Job Success Score" },
    { value: upworkProof.rating, label: "Average client rating", star: true },
    { value: upworkProof.hours, label: "Hours delivered" },
    { value: upworkProof.jobs, label: "Long-term contracts" },
  ];

  return (
    <section className="border-y border-white/[0.05] py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="panel relative overflow-hidden p-8 sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.10] blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent-violet/[0.08] blur-[90px]" />

            <div className="relative flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#73e945]/25 bg-[#73e945]/[0.06] px-3.5 py-1.5 text-xs font-semibold text-[#9ff07a]">
                  <UpworkIcon className="h-4 w-4" />
                  {upworkProof.badge}
                </div>
                <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Proof, in public.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 sm:text-base">
                  {upworkProof.note} Every metric below is verifiable on my profile.
                </p>
                <a
                  href={site.upworkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-accent/50 hover:bg-white/[0.03]"
                >
                  Verify on Upwork
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-base-950/60 px-6 py-5 text-center sm:min-w-[150px]">
                    <div className="font-display flex items-center justify-center gap-1.5 text-2xl font-semibold text-white sm:text-3xl">
                      {s.value}
                      {s.star && <StarIcon className="h-5 w-5 text-amber-300" />}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
