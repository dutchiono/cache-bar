import { useEffect } from "react";

export function RedirectToStatic({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-sm text-[#c7c1b3]">
      Redirecting…
    </div>
  );
}
