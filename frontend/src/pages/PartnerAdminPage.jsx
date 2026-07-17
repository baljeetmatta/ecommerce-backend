import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search, X } from "lucide-react";
import { api } from "../services/api.js";
import TablePagination from "../components/TablePagination.jsx";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
const emptyPackage = { title: "", price: "", sharePercentage: "", features: "", benefits: "", isActive: true };

export default function PartnerAdminPage() {
  const [tab, setTab] = useState("partners");
  const [data, setData] = useState({ partners: [], packages: [], withdrawals: [] });
  const [form, setForm] = useState(emptyPackage);
  const [message, setMessage] = useState("");
  const [resetPasswords, setResetPasswords] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerSort, setPartnerSort] = useState("name-asc");
  const [detailsId, setDetailsId] = useState(null);
  const [partnerPage, setPartnerPage] = useState(1);
  const [partnerPageSize, setPartnerPageSize] = useState(10);
  const load = async () => { const [partners, packages, withdrawals] = await Promise.all([api.adminPartners(), api.adminPartnerPackages(), api.adminWithdrawals()]); setData({ partners, packages, withdrawals }); };
  useEffect(() => { load().catch((error) => setMessage(error.message)); }, []);
  const act = async (action) => { try { await action(); await load(); } catch (error) { setMessage(error.message); } };
  const resetPassword = async (partner) => { try { const result = await api.resetPartnerPassword(partner._id); setResetPasswords((current) => ({ ...current, [partner._id]: result.password })); setVisiblePasswords((current) => ({ ...current, [partner._id]: result.password })); setMessage(`Password reset for ${partner.name}. Click the password to show or hide it.`); } catch (error) { setMessage(error.message); } };
  const togglePassword = async (partner) => { if (visiblePasswords[partner._id]) { setVisiblePasswords((current) => ({ ...current, [partner._id]: "" })); return; } try { const result = resetPasswords[partner._id] ? { password: resetPasswords[partner._id] } : await api.revealPartnerPassword(partner._id); setVisiblePasswords((current) => ({ ...current, [partner._id]: result.password })); } catch (error) { setMessage(error.message); } };
  const filteredPartners = useMemo(() => {
    const [field, direction] = partnerSort.split("-");
    const values = { id: (item) => item.registrationNumber, name: (item) => item.name, wallet: (item) => Number(item.walletBalance || 0), status: (item) => item.status };
    return data.partners.filter((partner) => `${partner.registrationNumber} ${partner.name}`.toLowerCase().includes(partnerSearch.trim().toLowerCase())).sort((a, b) => {
      const left = values[field](a); const right = values[field](b);
      const result = typeof left === "number" ? left - right : String(left || "").localeCompare(String(right || ""), undefined, { numeric: true });
      return direction === "asc" ? result : -result;
    });
  }, [data.partners, partnerSearch, partnerSort]);
  const detailsPartner = data.partners.find((partner) => partner._id === detailsId);
  const partnerPageCount = Math.max(1, Math.ceil(filteredPartners.length / partnerPageSize));
  const visiblePartners = filteredPartners.slice((partnerPage - 1) * partnerPageSize, partnerPage * partnerPageSize);
  useEffect(() => { setPartnerPage(1); }, [partnerSearch, partnerSort, partnerPageSize]);
  useEffect(() => { if (partnerPage > partnerPageCount) setPartnerPage(partnerPageCount); }, [partnerPage, partnerPageCount]);

  return <section>
    <div className="sectionTabs">{["partners", "packages", "withdrawals"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {message && <div className="notice">{message}</div>}
    {tab === "packages" && <>
      <form className="panel formGrid twoColumn" onSubmit={(event) => { event.preventDefault(); act(() => api.createPartnerPackage({ ...form, price: Number(form.price), sharePercentage: Number(form.sharePercentage), features: form.features.split("\n").filter(Boolean), benefits: form.benefits.split("\n").filter(Boolean) })); setForm(emptyPackage); }}>
        <label>Title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Registration price<input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        <label>Share percentage<input required type="number" min="0" max="100" step="0.01" value={form.sharePercentage} onChange={(e) => setForm({ ...form, sharePercentage: e.target.value })} /></label>
        <label>Features (one per line)<textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></label>
        <label>Benefits (one per line)<textarea value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></label>
        <button className="primaryButton">Create package</button>
      </form>
      <div className="panel tableWrap"><table><thead><tr><th>Package</th><th>Registration price</th><th>Share</th><th>Features</th><th>Benefits</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.packages.map((item) => <tr key={item._id}><td><strong>{item.title}</strong></td><td>{money(item.price)}</td><td>{item.sharePercentage}%</td><td>{item.features?.join(" · ") || "—"}</td><td>{item.benefits?.join(" · ") || "—"}</td><td>{item.isActive ? "Active" : "Inactive"}</td><td><button className="secondaryButton" onClick={() => act(() => api.updatePartnerPackage(item._id, { isActive: !item.isActive }))}>{item.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
    </>}
    {tab === "partners" && <><div className="partnerTableToolbar"><label className="searchBox"><Search size={16} /><input placeholder="Search partner by ID or name" value={partnerSearch} onChange={(event) => setPartnerSearch(event.target.value)} /></label><label>Sort by <select value={partnerSort} onChange={(event) => setPartnerSort(event.target.value)}><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="id-asc">ID ascending</option><option value="id-desc">ID descending</option><option value="wallet-desc">Wallet highest</option><option value="wallet-asc">Wallet lowest</option><option value="status-asc">Status A–Z</option></select></label><span>{filteredPartners.length} partner{filteredPartners.length === 1 ? "" : "s"}</span></div><div className="panel tableWrap"><table><thead><tr><th>ID</th><th>Partner</th><th>Package</th><th>Referred by</th><th>Wallet</th><th>Password</th><th>Status</th><th>Details</th></tr></thead><tbody>{visiblePartners.map((partner) => <tr key={partner._id}><td>{partner.registrationNumber}</td><td><strong>{partner.name}</strong><br />{partner.email}<br />{partner.mobile}</td><td>{partner.package?.title || "—"}<br />{partner.package?.sharePercentage || 0}% share</td><td>{partner.referredBy ? <>{partner.referredBy.name}<br />ID {partner.referredBy.registrationNumber}</> : "Admin"}</td><td>{money(partner.walletBalance)}</td><td><button className="passwordReveal" type="button" onClick={() => togglePassword(partner)}>{visiblePasswords[partner._id] ? <><strong className="temporaryPassword">{visiblePasswords[partner._id]}</strong><EyeOff size={15} /></> : <><span>Protected</span><Eye size={15} /></>}</button><br /><button type="button" onClick={() => resetPassword(partner)}>Reset password</button></td><td>{partner.status}</td><td><button className="detailsButton" type="button" title="View partner details" onClick={() => setDetailsId(partner._id)}><Eye size={18} /></button></td></tr>)}{!filteredPartners.length && <tr><td colSpan="8">No partners match this search.</td></tr>}</tbody></table><TablePagination total={filteredPartners.length} page={partnerPage} pageSize={partnerPageSize} onPageChange={setPartnerPage} onPageSizeChange={setPartnerPageSize} /></div></>}
    {tab === "withdrawals" && <div className="panel tableWrap"><table><thead><tr><th>Partner</th><th>Bank</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.withdrawals.map((item) => <tr key={item._id}><td>{item.partner?.name}<br />{item.partner?.email}</td><td>{item.bankSnapshot?.bankName}<br />{item.bankSnapshot?.accountNumber} · {item.bankSnapshot?.ifsc}</td><td>{money(item.amount)}</td><td>{item.status}</td><td>{item.status === "pending" && <><button onClick={() => act(() => api.processWithdrawal(item._id, { status: "approved" }))}>Approve</button><button onClick={() => act(() => api.processWithdrawal(item._id, { status: "rejected", adminNote: "Rejected by administrator" }))}>Reject & refund</button></>}{item.status === "approved" && <button onClick={() => act(() => api.processWithdrawal(item._id, { status: "paid" }))}>Mark paid</button>}</td></tr>)}</tbody></table></div>}
    {detailsPartner && <PartnerDetails partner={detailsPartner} onClose={() => setDetailsId(null)} review={(type, payload) => act(() => api.reviewPartnerKyc(detailsPartner._id, type, payload))} />}
  </section>;
}

function PartnerDetails({ partner, onClose, review }) { const documents = [["aadhar", "Aadhar Card"], ["pan", "PAN Card"], ["cancelledCheque", "Cancelled Cheque"]]; const reject = (type) => { const reason = window.prompt("Enter the rejection reason. The partner will see this reason before re-uploading:"); if (reason?.trim()) review(type, { status: "rejected", rejectionReason: reason.trim() }); }; return <div className="partnerDetailsOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="partnerDetailsDialog" role="dialog" aria-modal="true" aria-label={`Details for ${partner.name}`}><header><div><h2>{partner.name}</h2><p>Partner ID {partner.registrationNumber}</p></div><button className="detailsButton" type="button" title="Close" onClick={onClose}><X size={20} /></button></header><dl className="partnerDetailsGrid"><dt>Father name</dt><dd>{partner.fatherName}</dd><dt>Gender</dt><dd>{partner.gender}</dd><dt>Email</dt><dd>{partner.email}</dd><dt>Mobile</dt><dd>{partner.mobile}</dd><dt>Address</dt><dd>{[partner.address?.line, partner.address?.city, partner.address?.state, partner.address?.postalCode].filter(Boolean).join(", ") || "—"}</dd><dt>Package</dt><dd>{partner.package?.title || "—"}</dd><dt>Referred by</dt><dd>{partner.referredBy ? `${partner.referredBy.name} · ${partner.referredBy.registrationNumber}` : "Admin"}</dd><dt>Wallet</dt><dd>{money(partner.walletBalance)}</dd><dt>Bank</dt><dd>{partner.bankDetails?.bankName ? `${partner.bankDetails.bankName} · ${partner.bankDetails.accountNumber} · ${partner.bankDetails.ifsc}` : "Not submitted"}</dd></dl><h3>KYC documents</h3><div className="kycDetailsList">{documents.map(([type, label]) => { const doc = partner.kyc?.[type] || {}; const files = Object.entries(doc).filter(([key, value]) => ["front", "back", "file"].includes(key) && value); return <article key={type}><div><strong>{label}</strong><span className={`status ${doc.status || "not_submitted"}`}>{(doc.status || "not submitted").replace("_", " ")}</span></div>{files.length ? <div className="documentLinks">{files.map(([key, value]) => <a key={key} href={value} target="_blank" rel="noreferrer">View {key === "file" ? "document" : key}</a>)}</div> : <p>No document submitted.</p>}{doc.rejectionReason && <p className="errorText">Rejection reason: {doc.rejectionReason}</p>}{doc.status === "pending" && <div className="kycActions"><button className="primaryButton" type="button" onClick={() => review(type, { status: "approved" })}>Approve</button><button className="secondaryButton" type="button" onClick={() => reject(type)}>Reject with reason</button></div>}{doc.status === "rejected" && <p>The partner can now re-upload this document from their KYC page.</p>}</article>; })}</div></section></div>; }
