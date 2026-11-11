/** "03 — Selected work" tag above a bold heading that ends in one serif italic word. */
export function SectionHead({
  index,
  label,
  title,
  accent,
  id,
}: {
  index: number;
  label: string;
  title: string;
  accent: string;
  id?: string;
}) {
  return (
    <header>
      <p className="tag rv">
        {String(index).padStart(2, "0")} — {label}
      </p>
      <h2 className="h-section" id={id}>
        <span className="rv-mask">
          <span>
            {title} <em>{accent}</em>
          </span>
        </span>
      </h2>
    </header>
  );
}
