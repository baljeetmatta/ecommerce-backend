import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api.js";
import ForgotPasswordForm from "./ForgotPasswordForm.jsx";
import BrandLogo from "./BrandLogo.jsx";

export default function LoginScreen({ form, error, loading, onChange, onSubmit, onBack, settings = {} }) {
  const [forgot, setForgot] = useState(false);
  const resetParams = window.location.hash.startsWith("#/admin/reset-password") ? new URLSearchParams(window.location.hash.split("?")[1] || "") : null;
  const resetToken = resetParams?.get("token") || ""; const resetEmail = resetParams?.get("email") || "";
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" }); const [resetMessage, setResetMessage] = useState(""); const [resetBusy, setResetBusy] = useState(false);
  const submitReset = async (event) => { event.preventDefault(); if (resetForm.password !== resetForm.confirmPassword) return setResetMessage("Passwords do not match."); setResetBusy(true); setResetMessage(""); try { const result = await api.resetPassword({ email: resetEmail, token: resetToken, password: resetForm.password }); setResetMessage(result.message); } catch (resetError) { setResetMessage(resetError.message); } finally { setResetBusy(false); } };
  return (
    <main className="authPage berryAuthPage">
      <section className="authPanel" aria-label="Admin sign in">
        {onBack && <button className="linkButton authBackToStore" type="button" onClick={onBack}>← Back to store</button>}
        <BrandLogo settings={settings} className="authBrand" subtitle="ADMIN CONSOLE" />

        <div className="authHeading">
          <ShieldCheck size={28} />
          <h1>Hi, Welcome Back</h1>
          <p>Enter your credentials to continue</p>
        </div>

        {resetToken && resetEmail ? <form className="authForm" onSubmit={submitReset}><h2>Reset staff password</h2><p className="mutedText">Choose a new password for {resetEmail}.</p><label><span>New password</span><input type="password" minLength="8" required value={resetForm.password} onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })} /></label><label><span>Confirm password</span><input type="password" minLength="8" required value={resetForm.confirmPassword} onChange={(event) => setResetForm({ ...resetForm, confirmPassword: event.target.value })} /></label>{resetMessage && <div className="notice">{resetMessage}</div>}<button className="primaryButton authButton" disabled={resetBusy}>{resetBusy ? "Resetting…" : "Reset password"}</button><button className="linkButton" type="button" onClick={() => { window.location.hash = "#/admin/login"; window.location.reload(); }}>Back to sign in</button></form> : forgot ? <ForgotPasswordForm identifierLabel="Staff email address" identifierType="email" initialIdentifier={form.email} requestOnly requestSuccessText="Check your email for a secure password reset link." onRequest={(email) => api.forgotPassword({ email })} onBack={() => setForgot(false)} /> : <>
          <div className="authDivider" aria-hidden="true"><span /> <strong>Sign in with Email address</strong> <span /></div>
          <form className="authForm" onSubmit={onSubmit}>
          <label>
            <span>Email Address / Username</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              required
            />
          </label>
          <div className="authOptions">
            <label className="rememberMe"><input type="checkbox" /> <span>Remember me?</span></label>
            <button className="linkButton" type="button" onClick={() => setForgot(true)}>Staff forgot password?</button>
          </div>
          {error && <div className="authError">{error}</div>}
          <button className="primaryButton authButton" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Signing in" : "Sign In"}
          </button>
          </form>
        </>}
      </section>
    </main>
  );
}
