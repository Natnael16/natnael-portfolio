type IconProps = { className?: string };

export function GitHubIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.68 5.38-5.24 5.66.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function LinkedInIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

export function UpworkIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.56 13.97c-.87 0-1.68-.37-2.42-.96l.18-.85v-.03c.16-.9.67-2.42 2.24-2.42a2.13 2.13 0 0 1 0 4.26Zm0-6.42a4.28 4.28 0 0 0-4.17 3.28c-.64-.96-1.12-2.1-1.4-3.07h-2.4v3.71a2.31 2.31 0 1 1-4.62 0V7.76H3.56v3.71a4.72 4.72 0 0 0 4.72 4.71 4.72 4.72 0 0 0 4.71-4.71v-.62c.28.58.62 1.17 1.03 1.7l-.87 4.13h2.46l.63-2.99c.55.35 1.19.58 1.9.62l.42.01a4.29 4.29 0 0 0 0-8.57Z" />
    </svg>
  );
}

export function MailIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden>
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5 14.9 8.6l6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9L12 2.5Z" />
    </svg>
  );
}

export function ServiceIcon({ name, className = "h-6 w-6" }: IconProps & { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "stack":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common} aria-hidden>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 13 9 5 9-5" />
          <path d="m3 17.5 9 5 9-5" opacity="0.5" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common} aria-hidden>
          <path d="M12 2.5c.9 4.9 2.6 6.6 7.5 7.5-4.9.9-6.6 2.6-7.5 7.5-.9-4.9-2.6-6.6-7.5-7.5 4.9-.9 6.6-2.6 7.5-7.5Z" />
          <path d="M19 15.5c.4 2.2 1.2 3 3.4 3.4-2.2.4-3 1.2-3.4 3.4-.4-2.2-1.2-3-3.4-3.4 2.2-.4 3-1.2 3.4-3.4Z" opacity="0.6" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common} aria-hidden>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M10.5 18.5h3" />
        </svg>
      );
    case "server":
      return (
        <svg viewBox="0 0 24 24" className={className} {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="7" rx="2" />
          <rect x="3" y="13" width="18" height="7" rx="2" />
          <path d="M7 7.5h.01M7 16.5h.01M11 7.5h2M11 16.5h2" />
        </svg>
      );
    default:
      return null;
  }
}
