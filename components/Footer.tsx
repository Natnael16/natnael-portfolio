import { site } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-slate-600 sm:flex-row sm:px-8">
        <p>
          © {new Date().getFullYear()} {site.name}. Built with Next.js & Tailwind CSS.
        </p>
        <p className="font-mono">natnael.dev — designed to convert, engineered to last.</p>
      </div>
    </footer>
  );
}
