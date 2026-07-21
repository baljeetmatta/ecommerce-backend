import { BarChart3, BookOpenText, Boxes, FileText, Handshake, Image, Megaphone, PackageCheck, PanelBottom, PlusSquare, Settings, ShieldCheck, Store, UsersRound, X } from "lucide-react";

const items = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "catalog", label: "Catalog", icon: Boxes },
  { id: "add-product", label: "Add Product", icon: PlusSquare },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "customers", label: "Customers", icon: UsersRound },
  { id: "partners", label: "Partners", icon: Handshake },
  { id: "sellers", label: "Sellers", icon: Store },
  { id: "seller-products", label: "Seller Products", icon: Boxes },
  { id: "banners", label: "Banners", icon: Image },
  { id: "blog", label: "Blog", icon: BookOpenText },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "footer", label: "Footer", icon: PanelBottom },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "team", label: "Access", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ active, onChange, open = false, onClose }) {
  return (
    <aside className={`sidebar ${open ? "mobileOpen" : ""}`}>
      <button className="sidebarClose" type="button" onClick={onClose} aria-label="Close admin menu"><X size={22} /></button>
      <div className="brand">
        <div className="brandMark">C</div>
        <div>
          <strong>HRSBasket</strong>
          <span>ADMIN CONSOLE</span>
        </div>
      </div>
      <p className="navCaption">MANAGEMENT</p>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? "navItem active" : "navItem"}
              onClick={() => { onChange(item.id); onClose?.(); }}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
