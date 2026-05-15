import { useAction } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";

export default function Settings() {
  const changePassword = useAction(api.account.changePassword);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      await changePassword({ currentPassword, newPassword });
      setOk("Password updated.");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Account security and preferences.</p>
      </header>

      <section className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          Change Password
        </h2>

        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <Field label="Current password" name="currentPassword" autoComplete="current-password" />
          <Field label="New password" name="newPassword" autoComplete="new-password" />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            autoComplete="new-password"
          />
          {error && (
            <p className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}
          {ok && (
            <p className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {ok}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-200 disabled:opacity-50"
          >
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  autoComplete,
}: {
  label: string;
  name: string;
  autoComplete: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <input
        required
        name={name}
        type="password"
        autoComplete={autoComplete}
        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      />
    </label>
  );
}
