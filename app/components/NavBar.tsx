"use client";

import { useState } from "react";

// Bot subdomain → outbound SSO redirect target. The Ops link is a
// direct href because ops.williamhickox.com runs its own NextAuth
// (Google) — the same Google session usually keeps that auth seamless
// without an SSO mint hop.
const BOTS: { label: string; host: string }[] = [
  { label: "PFD EA", host: "pfd.ea.williamhickox.com" },
  { label: "Equity", host: "yield.williamhickox.com" },
  { label: "Crypto", host: "crypto.williamhickox.com" },
];

export default function NavBar() {
  const [pendingHost, setPendingHost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ssoRedirect(host: string) {
    if (pendingHost) return;
    setPendingHost(host);
    setError(null);
    try {
      const res = await fetch("/api/sso/mint", { method: "POST" });
      if (!res.ok) {
        const detail = await res.text();
        setError(`SSO mint failed (${res.status}): ${detail.slice(0, 120)}`);
        setPendingHost(null);
        return;
      }
      const { token } = (await res.json()) as { token: string };
      window.location.href = `https://${host}/sso?token=${encodeURIComponent(token)}`;
    } catch (e) {
      setError(`SSO mint failed: ${String(e).slice(0, 120)}`);
      setPendingHost(null);
    }
  }

  return (
    <>
      <nav className="navbar" aria-label="dashboard navigation">
        <a href="https://ops.williamhickox.com" className="nav-link">
          Ops
        </a>
        {BOTS.map((b) => (
          <button
            key={b.host}
            type="button"
            className="nav-link"
            disabled={pendingHost !== null}
            onClick={() => ssoRedirect(b.host)}
          >
            {pendingHost === b.host ? "Signing in…" : b.label}
          </button>
        ))}
      </nav>
      {error && <div className="form-error">{error}</div>}
    </>
  );
}
