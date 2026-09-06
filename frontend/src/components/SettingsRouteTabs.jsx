const tabs = [
  ["account", "Admin Account"],
  ["payments", "Payment Methods"],
  ["shipping", "Shipping Rules"],
  ["shiprocket", "ShipRocket Setting"],
  ["email", "Email / SMTP"],
  ["storefront", "Custom Storefront"],
  ["home", "Home Content"],
  ["home-sections", "Home Sections"],
  ["hero", "Hero Settings"],
  ["sections", "Banner Sections"]
];

export default function SettingsRouteTabs({ activeTab, onChange }) {
  return (
    <nav className="settingsTabs" aria-label="Store settings">
      {tabs.map(([id, label]) => (
        <button className={activeTab === id ? "active" : ""} key={id} type="button" onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </nav>
  );
}
