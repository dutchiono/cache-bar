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
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      if (mode === "signUp" && message.toLowerCase().includes("already exists")) {
        setMode("signIn");
        setError("Account already exists. Sign in with your password.");
      } else if (message.includes("InvalidSecret") || message.includes("Invalid credentials")) {
        setError("Wrong password for this email.");
      } else if (message.includes("Server Error")) {
        setError("Sign-in failed on server. Refresh and try again, then confirm email/password.");
      } else if (message.includes("TooManyFailedAttempts")) {
        setError("Too many failed attempts. Wait a minute and try again.");
      } else {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cb-paper)] p-6">
      <div className="w-full max-w-sm rounded-lg border border-[var(--cb-line)] bg-[var(--cb-paper-soft)] p-6">
        <h1 className="cb-display mb-1 text-3xl font-semibold">Cache Bar</h1>
        <p className="mb-5 text-sm text-[var(--cb-muted)]">
          {mode === "signIn" ? "Staff sign in" : "Create a staff account"}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="cb-label">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="cb-field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="cb-label">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              className="cb-field"
            />
          </label>
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="cb-button"
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
          className="cb-link mt-4 w-full text-xs text-[var(--cb-muted)]"
        >
          {mode === "signIn"
            ? "No account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
