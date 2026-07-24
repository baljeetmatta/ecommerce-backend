import { ShieldCheck } from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";

export default function PortalAuthCard({ portal, subtitle, heading = "Hi, Welcome Back", dividerText = "Sign in with Email address", pageClassName = "", panelClassName = "", onBack, settings = {}, children }) {
  const partnerRegistration = pageClassName.split(/\s+/).includes("partnerRegistrationPage");
  return (
    <main className={`authPage berryAuthPage portalAuthPage ${pageClassName}`.trim()}>
      {partnerRegistration && <aside className="partnerRegistrationAside">
        <BrandLogo settings={settings} className="partnerRegistrationBrand" />
        <div><span>Welcome to</span><h2>HRS <em>Partner</em><small>Membership Program</small></h2><p>Grow Together, Earn Together</p></div>
        <div className="partnerRegistrationArt"><ShieldCheck /><strong>+</strong></div>
        <section><h3>Start your partner journey</h3><p>✓ Secure partner account</p><p>✓ Referral and performance rewards</p><p>✓ Special member benefits</p><p>✓ Premium dashboard access</p></section>
      </aside>}
      <section className={`authPanel portalAuthPanel ${panelClassName}`.trim()} aria-label={`${portal} sign in`}>
        {onBack && <button className="linkButton authBackToStore" type="button" onClick={onBack}>← Back to store</button>}
        <BrandLogo settings={settings} className="authBrand" subtitle={`${portal.toUpperCase()} PORTAL`} />
        <div className="authHeading">
          <ShieldCheck size={28} />
          <h1>{heading}</h1>
          <p>{subtitle}</p>
        </div>
        {dividerText && <div className="authDivider" aria-hidden="true"><span /> <strong>{dividerText}</strong> <span /></div>}
        {children}
      </section>
      {partnerRegistration && <footer className="partnerRegistrationFooter"><span><ShieldCheck size={18} /> © {new Date().getFullYear()} HRS Basket. All rights reserved.</span><strong>Together We Grow More 🚀</strong></footer>}
    </main>
  );
}
