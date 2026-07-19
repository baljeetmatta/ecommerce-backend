import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api.js";
import ForgotPasswordForm from "./ForgotPasswordForm.jsx";

export default function LoginScreen({ form, error, loading, onChange, onSubmit }) {
  const [forgot, setForgot] = useState(false);
  return (
    <main className="authPage">
      <section className="authPanel">
        <div className="authBrand">
          <div className="brandMark">E</div>
          <div>
            <strong>CommerceOps</strong>
            <span>Secure admin access</span>
          </div>
        </div>

        <div className="authHeading">
          <ShieldCheck size={28} />
          <h1>Sign in to admin</h1>
          <p>Use an authorized staff account to manage catalog, orders, customers, promotions, and reports.</p>
        </div>

        {forgot ? <ForgotPasswordForm identifierLabel="Email address" identifierType="email" initialIdentifier={form.email} onRequest={(email) => api.forgotPassword({ email })} onReset={({ identifier, ...payload }) => api.resetPassword({ email: identifier, ...payload })} onBack={() => setForgot(false)} /> : <form className="authForm" onSubmit={onSubmit}>
          <label>
            <span>Email address</span>
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
          {error && <div className="authError">{error}</div>}
          <button className="primaryButton authButton" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Signing in" : "Sign In"}
          </button>
          <button className="linkButton" type="button" onClick={() => setForgot(true)}>Forgot password?</button>
        </form>}
      </section>
    </main>
  );
}
