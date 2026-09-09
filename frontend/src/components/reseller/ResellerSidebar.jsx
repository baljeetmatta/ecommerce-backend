import { X, ShoppingBag, Gift, LogOut } from "lucide-react";
export default function ResellerSidebar({ menuOpen, setMenuOpen, branding, navItems, view, openAddFlow, setView, orders, onBack, logout }) {
  return (<aside id="reseller-navigation" className={`resellerSidebar ${menuOpen ? "isOpen" : ""}`}><button className="resellerDrawerClose" aria-label="Close navigation" onClick={() => { setMenuOpen(false); document.querySelector(".resellerMenuButton")?.focus() }}><X /></button>
      <strong className="resellerSidebarBrand">{branding.logoUrl ? <img src={branding.logoUrl} alt="HRSBasket" className="resellerBrandLogo" /> : <ShoppingBag />}</strong>
      <nav aria-label="Reseller menu">{navItems.map(([key, label, Icon]) => <button key={key} aria-current={view === key ? "page" : undefined} className={view === key ? "active" : ""} onClick={() => key === "add" ? openAddFlow() : setView(key)}><Icon /><span>{label}</span>{key === "orders" && orders.length > 0 && <b>{orders.length}</b>}</button>)}</nav>
      <div className="resellerUpgrade"><Gift /><strong>Refer &amp; Earn</strong><p>Invite your friends. Grow together.</p><button onClick={() => setView("referrals")}>Invite Now</button></div>
      <button className="resellerStorefrontLink" onClick={onBack}><LogOut /> Storefront</button>
      <button className="resellerStorefrontLink resellerLogoutLink" onClick={logout}><LogOut /> Logout</button>
    </aside>);
}
