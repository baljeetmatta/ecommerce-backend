import { useEffect, useState } from "react";
import { BarChart3, BookOpenText, Boxes, ChevronDown, FileText, Handshake, Headphones, Image, LayoutDashboard, Megaphone, PackageCheck, PanelBottom, PlusSquare, RotateCcw, Settings, ShieldCheck, Star, Store, UsersRound, X } from "lucide-react";

const groups = [
  { label: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }
  ]},
  { label: "Master", items: [
    { id: "customers", label: "Customers", icon: UsersRound },
    { id: "partners", label: "Partners", icon: Handshake },
    { id: "sellers", label: "Sellers", icon: Store },
    { id: "staff", label: "Staff", icon: UsersRound }
  ]},
  { label: "Catalog", items: [
    { id: "catalog", label: "Products", icon: Boxes },
    { id: "add-product", label: "Add Product", icon: PlusSquare },
    { id: "seller-products", label: "Seller Products", icon: Boxes },
    { id: "reviews", label: "Reviews & Ratings", icon: Star }
  ]},
  { label: "Operations", items: [
    { id: "orders", label: "Orders", icon: PackageCheck },
    { id: "returns-refunds", label: "Returns & Refunds", icon: RotateCcw },
    { id: "seller-withdrawals", label: "Seller Withdrawals", icon: Store },
    { id: "support-tickets", label: "Support Tickets", icon: Headphones }
  ]},
  { label: "Site", items: [
    { id: "blog", label: "Blog", icon: BookOpenText },
    { id: "banners", label: "Banners", icon: Image },
    { id: "pages", label: "Pages", icon: FileText },
    { id: "footer", label: "Footer", icon: PanelBottom },
    { id: "marketing", label: "Marketing", icon: Megaphone },
    { id: "settings-payments", label: "Settings", icon: Settings },
    { id: "team", label: "Access", icon: ShieldCheck }
  ]},
  { label: "Reporting", items: [{ id: "analytics", label: "Analytics", icon: BarChart3 }]}
];

export default function Sidebar({ active, onChange, open = false, onClose, settings = {} }) {
  const groupForRoute = (route) => groups.find((group) => group.items.some((item) => item.id === route || (item.id === "staff" && route === "create-staff") || (item.id === "settings-payments" && route.startsWith("settings-")) || (item.id === "partners" && route.startsWith("partner-"))))?.label;
  const [expanded, setExpanded] = useState(() => new Set([groupForRoute(active) || "Master"]));
  useEffect(() => {
    const currentGroup = groupForRoute(active);
    if (currentGroup) setExpanded((current) => new Set([...current, currentGroup]));
  }, [active]);
  const toggleGroup = (label) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });
  return (
    <aside className={`sidebar ${open ? "mobileOpen" : ""}`}>
      <button className="sidebarClose" type="button" onClick={onClose} aria-label="Close admin menu"><X size={22} /></button>
      <div className="brand sidebarTextBrand"><strong>{settings.shopName || "HRS Basket"}</strong><span>ADMIN CONSOLE</span></div>
      <nav>
        {groups.map((group) => {
          const isExpanded = expanded.has(group.label);
          return <section className="navGroup" key={group.label}>
            <button className="navGroupToggle" type="button" onClick={() => toggleGroup(group.label)} aria-expanded={isExpanded}>
              <span>{group.label}</span><ChevronDown size={17} className={isExpanded ? "expanded" : ""}/>
            </button>
            {isExpanded && <div className="navGroupItems">{group.items.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} type="button" className={active === item.id || (item.id === "staff" && active === "create-staff") || (item.id === "settings-payments" && active.startsWith("settings-")) || (item.id === "partners" && active.startsWith("partner-")) ? "navItem active" : "navItem"} onClick={() => { onChange(item.id); onClose?.(); }} title={item.label}>
                <Icon size={18}/><span>{item.label}</span>
              </button>;
            })}</div>}
          </section>;
        })}
      </nav>
    </aside>
  );
}
