import { Home, PackageCheck, ShoppingBag, WalletCards, Menu, Grid2X2, ShoppingCart, UserRound, UsersRound, BarChart3 } from "lucide-react";
import "../styles/mobile-bottom-nav.css";

const icons = { home: Home, orders: PackageCheck, products: ShoppingBag, payouts: WalletCards, more: Menu, categories: Grid2X2, cart: ShoppingCart, account: UserRound, referrals: UsersRound, analytics: BarChart3 };

export default function MobileBottomNav({ label, items, active, onSelect }) {
  return <nav className="mobileBottomNav" aria-label={`${label} mobile navigation`}>
    {items.map(({ id, label: itemLabel, icon, badge, current }) => {
      const Icon = icons[icon] || Home;
      const selected = current ?? active === id;
      return <button key={id} type="button" className={selected ? "mobileBottomNavItem active" : "mobileBottomNavItem"} aria-current={selected ? "page" : undefined} onClick={() => onSelect(id)}>
        <span className="mobileBottomNavIcon"><Icon size={22} strokeWidth={1.8} aria-hidden="true" />{badge > 0 && <span className="mobileBottomNavBadge" aria-label={`${badge} items`}>{badge > 99 ? "99+" : badge}</span>}</span>
        <span>{itemLabel}</span>
      </button>;
    })}
  </nav>;
}
