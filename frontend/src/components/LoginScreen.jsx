import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginScreen({ form, error, loading, onChange, onSubmit }) {
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

        <form className="authForm" onSubmit={onSubmit}>
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
        </form>
      </section>
    </main>
  );
}
