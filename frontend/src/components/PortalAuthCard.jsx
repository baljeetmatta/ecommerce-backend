import { Award, Check, Headphones, ShieldCheck, TrendingUp, UserRound, Users, WalletCards } from "lucide-react";
import BrandLogo from "./BrandLogo.jsx";

export default function PortalAuthCard({ portal, subtitle, heading = "Hi, Welcome Back", dividerText = "Sign in with Email address", pageClassName = "", panelClassName = "", onBack, settings = {}, children }) {
  const partnerRegistration = pageClassName.split(/\s+/).includes("partnerRegistrationPage");
  const assurances = [
    [ShieldCheck, "100% Secure", "Your data is safe with us"],
    [Headphones, "24/7 Support", "We are here to help you"],
    [Award, "Trusted Platform", "Thousands of partners trust us"],
    [TrendingUp, "Grow & Earn", "Refer, earn and grow your business"]
  ];
  return (
    <main className={`authPage berryAuthPage portalAuthPage ${pageClassName}`.trim()}>
      {partnerRegistration && <aside className="hrsPartnerHero partnerRegistrationAside">
        <BrandLogo settings={settings} className="hrsPartnerBrand" showText />
        <div className="hrsPartnerWelcome"><span>Welcome to</span><h1>HRS <em>{portal}</em><small>{portal === "Seller" ? "Marketplace Program" : "Membership Program"}</small></h1><p>{portal === "Seller" ? "Sell More, Grow Together" : "Grow Together, Earn Together"}</p></div>
        <div className="hrsPartnerIllustration"><span className="hrsOrbitIcon growth"><TrendingUp /></span><span className="hrsOrbitIcon users"><Users /></span><span className="hrsOrbitIcon wallet"><WalletCards /></span><div><ShieldCheck /><UserRound /></div></div>
        <div className="hrsPartnerBenefits"><h2>👑 <span>{portal === "Seller" ? "Seller Benefits" : "Gold Partner Benefits"}</span></h2>{(portal === "Seller" ? ["All India Marketplace Reach", "Seller Product Dashboard", "GST Compliance Support", "ShipRocket Integration", "Sales & Profit Tracking", "Marketing Opportunities", "Priority Seller Support", "Secure Payout Management"] : ["Exclusive Partner Offers", "Special Member Discounts", "Referral Rewards", "Performance Bonus", "Loyalty Rewards", "Business Growth Rewards", "Priority Customer Support", "Premium Dashboard Access"]).map((benefit) => <p key={benefit}><Check size={16} />{benefit}</p>)}</div>
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
      {partnerRegistration && <section className="hrsPartnerAssurances partnerRegistrationAssurances">{assurances.map(([Icon, title, text]) => <article key={title}><Icon /><div><h3>{title}</h3><p>{text}</p></div></article>)}</section>}
      {partnerRegistration && <footer className="partnerRegistrationFooter"><span><ShieldCheck size={18} /> © {new Date().getFullYear()} HRS Basket. All rights reserved.</span><strong>Together We Grow More 🚀</strong></footer>}
    </main>
  );
}
