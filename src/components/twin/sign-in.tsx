"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/fetch-json";

const DEMO_ACCOUNTS = [
  { email: "bank@climavex.test", label: "Bank analyst", detail: "Reads twins, adds loan terms and cash flows" },
  { email: "insurer@climavex.test", label: "Insurance underwriter", detail: "Reads twins, runs scenarios" },
  { email: "farmer@climavex.test", label: "Farmer", detail: "Owns and edits the twin geometry" },
];

/**
 * Sign-in. The demo accounts are real seeded users that go through the same
 * credential check and the same authorization guards as anyone else — picking
 * one fills the form, it does not bypass anything.
 */
export function SignIn() {
  const [email, setEmail] = useState("bank@climavex.test");
  const [password, setPassword] = useState("climavex");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white md:grid md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-slate-950 p-8 text-slate-100 md:flex">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded bg-teal-600 text-sm font-bold">CV</div>
            <h1 className="mt-6 text-2xl font-semibold leading-tight">ClimaVex</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Agricultural digital twins for Anatolia. Banks and insurers connect mapped fields, crops
              and shared resources to loan repayment assessments and portfolio stress tests.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-400">
            {[
              "Draw and divide fields into crop sections",
              "Move through the season and see timing gaps",
              "Trace shared wells and canals across borrowers",
              "Stress-test repayments against past weather",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-500" />
                {item}
              </li>
            ))}
          </ul>
          <p className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
            Demo simulation — AI model not connected. Predictive outputs come from a published,
            deterministic rule set.
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-lg font-semibold text-slate-950">Sign in</h2>
          <p className="mt-1 text-xs text-slate-500">Use a demo account or your own credentials.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>
            ) : null}
            <Button type="submit" className="w-full gap-1.5" disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-6 space-y-1.5 border-t border-slate-200 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Demo accounts</p>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword("climavex"); }}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <p className="text-xs font-medium text-slate-900">{a.label}</p>
                <p className="text-[10px] text-slate-500">{a.detail}</p>
                <p className="cvx-num mt-0.5 text-[10px] text-slate-400">{a.email} · climavex</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
