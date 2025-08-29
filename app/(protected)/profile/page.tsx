// app/(protected)/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Tiny inline icons so we don't depend on lucide-react
function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" fill="none" stroke="currentColor"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor"/>
    </svg>
  );
}
function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 4.2A11.6 11.6 0 0 1 12 4c7 0 11 8 11 8a18.3 18.3 0 0 1-4.2 5.1M6.1 6.1A18.3 18.3 0 0 0 1 12s4 8 11 8c1 0 1.9-.1 2.8-.3" fill="none" stroke="currentColor"/>
    </svg>
  );
}
function IconPencil(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" fill="none" stroke="currentColor"/>
    </svg>
  );
}
function IconSave(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M17 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V7l-4-4Z" fill="none" stroke="currentColor"/>
      <path d="M17 3v4H7V3" fill="none" stroke="currentColor"/>
    </svg>
  );
}

type MeResponse = { user: { id: string; name: string; isAdmin: boolean } | null };

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Email
  const [email, setEmail] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Secret
  const [masked, setMasked] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json() as Promise<MeResponse>);
        const admin = !!me.user?.isAdmin;
        setIsAdmin(admin);
        if (admin) return;

        const r = await fetch("/api/profile/email", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) {
          setEmailError(j?.error ?? "Failed to load email");
        } else {
          setEmail(j.email ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  }

  if (isAdmin) {
    return <div className="p-6 text-red-600">Profile is only available for players (non-admin).</div>;
  }

  async function saveEmail() {
    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const r = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j?.error === "INVALID_EMAIL_FORMAT") setEmailError("Please enter a valid email address.");
        else if (j?.error === "EMAIL_ALREADY_IN_USE") setEmailError("That email is already in use.");
        else setEmailError("Could not save email.");
      } else {
        setEmail(j.email ?? "");
        setEmailSuccess("Email saved.");
        setEmailEditing(false);
      }
    } finally {
      setEmailSaving(false);
    }
  }

  async function revealSecretFor5s() {
    setSecretError(null);
    setRevealLoading(true);
    try {
      const r = await fetch("/api/profile/secret/reveal", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setSecretError(j?.error ?? "Failed to reveal secret.");
        return;
      }
      setSecret(j.secretCode);
      setMasked(false);
      setTimeout(() => setMasked(true), 5000);
    } finally {
      setRevealLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* Email */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Email address</h2>
          {!emailEditing ? (
            <button
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted"
              onClick={() => setEmailEditing(true)}
              title="Edit email"
            >
              <IconPencil /> Edit
            </button>
          ) : null}
        </div>

        {!emailEditing ? (
          <div className="text-sm">
            <input
              disabled
              className="w-full border rounded-lg px-3 py-2 bg-muted/40"
              value={email || ""}
              placeholder="No email set"
              readOnly
            />
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              inputMode="email"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
                onClick={() => setEmailEditing(false)}
                disabled={emailSaving}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
                onClick={saveEmail}
                disabled={emailSaving}
                title="Save email"
              >
                <IconSave />
                {emailSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            {emailSuccess && <p className="text-sm text-green-600">{emailSuccess}</p>}
          </div>
        )}
      </section>

      {/* Secret */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Secret code</h2>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
              onClick={revealSecretFor5s}
              disabled={revealLoading}
              title="Reveal for 5 seconds"
            >
              {masked ? <IconEye /> : <IconEyeOff />}
              {masked ? "Reveal" : "Hide"}
            </button>
            <button
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted"
              onClick={() => router.push("/profile/secret")}
              title="Change secret code"
            >
              <IconPencil /> Edit
            </button>
          </div>
        </div>
        <input
          disabled
          className="w-full border rounded-lg px-3 py-2 bg-muted/40 font-mono tracking-widest"
          value={masked ? "••••••••••" : secret ?? ""}
          readOnly
        />
        {secretError && <p className="text-sm text-red-600">{secretError}</p>}
        <p className="text-xs text-muted-foreground">The secret code is shown only for 5 seconds after you click Reveal.</p>
      </section>
    </div>
  );
}
