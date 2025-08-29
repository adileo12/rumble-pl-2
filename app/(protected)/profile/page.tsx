"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// inline icons (same as before)
function IconEye(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" fill="none" stroke="currentColor"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor"/></svg>);}
function IconEyeOff(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}><path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 4.2A11.6 11.6 0 0 1 12 4c7 0 11 8 11 8a18.3 18.3 0 0 1-4.2 5.1M6.1 6.1A18.3 18.3 0 0 0 1 12s4 8 11 8c1 0 1.9-.1 2.8-.3" fill="none" stroke="currentColor"/></svg>);}
function IconPencil(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" fill="none" stroke="currentColor"/></svg>);}
function IconSave(props: React.SVGProps<SVGSVGElement>) { return (<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...props}><path d="M17 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V7l-4-4Z" fill="none" stroke="currentColor"/><path d="M17 3v4H7V3" fill="none" stroke="currentColor"/></svg>);}

type MeResponse = { user: { id: string; name: string; isAdmin: boolean; email?: string | null } | null };

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
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyOk, setVerifyOk] = useState<string | null>(null);

  // Name
  const [name, setName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // Secret
  const [masked, setMasked] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Notifications
  const [prefs, setPrefs] = useState({ notifyDeadline: false, notifyReport: false, notifyElimination: false });
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<{ id: string; token: string; createdAt: string; expiresAt: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [signoutOthersMsg, setSignoutOthersMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json() as Promise<MeResponse>);
        const admin = !!me.user?.isAdmin;
        setIsAdmin(admin);
        if (admin) return;

        const [emailRes, nameRes, avatarRes, prefRes] = await Promise.all([
          fetch("/api/profile/email", { cache: "no-store" }),
          fetch("/api/profile/name", { cache: "no-store" }),
          fetch("/api/profile/avatar", { cache: "no-store" }),
          fetch("/api/profile/notifications", { cache: "no-store" }),
        ]);
        const emailJson = await emailRes.json();
        const nameJson = await nameRes.json();
        const avatarJson = await avatarRes.json();
        const prefJson = await prefRes.json();

        if (emailRes.ok) setEmail(emailJson.email ?? "");
        if (nameRes.ok) setName(nameJson.name ?? "");
        if (avatarRes.ok) setAvatarUrl(avatarJson.avatarUrl ?? "");
        if (prefRes.ok) setPrefs(prefJson.prefs ?? prefs);

        // check verified
        // quick ping from me endpoint could also include emailVerifiedAt if you add it; we’ll derive via verify/confirm result too.
        const verifyHint = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json() as Promise<any>);
        setEmailVerified(!!verifyHint?.user?.emailVerifiedAt); // harmless if not present
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setSessionsLoading(true);
      try {
        const r = await fetch("/api/profile/sessions", { cache: "no-store" });
        const j = await r.json();
        if (r.ok) setSessions(j.sessions || []);
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading profile…</div>;
  if (isAdmin) return <div className="p-6 text-red-600">Profile is only available for players (non-admin).</div>;

  // === helpers ===
  async function saveEmail() {
    setEmailSaving(true); setEmailError(null); setEmailSuccess(null);
    try {
      const r = await fetch("/api/profile/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await r.json();
      if (!r.ok) {
        if (j?.error === "INVALID_EMAIL_FORMAT") setEmailError("Please enter a valid email address.");
        else if (j?.error === "EMAIL_ALREADY_IN_USE") setEmailError("That email is already in use.");
        else setEmailError("Could not save email.");
      } else {
        setEmail(j.email ?? "");
        setEmailSuccess("Email saved.");
        setEmailVerified(false);
        setEmailEditing(false);
      }
    } finally { setEmailSaving(false); }
  }

  async function revealSecretFor5s() {
    setSecretError(null); setRevealLoading(true);
    try {
      const r = await fetch("/api/profile/secret/reveal", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setSecretError(j?.error ?? "Failed to reveal secret."); return; }
      setSecret(j.secretCode);
      setMasked(false);
      setTimeout(() => setMasked(true), 5000);
    } finally { setRevealLoading(false); }
  }

  async function saveName() {
    setNameSaving(true); setNameMsg(null);
    try {
      const r = await fetch("/api/profile/name", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const j = await r.json();
      if (!r.ok) setNameMsg(j?.error ?? "Could not save name.");
      else { setName(j.name ?? name); setNameMsg("Name saved."); setNameEditing(false); }
    } finally { setNameSaving(false); }
  }

  function toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("READ_FAIL"));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }
  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    setAvatarError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) { setAvatarError("Please choose a PNG/JPG/WEBP image."); return; }
    if (f.size > 250_000) { setAvatarError("Image must be under 250 KB."); return; }
    const dataUrl = await toDataUrl(f);
    setAvatarSaving(true);
    try {
      const r = await fetch("/api/profile/avatar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dataUrl }) });
      const j = await r.json();
      if (!r.ok) setAvatarError(j?.error ?? "Could not save avatar.");
      else setAvatarUrl(j.avatarUrl ?? dataUrl);
    } finally { setAvatarSaving(false); }
  }

  async function sendVerify() {
    setVerifySending(true); setVerifyError(null); setVerifyOk(null);
    try {
      const r = await fetch("/api/profile/email/verify/send", { method: "POST" });
      const j = await r.json();
      if (!r.ok) setVerifyError(j?.error ?? "Could not send verification.");
      else setVerifyOk("Verification code sent. Check your email.");
    } finally { setVerifySending(false); }
  }
  async function confirmVerify() {
    setVerifyError(null); setVerifyOk(null);
    const r = await fetch("/api/profile/email/verify/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: verifyCode }) });
    const j = await r.json();
    if (!r.ok) setVerifyError(j?.error ?? "Verification failed.");
    else { setVerifyOk("Email verified."); setEmailVerified(true); setVerifyCode(""); }
  }

  async function savePrefs() {
    setPrefsSaving(true); setPrefsMsg(null);
    const r = await fetch("/api/profile/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(prefs) });
    const j = await r.json();
    setPrefsSaving(false);
    if (!r.ok) setPrefsMsg(j?.error ?? "Could not save preferences.");
    else setPrefsMsg("Preferences saved.");
  }

  async function signOutOthers() {
    setSignoutOthersMsg(null);
    const r = await fetch("/api/profile/sessions/signout-others", { method: "POST" });
    const j = await r.json();
    if (!r.ok) setSignoutOthersMsg(j?.error ?? "Failed to sign out others.");
    else setSignoutOthersMsg("Other sessions cleared (if any).");
  }

  async function deleteAccount(confirmText: string) {
    const r = await fetch("/api/profile/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: confirmText }) });
    const j = await r.json();
    if (!r.ok) alert(j?.error ?? "Delete failed.");
    else router.replace("/");
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Profile</h1>

      {/* Name */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Display name</h2>
          {!nameEditing && (
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted"
              onClick={() => setNameEditing(true)} title="Edit name">
              <IconPencil /> Edit
            </button>
          )}
        </div>
        {!nameEditing ? (
          <input disabled className="w-full border rounded-lg px-3 py-2 bg-muted/40" value={name} readOnly />
        ) : (
          <div className="space-y-2">
            <input className="w-full border rounded-lg px-3 py-2" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg border hover:bg-muted" onClick={() => setNameEditing(false)} disabled={nameSaving}>Cancel</button>
              <button className="px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60" onClick={saveName} disabled={nameSaving}>
                <IconSave /> {nameSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {nameMsg && <p className="text-sm text-muted-foreground">{nameMsg}</p>}
          </div>
        )}
      </section>

      {/* Avatar */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-medium mb-2">Avatar</h2>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : <span className="text-xs text-muted-foreground">No avatar</span>}
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatarPick} />
        </div>
        {avatarSaving && <p className="text-sm text-muted-foreground">Uploading…</p>}
        {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
        <p className="text-xs text-muted-foreground">PNG/JPG/WEBP, under 250KB.</p>
      </section>

      {/* Email + verify */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Email address</h2>
          {!emailEditing && (
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted"
              onClick={() => setEmailEditing(true)} title="Edit email">
              <IconPencil /> Edit
            </button>
          )}
        </div>
        {!emailEditing ? (
          <input disabled className="w-full border rounded-lg px-3 py-2 bg-muted/40" value={email || ""} placeholder="No email set" readOnly />
        ) : (
          <div className="space-y-2">
            <input className="w-full border rounded-lg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" inputMode="email" autoFocus />
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg border hover:bg-muted" onClick={() => setEmailEditing(false)} disabled={emailSaving}>Cancel</button>
              <button className="px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60" onClick={saveEmail} disabled={emailSaving}>
                <IconSave /> {emailSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            {emailSuccess && <p className="text-sm text-green-600">{emailSuccess}</p>}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className={`text-xs ${emailVerified ? "text-green-600" : "text-amber-600"}`}>
            {email ? (emailVerified ? "Verified" : "Not verified") : "Add an email to enable verification"}
          </span>
          {email && !emailVerified && (
            <>
              <button className="px-2 py-1 text-xs rounded-lg border hover:bg-muted disabled:opacity-60"
                onClick={sendVerify} disabled={verifySending}>Send code</button>
              <input className="border rounded px-2 py-1 text-xs" placeholder="Enter code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
              <button className="px-2 py-1 text-xs rounded-lg border hover:bg-muted" onClick={confirmVerify} disabled={!verifyCode}>Verify</button>
            </>
          )}
        </div>
        {verifyError && <p className="text-sm text-red-600">{verifyError}</p>}
        {verifyOk && <p className="text-sm text-green-600">{verifyOk}</p>}
      </section>

      {/* Secret (reveal + change link) */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Secret code</h2>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60"
              onClick={revealSecretFor5s} disabled={revealLoading} title="Reveal for 5 seconds">
              {masked ? <IconEye /> : <IconEyeOff />} {masked ? "Reveal" : "Hide"}
            </button>
            <button className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border hover:bg-muted"
              onClick={() => router.push("/profile/secret")} title="Change secret code">
              <IconPencil /> Edit
            </button>
          </div>
        </div>
        <input disabled className="w-full border rounded-lg px-3 py-2 bg-muted/40 font-mono tracking-widest" value={masked ? "••••••••••" : secret ?? ""} readOnly />
        {secretError && <p className="text-sm text-red-600">{secretError}</p>}
      </section>

      {/* Notifications */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-medium">Notifications</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.notifyDeadline} onChange={(e) => setPrefs({ ...prefs, notifyDeadline: e.target.checked })} />
          Deadline reminders
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.notifyReport} onChange={(e) => setPrefs({ ...prefs, notifyReport: e.target.checked })} />
          New GW report published
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.notifyElimination} onChange={(e) => setPrefs({ ...prefs, notifyElimination: e.target.checked })} />
          Elimination alerts
        </label>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg border hover:bg-muted disabled:opacity-60" onClick={savePrefs} disabled={prefsSaving}>
            {prefsSaving ? "Saving…" : "Save preferences"}
          </button>
          {prefsMsg && <span className="text-sm text-muted-foreground">{prefsMsg}</span>}
        </div>
      </section>

      {/* Devices & Sessions */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-medium">Devices & sessions</h2>
        <p className="text-xs text-muted-foreground">Shows server sessions if enabled. Your current login uses a cookie only.</p>
        {sessionsLoading ? (
          <p className="text-sm text-muted-foreground">Loading sessions…</p>
        ) : (
          <ul className="text-sm space-y-1">
            <li>Current device: <span className="text-muted-foreground">active</span></li>
            {sessions.map(s => (
              <li key={s.id} className="text-muted-foreground">Session {s.id.slice(0, 8)}… — created {new Date(s.createdAt).toLocaleString()}</li>
            ))}
            {!sessions.length && <li className="text-muted-foreground">No server sessions.</li>}
          </ul>
        )}
        <button className="px-3 py-1.5 rounded-lg border hover:bg-muted" onClick={signOutOthers}>Sign out other devices</button>
        {signoutOthersMsg && <p className="text-sm text-muted-foreground">{signoutOthersMsg}</p>}
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border p-4 space-y-3">
        <h2 className="font-medium text-red-600">Danger zone</h2>
        <p className="text-sm text-muted-foreground">Deleting your account removes your data and signs you out.</p>
        <DangerDelete onDelete={deleteAccount} />
      </section>
    </div>
  );
}

function DangerDelete({ onDelete }: { onDelete: (confirmText: string) => void }) {
  const [confirmText, setConfirmText] = useState("");
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <input className="border rounded-lg px-3 py-2 text-sm" placeholder='Type your name or "DELETE" to confirm'
        value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      <button className="px-3 py-1.5 rounded-lg border hover:bg-muted text-red-600" onClick={() => onDelete(confirmText)}>
        Delete account
      </button>
    </div>
  );
}
