import { Mail, Phone, MapPin, CalendarDays, BadgeCheck, CreditCard } from "lucide-react";
import "../styles/profile-summary.css";

export default function ProfileSummary({ account = {}, role, note }) {
  const name = account.fullName || account.name || account.companyName || role;
  const identifier = account.resellerId || account.sellerNumber || account.registrationNumber || account.employeeCode;
  const address = typeof account.address === "object" && account.address !== null
    ? [account.address.line, account.address.city, account.address.state, account.address.postalCode].filter(Boolean).join(", ")
    : [account.address, account.city, account.state, account.pinCode].filter(Boolean).join(", ");
  const date = account.registeredAt || account.createdAt;
  const joined = date ? new Date(date) : null;
  const verified = account.approvalStatus === "approved";
  const details = [
    [Mail, "Email address", account.email, account.email ? `mailto:${account.email}` : null],
    [Phone, "Phone number", account.mobile || account.phone, account.mobile || account.phone ? `tel:${account.mobile || account.phone}` : null],
    ...(role === "Seller" && account.gstNumber ? [[BadgeCheck, "GSTIN", account.gstNumber]] : []),
    [MapPin, "Address", address],
    ...(joined && !Number.isNaN(joined.getTime()) ? [[CalendarDays, "Member since", joined.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })]] : [])
  ];
  return <section className="accountProfileSummary" aria-label={`${role} profile summary`}>
    <div className="accountProfileIdentity">
      <div className="accountProfileAvatar">{account.profileImage ? <img src={account.profileImage} alt="" /> : <span>{String(name).trim().slice(0, 1).toUpperCase()}</span>}</div>
      <div className="accountProfileName"><span className="accountProfileEyebrow">{role} account</span><h3>{name}</h3>{identifier && <p>Account ID <strong>{identifier}</strong></p>}</div>
      {verified && <span className="accountProfileBadge"><BadgeCheck size={16} /> Verified</span>}
    </div>
    <dl className="accountProfileDetails">{details.map(([Icon, label, value, href]) => <div key={label} className={label === "Address" ? "accountProfileAddress" : ""}><Icon size={18} aria-hidden="true" /><div><dt>{label}</dt><dd>{value ? href ? <a href={href}>{value}</a> : value : "Not provided"}</dd></div></div>)}</dl>
    {note && <div className="accountProfileNote"><CreditCard size={18} aria-hidden="true" /><p>{note}</p></div>}
  </section>;
}
