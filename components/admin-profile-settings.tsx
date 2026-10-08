"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminSession } from "@/components/use-admin-session";
import { AdminApiError, adminPost } from "@/lib/admin-api";

export function AdminProfileSettings() {
  const router = useRouter();
  const { session, loading, error: sessionError, setSession } = useAdminSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!session) return;
    if (newPassword !== confirmPassword) { setError("New password and confirmation do not match."); return; }
    if (newPassword.length < 12) { setError("Use at least 12 characters for the new password."); return; }
    setSubmitting(true);
    try {
      await adminPost("/api/admin/password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setSession({ ...session, mustChangePassword: false });
      setMessage("Password updated. Other admin sessions have been signed out.");
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 409)) router.replace("/admin/login/");
      else setError(cause instanceof Error ? cause.message : "Could not reach the password service.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = loading || !session || submitting;

  return (
    <AdminShell title="Admin profile" subtitle="Your account details and password settings." email={session?.email}>
      {sessionError && <div className="admin-config-alert" role="alert"><ShieldCheck size={19} /><div><strong>Profile setup needed</strong><p>{sessionError}</p></div></div>}
      <div className="admin-profile-grid">
        <section className="admin-panel-card admin-profile-card">
          <div className="admin-panel-heading"><div><p>YOUR ACCOUNT</p><h2>Administrator</h2><span>Site owner access</span></div><span className="admin-panel-icon"><UserRound size={19} /></span></div>
          <div className="admin-profile-identity"><span className="admin-profile-avatar"><UserRound size={27} /></span><strong>Administrator</strong><span>Admin account</span></div>
          <div className="admin-profile-email"><small>Email address</small><strong>{session?.email || (loading ? "Loading…" : "Not connected")}</strong></div>
          {session?.mustChangePassword && <p className="admin-initial-password-note">Replace the initial password with a unique password before using this account in production.</p>}
          <div className="admin-profile-security-note"><ShieldCheck size={17} /><span>Signed, HttpOnly session cookie. Sessions expire after 8 hours.</span></div>
        </section>
        <section className="admin-panel-card admin-password-card">
          <div className="admin-panel-heading"><div><p>ACCOUNT SECURITY</p><h2>Change password</h2><span>Keep your admin account protected.</span></div><span className="admin-panel-icon"><KeyRound size={19} /></span></div>
          <form className="admin-password-form" onSubmit={changePassword}>
            <label htmlFor="current-password">Current password</label>
            <div className="admin-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" maxLength={256} required disabled={disabled} /></div>
            <label htmlFor="new-password">New password</label>
            <div className="admin-input-wrap"><KeyRound size={17} aria-hidden="true" /><input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={256} required disabled={disabled} /></div>
            <span className="admin-input-hint">At least 12 characters. Use a unique passphrase.</span>
            <label htmlFor="confirm-password">Confirm new password</label>
            <div className="admin-input-wrap"><KeyRound size={17} aria-hidden="true" /><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={256} required disabled={disabled} /></div>
            {message && <p className="admin-form-success" role="status"><CheckCircle2 size={16} />{message}</p>}
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <button className="admin-login-submit admin-password-submit" type="submit" disabled={disabled}>{submitting ? "Updating…" : "Update password"}<KeyRound size={16} /></button>
          </form>
          <div className="admin-password-note"><ShieldCheck size={15} /><span>Changing your password signs out other devices.</span></div>
        </section>
      </div>
    </AdminShell>
  );
}
