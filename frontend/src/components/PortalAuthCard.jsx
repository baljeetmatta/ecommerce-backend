import { ShieldCheck } from "lucide-react";

export default function PortalAuthCard({ portal, subtitle, heading = "Hi, Welcome Back", dividerText = "Sign in with Email address", pageClassName = "", panelClassName = "", onBack, children }) {
  return (
    <main className={`authPage berryAuthPage portalAuthPage ${pageClassName}`.trim()}>
      <section className={`authPanel portalAuthPanel ${panelClassName}`.trim()} aria-label={`${portal} sign in`}>
        <div className="authBrand">
          <div className="brandMark">C</div>
          <div>
            <strong>HRSBasket</strong>
            <span>{portal.toUpperCase()} PORTAL</span>
          </div>
        </div>
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
