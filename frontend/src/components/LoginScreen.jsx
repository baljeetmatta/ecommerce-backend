import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api.js";
import ForgotPasswordForm from "./ForgotPasswordForm.jsx";

export default function LoginScreen({ form, error, loading, onChange, onSubmit, onBack }) {
  const [forgot, setForgot] = useState(false);
  return (
    <main className="authPage berryAuthPage">
      <section className="authPanel" aria-label="Admin sign in">
        {onBack && <button className="linkButton authBackToStore" type="button" onClick={onBack}>← Back to store</button>}
        <div className="authBrand">
          <div className="brandMark">C</div>
          <div>
            <strong>HRSBasket</strong>
            <span>ADMIN CONSOLE</span>
          </div>
        </div>

        <div className="authHeading">
          <ShieldCheck size={28} />
          <h1>Hi, Welcome Back</h1>
          <p>Enter your credentials to continue</p>
        </div>

        {forgot ? <ForgotPasswordForm identifierLabel="Email address" identifierType="email" initialIdentifier={form.email} onRequest={(email) => api.forgotPassword({ email })} onReset={({ identifier, ...payload }) => api.resetPassword({ email: identifier, ...payload })} onBack={() => setForgot(false)} /> : <>
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
            <button className="linkButton" type="button" onClick={() => setForgot(true)}>Forgot password?</button>
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
