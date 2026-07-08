import { BarChart3, BookOpenText, Boxes, Megaphone, PackageCheck, PlusSquare, Settings, ShieldCheck, UsersRound } from "lucide-react";

const items = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "catalog", label: "Catalog", icon: Boxes },
  { id: "add-product", label: "Add Product", icon: PlusSquare },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "customers", label: "Customers", icon: UsersRound },
  { id: "blog", label: "Blog", icon: BookOpenText },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "team", label: "Access", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">E</div>
        <div>
          <strong>CommerceOps</strong>
          <span>Admin</span>
        </div>
      </div>
      <nav>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? "navItem active" : "navItem"}
              onClick={() => onChange(item.id)}
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
