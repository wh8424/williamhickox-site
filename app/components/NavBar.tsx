"use client";

import { useState } from "react";

const BOTS: { label: string; host: string }[] = [
  { label: "PFD EA", host: "pfd.ea.williamhickox.com" },
  { label: "Equity", host: "yield.williamhickox.com" },
  { label: "Crypto", host: "crypto.williamhickox.com" },
];

const MINT_TIMEOUT_MS = 5000;

export default function NavBar() {
  // Independent loading state per button. A hung mint on one bot
  // must not freeze the others.
  const [pending, setPending] = useState<Set<string>>(new Set());

  function setHostPending(host: string, on: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (on) next.add(host);
      else next.delete(host);
      return next;
    });
  }

  async function ssoRedirect(host: string) {
    if (pending.has(host)) return;
    setHostPending(host, true);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), MINT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/sso/mint", {
        method: "POST",
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        // Mint failed — fall through to the bot directly. The bot's
        // own /login + axios interceptor will route the user through
        // the SSO flow if needed.
        window.location.href = `https://${host}`;
        return;
      }
      const { token } = (await res.json()) as { token: string };
      window.location.href = `https://${host}/sso?token=${encodeURIComponent(token)}`;
    } catch {
      clearTimeout(timer);
      window.location.href = `https://${host}`;
    } finally {
      // If the navigation fired, we never reach this. If it didn't
      // (e.g. dev console error), unblock the button.
      setHostPending(host, false);
    }
  }

  return (
    <nav className="navbar" aria-label="dashboard navigation">
      <a href="https://ops.williamhickox.com" className="nav-link">
        Ops
      </a>
      {BOTS.map((b) => (
        <button
          key={b.host}
          type="button"
          className="nav-link"
          disabled={pending.has(b.host)}
          onClick={() => ssoRedirect(b.host)}
        >
          {pending.has(b.host) ? "Signing in…" : b.label}
        </button>
      ))}
    </nav>
  );
}
