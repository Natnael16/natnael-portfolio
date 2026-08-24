import { site } from "@/lib/data";
import Reveal from "./Reveal";
import { GitHubIcon, LinkedInIcon, UpworkIcon, MailIcon, ArrowIcon } from "./Icons";

export default function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 relative overflow-hidden py-28">
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[130px]" />
      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="section-kicker">Let&apos;s build</p>
          <h2 className="font-display mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Have a product that needs to <span className="text-gradient">ship?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            I take on a small number of serious projects at a time — full builds, AI features, or rescuing systems that
            need to scale. Tell me what you&apos;re building and I&apos;ll reply within 24 hours.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href={`mailto:${site.email}?subject=Project%20inquiry`}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-base-950 transition hover:bg-accent-soft"
            >
              <MailIcon className="h-4 w-4" />
              {site.email}
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href={site.upworkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-accent/50 hover:bg-white/[0.03]"
            >
              <UpworkIcon className="h-4 w-4 text-[#73e945]" />
              Hire me on Upwork
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            {[
              { href: site.githubUrl, icon: <GitHubIcon />, label: "GitHub" },
              { href: site.linkedinUrl, icon: <LinkedInIcon />, label: "LinkedIn" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-accent/40 hover:text-white"
              >
                {s.icon}
              </a>
            ))}
          </div>

          <p className="mt-8 text-xs text-slate-600">
            {site.location} ·{" "}
            <a href={site.resumeFile} className="underline decoration-slate-700 underline-offset-4 transition hover:text-slate-400" download>
              Download résumé (PDF)
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
