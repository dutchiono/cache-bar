import { useAuthActions } from "@convex-dev/auth/react";
import { useState, type FormEvent } from "react";

type Mode = "signIn" | "signUp";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>("signIn");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("flow", mode);
    setPending(true);
    setError(null);
    try {
      await signIn("password", form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-sm rounded-lg border-2 border-black bg-white p-6">
        <h1 className="mb-1 text-2xl font-bold">Cache Bar</h1>
        <p className="mb-5 text-sm text-neutral-500">
          {mode === "signIn" ? "Staff sign in" : "Create a staff account"}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded border border-neutral-400 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="rounded border border-neutral-400 px-3 py-2"
            />
          </label>
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded border-2 border-black bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending
              ? "Please wait…"
              : mode === "signIn"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
          className="mt-4 w-full text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          {mode === "signIn"
            ? "No account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
