type Props = {
  title: string;
  subtitle?: string;
  crumbs?: string[];
};

export function ScreenStub({ title, subtitle, crumbs }: Props) {
  return (
    <div>
      {crumbs && (
        <div className="mb-1 text-xs text-[var(--cb-muted)]">{crumbs.join(" / ")}</div>
      )}
      <h1 className="cb-display mb-1 text-3xl font-semibold">{title}</h1>
      {subtitle && <p className="mb-6 text-sm text-[var(--cb-muted)]">{subtitle}</p>}
      <div className="cb-panel border-dashed p-10 text-center text-sm text-[var(--cb-muted)]">
        Empty stub — wired in a later phase.
      </div>
    </div>
  );
}
