import { site, heroStats } from "@/lib/data";
import { GitHubIcon, LinkedInIcon, UpworkIcon, MailIcon, ArrowIcon, StarIcon, DownloadIcon } from "./Icons";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
      {/* backdrop */}
      <div className="grid-lines pointer-events-none absolute inset-0" />
      <div className="aurora pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/[0.13] blur-[130px]" />
      <div className="aurora-slow pointer-events-none absolute -top-20 right-[10%] h-[300px] w-[300px] rounded-full bg-accent-violet/[0.10] blur-[110px]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* availability + proof pill */}
        <div className="animate-fade-up mb-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0ms" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-1.5 text-xs font-medium text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Available for new projects
          </span>
          <a
            href={site.upworkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-accent/40 hover:text-white"
          >
            <UpworkIcon className="h-3.5 w-3.5 text-[#73e945]" />
            Top Rated Plus on Upwork
            <StarIcon className="h-3 w-3 text-amber-300" />
            5.0
          </a>
        </div>

        <h1
          className="animate-fade-up font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          I build <span className="text-gradient">production systems</span>
          <br className="hidden sm:block" /> that ship and scale.
        </h1>

        <p
          className="animate-fade-up mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg"
          style={{ animationDelay: "180ms" }}
        >
          I&apos;m {site.shortName}, a {site.role.toLowerCase()} trusted by startups and enterprises in Germany, the
          USA and the UAE. Web systems designed end to end, deployed to real users and kept fast under load, with
          mobile experience where the product needs it. I use Claude to move fast, and I review every line that ships.
        </p>

        <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "270ms" }}>
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-base-950 transition hover:bg-accent-soft"
          >
            Start a project
            <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href={site.resumeFile}
            download
            className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/[0.08] px-6 py-3 text-sm font-semibold text-white transition hover:border-accent/70 hover:bg-accent/[0.14]"
          >
            <DownloadIcon className="h-4 w-4 text-accent transition-transform group-hover:translate-y-0.5" />
            Download résumé
          </a>
          <a
            href="#work"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-accent/50 hover:bg-white/[0.03]"
          >
            See the work
          </a>
          <div className="flex items-center gap-1.5">
            {[
              { href: site.githubUrl, icon: <GitHubIcon />, label: "GitHub" },
              { href: site.linkedinUrl, icon: <LinkedInIcon />, label: "LinkedIn" },
              { href: `mailto:${site.email}`, icon: <MailIcon />, label: "Email" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-accent/40 hover:text-white"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* stat band */}
        <div
          className="animate-fade-up panel mt-16 grid grid-cols-2 gap-px overflow-hidden !rounded-2xl bg-white/[0.06] lg:grid-cols-4"
          style={{ animationDelay: "360ms" }}
        >
          {heroStats.map((s) => (
            <div key={s.label} className="bg-base-950/90 px-6 py-6">
              <div className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{s.value}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* scroll cue into the studio section */}
        <div className="animate-fade-up mt-14 flex justify-center" style={{ animationDelay: "460ms" }}>
          <a
            href="#studio"
            className="group flex flex-col items-center gap-2 text-[11px] font-mono uppercase tracking-[0.28em] text-slate-600 transition hover:text-accent"
            aria-label="Scroll to the workstation section"
          >
            Keep scrolling
            <span className="scroll-cue flex h-9 w-[22px] items-start justify-center rounded-full border border-white/12 pt-1.5 group-hover:border-accent/50">
              <span className="h-1.5 w-1 rounded-full bg-slate-500 group-hover:bg-accent" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
