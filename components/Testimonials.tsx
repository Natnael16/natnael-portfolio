import { testimonials, site } from "@/lib/data";
import Reveal from "./Reveal";
import { StarIcon, UpworkIcon } from "./Icons";

function Stars() {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon key={i} className="h-4 w-4 text-amber-300" />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-white">5.0</span>
    </div>
  );
}

function Meta({ t }: { t: (typeof testimonials)[number] }) {
  return (
    <div className="mt-6 border-t border-white/[0.07] pt-5">
      <p className="text-sm font-semibold text-white">{t.contract}</p>
      <p className="mt-0.5 font-mono text-xs text-slate-500">
        Verified Upwork client · {t.period} · {t.hours}
      </p>
      {t.endorsements.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {t.endorsements.map((e) => (
            <span key={e} className="chip !text-[11px]">{e}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Testimonials() {
  const featured = testimonials.find((t) => t.featured)!;
  const rest = testimonials.filter((t) => !t.featured);

  return (
    <section id="reviews" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="section-kicker">Client reviews</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Every client. Five stars. In their own words.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-slate-400">
            Unedited feedback from completed contracts,{" "}
            <a
              href={site.upworkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-soft underline decoration-accent/30 underline-offset-4 transition hover:decoration-accent"
            >
              verifiable on my Upwork profile
            </a>
            .
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {/* featured review */}
          <Reveal className="lg:row-span-3">
            <figure className="panel panel-hover relative flex h-full flex-col overflow-hidden p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/[0.09] blur-[80px]" />
              <div className="flex items-center justify-between">
                <Stars />
                <UpworkIcon className="h-5 w-5 text-[#73e945]" />
              </div>
              <blockquote className="my-auto py-8 text-base leading-loose text-slate-300 sm:text-[17px]">
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
              <figcaption>
                <Meta t={featured} />
              </figcaption>
            </figure>
          </Reveal>

          {/* remaining reviews */}
          {rest.map((t, i) => (
            <Reveal key={t.contract + t.period} delay={i * 70}>
              <figure className="panel panel-hover flex h-full flex-col p-7">
                <div className="flex items-center justify-between">
                  <Stars />
                  <UpworkIcon className="h-5 w-5 text-[#73e945]" />
                </div>
                <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption>
                  <Meta t={t} />
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
