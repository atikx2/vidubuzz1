"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { adminPost, adminRequest } from "@/lib/admin-api";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("atikhasan315377@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void adminRequest<{ authenticated: boolean }>("/api/admin/session", { signal: controller.signal })
      .then((result) => { if (result.authenticated && !controller.signal.aborted) router.replace("/admin/"); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminPost<{ authenticated: true }>("/api/admin/login", { email, password });
      setPassword("");
      router.replace("/admin/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Check the email and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">
        <Link className="admin-brand admin-login-brand" href="/admin/login/">
          <span className="admin-brand-mark"><ShieldCheck size={23} aria-hidden="true" /></span>
          <span><strong>VIDUBUZZ</strong><small>ADMIN CONSOLE</small></span>
        </Link>
        <div className="admin-login-heading"><span className="admin-login-icon"><LockKeyhole size={22} aria-hidden="true" /></span><span className="admin-login-eyebrow">PRIVATE WORKSPACE</span><h1>Welcome back.</h1></div>
        <p className="admin-login-description">Sign in to your admin console.</p>
        <form className="admin-login-form" onSubmit={submit}>
          <label htmlFor="admin-email">Admin email</label>
          <div className="admin-input-wrap"><Mail size={17} aria-hidden="true" /><input id="admin-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={submitting} /></div>
          <label htmlFor="admin-password">Password</label>
          <div className="admin-input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="admin-password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} maxLength={256} autoComplete="current-password" placeholder="Enter your password" required disabled={submitting} /><button className="admin-password-visibility" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {error && <p className="admin-form-error" role="alert">{error}</p>}
          <button className="admin-login-submit" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}<ArrowRight size={17} aria-hidden="true" /></button>
        </form>
        <div className="admin-login-footnote"><ShieldCheck size={14} aria-hidden="true" />Secure session · Private admin access</div>
      </div>
      <Link className="admin-login-back" href="/">Back to Vidubuzz<ArrowUpRight size={14} aria-hidden="true" /></Link>
      <p className="admin-login-copyright">VIDUBUZZ · ADMIN CONSOLE</p>
    </main>
  );
}
