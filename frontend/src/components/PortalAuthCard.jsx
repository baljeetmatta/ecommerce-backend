import { ShieldCheck } from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";

export default function PortalAuthCard({ portal, subtitle, heading = "Hi, Welcome Back", dividerText = "Sign in with Email address", pageClassName = "", panelClassName = "", onBack, settings = {}, children }) {
  return (
    <main className={`authPage berryAuthPage portalAuthPage ${pageClassName}`.trim()}>
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
    </main>
  );
}
