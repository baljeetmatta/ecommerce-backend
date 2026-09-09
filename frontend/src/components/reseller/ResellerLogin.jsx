import { ArrowLeft, ShoppingBag, IndianRupee, Share2, ShieldCheck, UserPlus, User, Mail, LockKeyhole, EyeOff, Eye, ChevronRight } from "lucide-react";
export default function ResellerLogin({ onBack, accessMode, status, submitAccess, accessForm, setAccessForm, showAccessPassword, setShowAccessPassword, accessBusy, setPortalRoute, setStatus }) {
  return (<main className="resellerAccessPage">
    <section className="resellerAccessBrand">
      <button type="button" onClick={onBack}><ArrowLeft /> Back to store</button>
      <strong className="resellerBrandText resellerAccessBrandText"><ShoppingBag /><span>HRS<em>Basket</em><small>Resell More, Earn More</small></span></strong>
      <div><span><IndianRupee /></span><i><Share2 /></i><b><ShoppingBag /></b></div>
      <h1>Start earning with<br />HRSBasket</h1>
      <p>Share products you love, set your margin and grow your reseller business—all from one place.</p>
    </section>
    <section className="resellerAccessCard resellerLoginCard">
      <span className="resellerAccessIcon">{accessMode === "login" ? <ShieldCheck /> : <UserPlus />}</span>
      <small>HRSBASKET RESELLER</small>
      <h2>{accessMode === "login" ? "Hi, Welcome Back" : "Create Your Account"}</h2>
      <p>{accessMode === "login" ? "Sign in with the account connected to your reseller workspace." : "Start with your secure HRSBasket account, then complete the reseller registration form."}</p>
      {status && <p className="resellerAccessError" role="alert">{status}</p>}
      <form className="resellerAccessForm" onSubmit={submitAccess}>
        {accessMode === "signup" && <label><span>Full name</span><div><User /><input required autoComplete="name" placeholder="Enter your full name" value={accessForm.name} onChange={e => setAccessForm({ ...accessForm, name: e.target.value })} /></div></label>}
        <label><span>{accessMode === "login" ? "Email address or HRRCode" : "Email address"}</span><div><Mail /><input required type={accessMode === "login" ? "text" : "email"} autoComplete="username" placeholder={accessMode === "login" ? "Enter email or HRRCode" : "Enter your email"} value={accessForm.email} onChange={e => setAccessForm({ ...accessForm, email: e.target.value })} /></div></label>
        <label><span>Password</span><div><LockKeyhole /><input required minLength="6" type={showAccessPassword ? "text" : "password"} autoComplete={accessMode === "login" ? "current-password" : "new-password"} placeholder="Enter your password" value={accessForm.password} onChange={e => setAccessForm({ ...accessForm, password: e.target.value })} /><button type="button" onClick={() => setShowAccessPassword(!showAccessPassword)} aria-label="Show or hide password">{showAccessPassword ? <EyeOff /> : <Eye />}</button></div></label>
        {accessMode === "signup" && <label><span>Confirm password</span><div><LockKeyhole /><input required minLength="6" type={showAccessPassword ? "text" : "password"} autoComplete="new-password" placeholder="Confirm your password" value={accessForm.confirmPassword} onChange={e => setAccessForm({ ...accessForm, confirmPassword: e.target.value })} /></div></label>}
        <button className="resellerAccessSubmit" disabled={accessBusy}>{accessBusy ? "Please wait…" : accessMode === "login" ? "Sign In to Reseller" : "Create Account & Continue"}<ChevronRight /></button>
      </form>
      <p className="resellerAccessSwitch">{accessMode === "login" ? "Don’t have a reseller account?" : "Already have an account?"} <button type="button" onClick={() => { const next = accessMode === "login" ? "#/reseller/register" : "#/reseller"; window.location.hash = next; setPortalRoute(next); setStatus("") }}>{accessMode === "login" ? "Join Now" : "Login Here"}</button></p>
      <small className="resellerAccessHint">Secure access powered by your HRSBasket customer account.</small>
    </section>
  </main>);
}
