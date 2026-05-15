type Props = {
  title: string;
  subtitle?: string;
  crumbs?: string[];
};

export function ScreenStub({ title, subtitle, crumbs }: Props) {
  return (
    <div>
      {crumbs && (
        <div className="mb-1 text-xs text-neutral-500">{crumbs.join(" / ")}</div>
      )}
      <h1 className="mb-1 text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mb-6 text-sm text-neutral-500">{subtitle}</p>}
      <div className="rounded-lg border-2 border-dashed border-neutral-400 p-8 text-center text-sm text-neutral-500">
        Empty stub — wired in a later phase.
      </div>
    </div>
  );
}
